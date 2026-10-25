import { useEffect, useRef, useState } from 'react';

const QUESTIONS = [
  {
    topic: 'Searching',
    prompt:
      'What is the worst-case time complexity of binary search on a sorted array?',
    options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'],
    correctIndex: 1,
    explanation:
      'Binary search halves the remaining search interval after each comparison.'
  },
  {
    topic: 'Data Structures',
    prompt: 'Which data structure follows the LIFO principle?',
    options: ['Queue', 'Stack', 'Heap', 'Graph'],
    correctIndex: 1,
    explanation:
      'LIFO means Last In, First Out, which is the defining behaviour of a stack.'
  },
  {
    topic: 'Linked Lists',
    prompt:
      'Which technique is commonly used to detect a cycle in a linked list?',
    options: [
      'Binary search',
      'Merge sort',
      "Floyd's slow and fast pointers",
      'Breadth-first search'
    ],
    correctIndex: 2,
    explanation:
      'Floyd’s cycle-finding algorithm advances two pointers at different speeds.'
  },
  {
    topic: 'Binary Search Trees',
    prompt:
      'What does an inorder traversal of a binary search tree produce when its keys are distinct?',
    options: [
      'Keys in random order',
      'Keys in ascending order',
      'Only leaf nodes',
      'Keys in insertion order'
    ],
    correctIndex: 1,
    explanation:
      'Inorder traversal visits the left subtree, node, then right subtree.'
  },
  {
    topic: 'Graph Algorithms',
    prompt:
      'Which data structure is typically used to implement breadth-first search?',
    options: ['Stack', 'Priority queue', 'Queue', 'Linked list only'],
    correctIndex: 2,
    explanation:
      'A queue processes vertices in the order they are discovered.'
  }
];

const EXAM_DURATION_SECONDS = 10 * 60;

function describeMediaError(error, feature) {
  if (error?.name === 'NotAllowedError') {
    return feature === 'camera'
      ? 'Camera permission was denied. Check macOS Privacy & Security settings.'
      : 'Screen sharing was cancelled or blocked. Try selecting a display again.';
  }

  if (error?.name === 'NotFoundError') {
    return feature === 'camera'
      ? 'No camera was found.'
      : 'No shareable screen source was found.';
  }

  if (error?.name === 'NotReadableError') {
    return feature === 'camera'
      ? 'The camera may be in use by another application.'
      : 'The selected screen could not be captured.';
  }

  return error?.message || `Unable to start ${feature}.`;
}

function App() {
  const [cameraStream, setCameraStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [urn, setUrn] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [urnTouched, setUrnTouched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [setupMessage, setSetupMessage] = useState('');
  const [currentView, setCurrentView] = useState('setup');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [examDeadline, setExamDeadline] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(EXAM_DURATION_SECONDS);
  const [submitted, setSubmitted] = useState(false);
  const [submissionReason, setSubmissionReason] = useState('');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const cameraVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const testCameraVideoRef = useRef(null);
  const testScreenVideoRef = useRef(null);

  const isElectron = Boolean(window?.athenaAPI?.isElectron);
  const normalizedName = studentName.trim();
  const normalizedUrn = urn.trim();
  const urnPattern = /^[A-Za-z0-9][A-Za-z0-9/_-]{2,39}$/;

  const nameValid = normalizedName.length >= 2 && normalizedName.length <= 80;
  const urnValid = urnPattern.test(normalizedUrn);

  const cameraReady = Boolean(
    cameraStream?.getVideoTracks().some(
      (track) => track.readyState === 'live' && track.enabled
    )
  );

  const screenReady = Boolean(
    screenStream?.getVideoTracks().some(
      (track) => track.readyState === 'live' && track.enabled
    )
  );

  const canGoToTests =
    isElectron &&
    cameraReady &&
    screenReady &&
    isFullscreen &&
    nameValid &&
    urnValid;

  const formattedTime = [
    String(Math.floor(timeRemaining / 60)).padStart(2, '0'),
    String(timeRemaining % 60).padStart(2, '0')
  ].join(':');

  const answeredCount = Object.keys(answers).length;
  const currentQuestionData = QUESTIONS[currentQuestion];

  useEffect(() => {
    if (!window.athenaAPI?.isFullscreen) {
      return;
    }

    let isMounted = true;

    window.athenaAPI
      .isFullscreen()
      .then((value) => {
        if (isMounted) {
          setIsFullscreen(Boolean(value));
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsFullscreen(false);
        }
      });

    const unsubscribe = window.athenaAPI.onFullscreenChanged((value) => {
      setIsFullscreen(value);
    });

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (currentView !== 'test' || examDeadline === null || submitted) {
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil((examDeadline - Date.now()) / 1000)
      );

      setTimeRemaining(remaining);

      if (remaining === 0) {
        submitTest('timeout');
      }
    };

    updateTimer();
    const intervalId = window.setInterval(updateTimer, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentView, examDeadline, submitted]);

  useEffect(() => {
    const video =
      currentView === 'setup'
        ? cameraVideoRef.current
        : testCameraVideoRef.current;

    if (video) {
      video.srcObject = cameraStream;
    }
  }, [cameraStream, currentView]);

  useEffect(() => {
    const video =
      currentView === 'setup'
        ? screenVideoRef.current
        : testScreenVideoRef.current;

    if (video) {
      video.srcObject = screenStream;
    }
  }, [screenStream, currentView]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      screenStream?.getTracks().forEach((track) => track.stop());
    };
  }, [screenStream]);

  async function startCamera() {
    setErrorMessage('');
    setSetupMessage('');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is unavailable.');
      }

      if (window.athenaAPI?.requestCameraAccess) {
        const permitted = await window.athenaAPI.requestCameraAccess();

        if (!permitted) {
          throw new Error(
            'Camera permission was not granted. Check macOS Privacy & Security settings.'
          );
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      stream.getVideoTracks()[0]?.addEventListener(
        'ended',
        () => setCameraStream(null),
        { once: true }
      );

      setCameraStream(stream);
      setSetupMessage('Camera is ready.');
    } catch (error) {
      setErrorMessage(describeMediaError(error, 'camera'));
    }
  }

  async function startScreenShare() {
    setErrorMessage('');
    setSetupMessage('');

    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Screen capture is unavailable.');
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 15, max: 30 }
        },
        audio: false
      });

      stream.getVideoTracks()[0]?.addEventListener(
        'ended',
        () => setScreenStream(null),
        { once: true }
      );

      setScreenStream(stream);
      setSetupMessage('Screen share is live.');
    } catch (error) {
      setErrorMessage(describeMediaError(error, 'screen sharing'));
    }
  }

  function stopCamera() {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
  }

  function stopScreenShare() {
    screenStream?.getTracks().forEach((track) => track.stop());
    setScreenStream(null);
  }

  async function toggleFullscreen() {
    setErrorMessage('');
    setSetupMessage('');

    if (!window.athenaAPI?.enterFullscreen) {
      setErrorMessage(
        'Fullscreen controls require the Electron desktop application.'
      );
      return;
    }

    try {
      const accepted = isFullscreen
        ? await window.athenaAPI.exitFullscreen()
        : await window.athenaAPI.enterFullscreen();

      if (!accepted) {
        setErrorMessage('Electron could not change fullscreen state.');
      }
    } catch {
      setErrorMessage('The fullscreen request failed.');
    }
  }

  function handleStartExam() {
    if (!nameValid || !urnValid) {
      setNameTouched(true);
      setUrnTouched(true);
      setErrorMessage('Please enter a valid name and URN to continue.');
      return;
    }

    if (!cameraReady || !screenReady || !isFullscreen) {
      setErrorMessage(
        'Connect the camera, share the screen, and enter fullscreen first.'
      );
      return;
    }

    setErrorMessage('');
    setSetupMessage('');
    setCurrentQuestion(0);
    setAnswers({});
    setSubmitted(false);
    setSubmissionReason('');
    setShowSubmitConfirm(false);
    setTimeRemaining(EXAM_DURATION_SECONDS);
    setExamDeadline(Date.now() + EXAM_DURATION_SECONDS * 1000);
    setCurrentView('test');
  }

  function submitTest(reason = 'manual') {
    setSubmitted(true);
    setSubmissionReason(reason);
    setTimeRemaining(0);
    setShowSubmitConfirm(false);
    setCurrentView('results');
  }

  function resetExam() {
    setCurrentView('setup');
    setCurrentQuestion(0);
    setAnswers({});
    setSubmitted(false);
    setSubmissionReason('');
    setShowSubmitConfirm(false);
    setTimeRemaining(EXAM_DURATION_SECONDS);
    setExamDeadline(null);
    setErrorMessage('');
    setSetupMessage('');
  }

  const score = QUESTIONS.reduce(
    (total, question, index) =>
      total + (answers[index] === question.correctIndex ? 1 : 0),
    0
  );
  const scorePercentage = Math.round((score / QUESTIONS.length) * 100);

  return (
    <>
      {currentView === 'setup' && (
        <main className="app-shell">
          <header className="topbar">
            <div className="brand">
              <div className="brand-mark">A</div>
              <span>ATHENA</span>
            </div>

            <div className="system-status">
              <span className="status-dot" />
              READY FOR CHECK-IN
            </div>
          </header>

          <section className="setup-page">
            <p className="eyebrow">PROCTORING CHECK-IN</p>
            <h1>Athena DSA Assessment</h1>
            <p className="subtitle">
              Verify your camera, screen share, and exam environment before the
              timed assessment begins.
            </p>

            <div className="preview-grid">
              <div className="preview-panel">
                <div className="preview-heading">
                  <strong>Camera preview</strong>
                  <span className={`pill ${cameraReady ? 'ready' : ''}`}>
                    {cameraReady ? 'READY' : 'WAITING'}
                  </span>
                </div>

                <div className="preview-area">
                  <video
                    ref={cameraVideoRef}
                    className={`preview-video ${cameraStream ? 'visible' : ''}`}
                    autoPlay
                    playsInline
                    muted
                  />
                  {!cameraStream && (
                    <div className="preview-placeholder">
                      <div className="camera-symbol">CAM</div>
                      <strong>Camera not connected</strong>
                      <span>Grant access to start your validation.</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={cameraStream ? stopCamera : startCamera}
                >
                  {cameraStream ? 'Stop camera' : 'Start camera'}
                </button>
              </div>

              <div className="preview-panel">
                <div className="preview-heading">
                  <strong>Screen share</strong>
                  <span className={`pill ${screenReady ? 'ready' : ''}`}>
                    {screenReady ? 'READY' : 'WAITING'}
                  </span>
                </div>

                <div className="preview-area">
                  <video
                    ref={screenVideoRef}
                    className={`preview-video ${screenStream ? 'visible' : ''}`}
                    autoPlay
                    playsInline
                    muted
                  />
                  {!screenStream && (
                    <div className="preview-placeholder">
                      <div className="camera-symbol">SCR</div>
                      <strong>Screen not shared</strong>
                      <span>Select a display to begin the exam review.</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={screenStream ? stopScreenShare : startScreenShare}
                >
                  {screenStream ? 'Stop sharing' : 'Share screen'}
                </button>
              </div>
            </div>

            <div className="student-card">
              <div className="student-card-heading">
                <h2>Candidate details</h2>
                <p>
                  Enter the required student information before beginning the
                  timed assessment.
                </p>
              </div>

              <div className="form-grid">
                <div className="field">
                  <label htmlFor="studentName">Student name</label>
                  <input
                    id="studentName"
                    type="text"
                    value={studentName}
                    aria-invalid={nameTouched && !nameValid}
                    onChange={(event) => {
                      setStudentName(event.target.value);
                      if (nameTouched) {
                        setNameTouched(true);
                      }
                    }}
                    onBlur={() => setNameTouched(true)}
                    placeholder="Enter your full name"
                  />
                  {nameTouched && !nameValid && (
                    <span className="field-error">
                      Use between 2 and 80 characters.
                    </span>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="urn">URN</label>
                  <input
                    id="urn"
                    type="text"
                    value={urn}
                    aria-invalid={urnTouched && !urnValid}
                    onChange={(event) => {
                      setUrn(event.target.value);
                    }}
                    onBlur={() => setUrnTouched(true)}
                    placeholder="Example: BCA2024/01"
                  />
                  {urnTouched && !urnValid && (
                    <span className="field-error">
                      URN must be 3 to 40 characters and use letters, numbers,
                      /, _, or -.
                    </span>
                  )}
                </div>
              </div>

              <div className="fullscreen-row">
                <div className="fullscreen-copy">
                  <strong>Desktop fullscreen</strong>
                  <span>
                    Complete the exam in fullscreen mode to maintain the required
                    assessment conditions.
                  </span>
                </div>

                <button
                  type="button"
                  className="secondary-button fullscreen-button"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                </button>
              </div>

              <div className="requirements">
                <span className={`requirement ${cameraReady ? 'met' : ''}`}>
                  Camera ready
                </span>
                <span className={`requirement ${screenReady ? 'met' : ''}`}>
                  Screen shared
                </span>
                <span className={`requirement ${isFullscreen ? 'met' : ''}`}>
                  Fullscreen enabled
                </span>
                <span className={`requirement ${nameValid ? 'met' : ''}`}>
                  Name valid
                </span>
                <span className={`requirement ${urnValid ? 'met' : ''}`}>
                  URN valid
                </span>
              </div>

              {errorMessage && (
                <div className="error-message">
                  <strong>Setup issue</strong>
                  <span>{errorMessage}</span>
                </div>
              )}

              {setupMessage && (
                <div className="success-message">{setupMessage}</div>
              )}
            </div>

            <div className="continue-area">
              <button
                type="button"
                className="continue-button"
                disabled={!canGoToTests}
                onClick={handleStartExam}
              >
                BEGIN EXAM
              </button>
              <span className="continue-caption">
                {canGoToTests
                  ? 'All checks passed. You are ready to begin.'
                  : 'Connect your camera, share the screen, and enter fullscreen to continue.'}
              </span>
            </div>

            <p className="note">
              The exam is time-limited and supports five DSA questions with a
              live countdown and per-question navigation.
            </p>
          </section>

          <footer className="footer">
            <span>ATHENA TEST ENVIRONMENT</span>
            <span>DSA ASSESSMENT · v0.4.0</span>
          </footer>
        </main>
      )}

      {currentView === 'test' && currentQuestionData && (
        <main className="app-shell exam-shell">
          <header className="topbar">
            <div className="brand">
              <div className="brand-mark">A</div>
              <span>ATHENA</span>
            </div>

            <div className="system-status">
              <span className="status-dot" />
              TEST IN PROGRESS
            </div>
          </header>

          <section className="exam-page">
            {showSubmitConfirm && (
              <div className="error-message">
                <strong>Submit assessment?</strong>
                <span>
                  You have answered {answeredCount} of {QUESTIONS.length}{' '}
                  questions. Continue or submit now?
                </span>
                <div className="question-actions" style={{ marginTop: '16px' }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowSubmitConfirm(false)}
                  >
                    Continue
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => submitTest('manual')}
                  >
                    Submit now
                  </button>
                </div>
              </div>
            )}

            <div className="exam-heading">
              <div>
                <p className="eyebrow">DATA STRUCTURES & ALGORITHMS</p>
                <h1>DSA Assessment</h1>
                <p className="subtitle exam-subtitle">
                  Student: <strong>{normalizedName}</strong>
                  {' · '}
                  URN: <strong>{normalizedUrn}</strong>
                </p>
              </div>

              <div className="answer-summary">
                <strong>
                  {answeredCount} / {QUESTIONS.length}
                </strong>
                <span>Answered</span>
                <div
                  className={`timer-card ${
                    timeRemaining <= 60 ? 'timer-warning' : ''
                  }`}
                  role="timer"
                  aria-label={`Time remaining: ${formattedTime}`}
                >
                  <span>TIME REMAINING</span>
                  <strong>{formattedTime}</strong>
                </div>
              </div>
            </div>

            <div className="exam-media-row">
              <div className="exam-media-card">
                <span>CAMERA</span>
                <video
                  ref={testCameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                />
              </div>

              <div className="exam-media-card">
                <span>SCREEN SHARE</span>
                <video
                  ref={testScreenVideoRef}
                  autoPlay
                  playsInline
                  muted
                />
              </div>
            </div>

            <div className="exam-layout">
              <section className="question-card">
                <div className="question-meta">
                  <span>
                    QUESTION {currentQuestion + 1} OF {QUESTIONS.length}
                  </span>
                  <span className="topic-label">
                    {currentQuestionData.topic}
                  </span>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%`
                    }}
                  />
                </div>

                <h2 className="question-prompt">
                  {currentQuestionData.prompt}
                </h2>

                <p className="option-instruction">Select one answer.</p>

                <div className="options-list">
                  {currentQuestionData.options.map((option, index) => {
                    const selected = answers[currentQuestion] === index;

                    return (
                      <button
                        key={option}
                        type="button"
                        className={`option-button ${selected ? 'selected' : ''}`}
                        aria-pressed={selected}
                        onClick={() => {
                          setAnswers((previous) => ({
                            ...previous,
                            [currentQuestion]: index
                          }));
                        }}
                      >
                        <span className="option-letter">
                          {String.fromCharCode(65 + index)}
                        </span>

                        <span className="option-text">{option}</span>
                        <span className="option-indicator" />
                      </button>
                    );
                  })}
                </div>

                <div className="question-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={currentQuestion === 0}
                    onClick={() => setCurrentQuestion((previous) => previous - 1)}
                  >
                    ← Previous
                  </button>

                  <span className="page-counter">
                    {currentQuestion + 1} / {QUESTIONS.length}
                  </span>

                  <button
                    type="button"
                    className="primary-button"
                    disabled={currentQuestion === QUESTIONS.length - 1}
                    onClick={() =>
                      setCurrentQuestion((previous) => Math.min(previous + 1, QUESTIONS.length - 1))
                    }
                  >
                    Next Question →
                  </button>
                </div>
              </section>

              <aside className="question-nav-card">
                <h2>Question navigator</h2>
                <p>Jump to any question or revisit an answer.</p>

                <div className="question-number-grid">
                  {QUESTIONS.map((item, index) => {
                    const answered = answers[index] !== undefined;
                    const current = currentQuestion === index;

                    return (
                      <button
                        key={`${item.topic}-${index}`}
                        type="button"
                        className={[
                          'question-number',
                          answered ? 'answered' : '',
                          current ? 'current' : ''
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        aria-label={`Go to question ${index + 1}`}
                        aria-current={current ? 'step' : undefined}
                        onClick={() => setCurrentQuestion(index)}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="navigator-legend">
                  <span>
                    <i className="legend-dot answered-dot" />
                    Answered
                  </span>

                  <span>
                    <i className="legend-dot unanswered-dot" />
                    Unanswered
                  </span>
                </div>

                <div className="exam-info">
                  <strong>Attempt progress</strong>

                  <p>
                    You have answered {answeredCount} out of {QUESTIONS.length}{' '}
                    questions.
                  </p>

                  <p>
                    Your selected answers are stored in memory for this session.
                  </p>
                </div>

                <button
                  type="button"
                  className="secondary-button back-to-setup"
                  onClick={() => setCurrentView('setup')}
                >
                  Back to setup
                </button>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setShowSubmitConfirm(true)}
                >
                  Submit exam
                </button>
              </aside>
            </div>

            <p className="exam-phase-note">
              Five practice questions · Timer and final submission are active.
            </p>
          </section>

          <footer className="footer">
            <span>ATHENA TEST ENVIRONMENT</span>
            <span>DSA ASSESSMENT · v0.4.0</span>
          </footer>
        </main>
      )}

      {currentView === 'results' && (
        <main className="app-shell">
          <header className="topbar">
            <div className="brand">
              <div className="brand-mark">A</div>
              <span>ATHENA</span>
            </div>

            <div className="system-status">
              <span className="status-dot status-dot-ready" />
              {submissionReason === 'timeout' ? 'TIME EXPIRED' : 'SUBMITTED'}
            </div>
          </header>

          <section className="setup-page">
            <p className="eyebrow">ASSESSMENT COMPLETE</p>
            <h1>
              {submissionReason === 'timeout'
                ? 'Time has expired.'
                : 'Your assessment has been submitted.'}
            </h1>
            <p className="subtitle">
              {normalizedName || 'Student'} completed the DSA assessment with a
              final score of {score}/{QUESTIONS.length}.
            </p>

            <div className="student-card">
              <div className="student-card-heading">
                <h2>Result summary</h2>
              </div>

              <div className="setup-summary">
                <div className="summary-item ready">
                  <span className="summary-dot" />
                  <span>Score: {score}/{QUESTIONS.length}</span>
                </div>
                <div className="summary-item ready">
                  <span className="summary-dot" />
                  <span>Percentage: {scorePercentage}%</span>
                </div>
                <div className="summary-item ready">
                  <span className="summary-dot" />
                  <span>{submissionReason === 'timeout' ? 'Timed out' : 'Submitted successfully'}</span>
                </div>
              </div>

              <div className="requirements">
                {QUESTIONS.map((question, index) => {
                  const isCorrect = answers[index] === question.correctIndex;
                  return (
                    <span
                      key={`${question.topic}-${index}`}
                      className={`requirement ${isCorrect ? 'met' : ''}`}
                    >
                      Q{index + 1}: {isCorrect ? 'Correct' : 'Review'}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="continue-area">
              <button
                type="button"
                className="continue-button"
                onClick={resetExam}
              >
                START NEW SETUP
              </button>
            </div>
          </section>

          <footer className="footer">
            <span>ATHENA TEST ENVIRONMENT</span>
            <span>DSA ASSESSMENT · v0.4.0</span>
          </footer>
        </main>
      )}
    </>
  );
}

export default App;
