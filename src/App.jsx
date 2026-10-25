import { useEffect, useRef, useState } from 'react';

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

  // Subscribe to actual fullscreen changes from Electron.
  useEffect(() => {
    if (!window.athenaAPI?.isFullscreen) {
      return;
    }

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

  // Attach the camera stream to the video element.
  useEffect(() => {
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Attach the screen stream to the video element.
  useEffect(() => {
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

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

    setSetupMessage(
      `Setup verified for ${normalizedName}. The test screen will be connected in Phase 4.`
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <span>ATHENA</span>
        </div>

        <div className="system-status">
          <span
            className={`status-dot ${
              canGoToTests ? 'status-dot-ready' : ''
            }`}
          />
          {canGoToTests ? 'SYSTEM READY' : 'SETUP REQUIRED'}
        </div>
      </header>

      <section className="setup-page">
        <p className="eyebrow">EXAM ENVIRONMENT VERIFICATION</p>

        <h1>
          {canGoToTests
            ? 'You are ready to begin'
            : 'Prepare your exam environment'}
        </h1>

        <p className="subtitle">
          Verify your devices, enter your student details, and
          switch to fullscreen before proceeding.
        </p>

        <div className="preview-grid">
          <section className="preview-panel">
            <div className="preview-heading">
              <strong>Camera Preview</strong>
              <span className={`pill ${cameraReady ? 'ready' : ''}`}>
                {cameraReady ? 'CONNECTED' : 'NOT CONNECTED'}
              </span>
            </div>

            <div className="preview-area">
              <video
                ref={cameraVideoRef}
                className={`preview-video ${
                  cameraReady ? 'visible' : ''
                }`}
                autoPlay
                playsInline
                muted
              />

              {!cameraReady && (
                <div className="preview-placeholder">
                  <div className="camera-symbol">CAM</div>
                  <strong>Camera Preview</strong>
                  <span>Camera not connected</span>
                </div>
              )}
            </div>

            <button
              className={
                cameraReady ? 'secondary-button' : 'primary-button'
              }
              onClick={cameraReady ? stopCamera : startCamera}
              type="button"
            >
              {cameraReady ? 'Stop Camera' : 'Get Camera Permission'}
            </button>
          </section>

          <section className="preview-panel">
            <div className="preview-heading">
              <strong>Screen Preview</strong>
              <span className={`pill ${screenReady ? 'ready' : ''}`}>
                {screenReady ? 'SHARING' : 'NOT SHARING'}
              </span>
            </div>

            <div className="preview-area">
              <video
                ref={screenVideoRef}
                className={`preview-video ${
                  screenReady ? 'visible' : ''
                }`}
                autoPlay
                playsInline
                muted
              />

              {!screenReady && (
                <div className="preview-placeholder">
                  <div className="camera-symbol">SCR</div>
                  <strong>Screen Preview</strong>
                  <span>No display has been shared</span>
                </div>
              )}
            </div>

            <button
              className={
                screenReady ? 'secondary-button' : 'primary-button'
              }
              onClick={
                screenReady ? stopScreenShare : startScreenShare
              }
              type="button"
            >
              {screenReady ? 'Stop Sharing' : 'Share Screen'}
            </button>
          </section>
        </div>

        <section className="student-card">
          <div className="student-card-heading">
            <h2>Student identification</h2>
            <p>Enter the details associated with your college record.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="studentName">Full name</label>
                <input
                  id="studentName"
                  name="studentName"
                  autoComplete="name"
                  value={studentName}
                  onChange={(event) => {
                    setStudentName(event.target.value);
                    setSetupMessage('');
                  }}
                  onBlur={() => setNameTouched(true)}
                  minLength={2}
                  maxLength={80}
                  required
                  aria-invalid={nameTouched && !nameValid}
                  placeholder="Enter your full name"
                />

                {nameTouched && !nameValid && (
                  <span className="field-error">
                    Enter a name between 2 and 80 characters.
                  </span>
                )}
              </div>

              <div className="field">
                <label htmlFor="urn">University roll number (URN)</label>
                <input
                  id="urn"
                  name="urn"
                  autoComplete="off"
                  spellCheck={false}
                  value={urn}
                  onChange={(event) => {
                    setUrn(event.target.value);
                    setSetupMessage('');
                  }}
                  onBlur={() => setUrnTouched(true)}
                  minLength={3}
                  maxLength={40}
                  pattern="[A-Za-z0-9][A-Za-z0-9/_-]{2,39}"
                  title="Use 3–40 characters: letters, numbers, slash, hyphen, or underscore."
                  required
                  aria-invalid={urnTouched && !urnValid}
                  placeholder="Enter your URN"
                />

                {urnTouched && !urnValid && (
                  <span className="field-error">
                    Enter a valid URN using the displayed format.
                  </span>
                )}
              </div>
            </div>

            <div className="fullscreen-row">
              <div className="fullscreen-copy">
                <strong>Fullscreen mode</strong>
                <span>
                  {isFullscreen
                    ? 'The desktop window is in fullscreen.'
                    : 'Fullscreen is required before continuing.'}
                </span>
              </div>

              <button
                className="secondary-button fullscreen-button"
                type="button"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? 'Exit Fullscreen' : 'Go Fullscreen'}
              </button>
            </div>

            <div className="requirements">
              <span className={cameraReady ? 'requirement met' : 'requirement'}>
                {cameraReady ? '✓' : '○'} Camera
              </span>

              <span className={screenReady ? 'requirement met' : 'requirement'}>
                {screenReady ? '✓' : '○'} Screen sharing
              </span>

              <span className={isFullscreen ? 'requirement met' : 'requirement'}>
                {isFullscreen ? '✓' : '○'} Fullscreen
              </span>

              <span className={nameValid && urnValid ? 'requirement met' : 'requirement'}>
                {nameValid && urnValid ? '✓' : '○'} Student details
              </span>
            </div>

            {errorMessage && (
              <div className="error-message" role="alert">
                {errorMessage}
              </div>
            )}

            {setupMessage && (
              <div className="success-message" role="status">
                {setupMessage}
              </div>
            )}

            <div className="continue-area">
              <button
                className="continue-button"
                type="submit"
                disabled={!canGoToTests}
              >
                GO TO TESTS
                <span aria-hidden="true">→</span>
              </button>

              <span className="continue-caption">
                {canGoToTests
                  ? 'All setup requirements are satisfied.'
                  : 'Complete all requirements to continue.'}
              </span>
            </div>
          </form>
        </section>

        <p className="note">
          This prototype displays media locally. It does not record
          or upload your camera or screen. Student details remain in
          application memory and are not submitted to a server.
        </p>
      </section>

      <footer className="footer">
        <span>ATHENA TEST ENVIRONMENT</span>
        <span>
          {isElectron ? 'ELECTRON DESKTOP' : 'BROWSER PREVIEW'} · v0.3.0
        </span>
      </footer>
    </main>
  );
}

export default App;