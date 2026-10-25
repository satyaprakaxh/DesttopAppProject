import {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
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

  const cameraVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const [examDeadline, setExamDeadline] = useState(null);

const [timeRemaining, setTimeRemaining] = useState(
  EXAM_DURATION_SECONDS
);

const [submitted, setSubmitted] = useState(false);
const [submissionReason, setSubmissionReason] = useState('');
const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const isElectron = Boolean(window.athenaAPI?.isElectron);

  const normalizedName = studentName.trim();
  const normalizedUrn = urn.trim();

  // Example URN format. Adapt this to your college's actual format.
  const urnPattern = /^[A-Za-z0-9][A-Za-z0-9/_-]{2,39}$/;

  const nameValid =
    normalizedName.length >= 2 &&
    normalizedName.length <= 80;

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
  // Subscribe to actual fullscreen changes from Electron.
  useEffect(() => {
    if (!window.athenaAPI?.isFullscreen) {
      return;
    }
const [currentView, setCurrentView] = useState('setup');
const [currentQuestion, setCurrentQuestion] = useState(0);
const [answers, setAnswers] = useState({});
    let mounted = true;

    window.athenaAPI
      .isFullscreen()
      .then((value) => {
        if (mounted) {
          setIsFullscreen(Boolean(value));
        }
      })
      .catch(() => {
        if (mounted) {
          setIsFullscreen(false);
        }
      });

    const unsubscribe =
      window.athenaAPI.onFullscreenChanged((value) => {
        setIsFullscreen(value);
      });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);
useEffect(() => {
  if (
    currentView !== 'test' ||
    examDeadline === null ||
    submitted
  ) {
    return;
  }

  function updateTimer() {
    const remaining = Math.max(
      0,
      Math.ceil((examDeadline - Date.now()) / 1000)
    );

    setTimeRemaining(remaining);

    if (remaining === 0) {
      submitTest('timeout');
    }
  }

  // Update immediately, rather than waiting for the first interval.
  updateTimer();

  const intervalId = window.setInterval(updateTimer, 250);

  return () => {
    window.clearInterval(intervalId);
  };
}, [
  currentView,
  examDeadline,
  submitted,
  submitTest
]);
  // Attach the camera stream to the video element.
  useEffect(() => {
  const video =
    currentView === 'setup'
      ? cameraVideoRef.current
      : testCameraVideoRef.current;

  if (video) {
    video.srcObject = cameraStream;
  }
}, [cameraStream, currentView]);

  // Attach the screen stream to the video element.
 useEffect(() => {
  const video =
    currentView === 'setup'
      ? screenVideoRef.current
      : testScreenVideoRef.current;

  if (video) {
    video.srcObject = screenStream;
  }
}, [screenStream, currentView]);x

  // Release camera resources when the stream changes or unmounts.
  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  // Release screen-capture resources when the stream changes or unmounts.
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
        const permitted =
          await window.athenaAPI.requestCameraAccess();

        if (!permitted) {
          throw new Error(
            'Camera permission was not granted. Check macOS Privacy & Security settings.'
          );
        }
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
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

      const stream =
        await navigator.mediaDevices.getDisplayMedia({
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
    } catch (error) {
      setErrorMessage(
        describeMediaError(error, 'screen sharing')
      );
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

function handleSubmit(event) {
  event.preventDefault();

  setErrorMessage('');
  setSetupMessage('');

  if (!nameValid || !urnValid) {
    setNameTouched(true);
    setUrnTouched(true);
    return;
  }

  if (!cameraReady || !screenReady || !isFullscreen) {
    setErrorMessage(
      'Connect the camera, share the screen, and enter fullscreen first.'
    );
    return;
  }

  setCurrentQuestion(0);
setAnswers({});

setSubmitted(false);
setSubmissionReason('');
setShowSubmitConfirm(false);

setTimeRemaining(EXAM_DURATION_SECONDS);

setExamDeadline(
  Date.now() + EXAM_DURATION_SECONDS * 1000
);

setCurrentView('test');

}

 if (currentView === 'test') {
  const question = QUESTIONS[currentQuestion];
  const answeredCount = Object.keys(answers).length;

  return (
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
            <strong>{answeredCount} / {QUESTIONS.length}</strong>
            <span>Answered</span>
            <div className={`timer-card ${
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

              <span className="topic-label">{question.topic}</span>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${
                    ((currentQuestion + 1) / QUESTIONS.length) * 100
                  }%`
                }}
              />
            </div>

            <h2 className="question-prompt">
              {question.prompt}
            </h2>

            <p className="option-instruction">
              Select one answer.
            </p>

            <div className="options-list">
              {question.options.map((option, index) => {
                const selected = answers[currentQuestion] === index;

                return (
                  <button
                    key={option}
                    type="button"
                    className={`option-button ${
                      selected ? 'selected' : ''
                    }`}
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

                    <span className="option-text">
                      {option}
                    </span>

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
                onClick={() => {
                  setCurrentQuestion((previous) => previous - 1);
                }}
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
                onClick={() => {
                  setCurrentQuestion((previous) => previous + 1);
                }}
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
                    key={item.topic}
                    type="button"
                    className={[
                      'question-number',
                      answered ? 'answered' : '',
                      current ? 'current' : ''
                    ].filter(Boolean).join(' ')}
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
                You have answered {answeredCount} out of{' '}
                {QUESTIONS.length} questions.
              </p>

              <p>
                Your selected answers are held in application memory
                during this session.
              </p>
            </div>

            <button
              type="button"
              className="secondary-button back-to-setup"
              onClick={() => setCurrentView('setup')}
            >
              Back to setup
            </button>
          </aside>
        </div>

        <p className="exam-phase-note">
          Five practice questions · Timer and final submission are
          implemented in the next phase.
        </p>
      </section>

      <footer className="footer">
        <span>ATHENA TEST ENVIRONMENT</span>
        <span>DSA ASSESSMENT · v0.4.0</span>
      </footer>
    </main>
  );
}
}

export default App;