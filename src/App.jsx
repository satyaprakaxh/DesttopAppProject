function App() {
  const isElectron = Boolean(window.athenaAPI?.isElectron);

  const appName = window.athenaAPI?.appName ?? 'Athena Exam';

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <span>ATHENA</span>
        </div>

        <div className="system-status">
          <span className="status-dot" />
          {isElectron ? 'DESKTOP CONNECTED' : 'BROWSER PREVIEW'}
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">EXAM MONITORING ENVIRONMENT</p>

        <h1>
          Your exam environment
          <br />
          starts here.
        </h1>

        <p className="subtitle">
          Verify your desktop application and prepare the foundation
          for a controlled testing experience.
        </p>

        <div className="setup-card">
          <div className="card-heading">
            <div className="app-icon">A</div>

            <div className="heading-copy">
              <h2>{appName}</h2>
              <p>Application diagnostics</p>
            </div>
          </div>

          <div className="check-row">
            <span className="check-icon">✓</span>
            <div className="check-copy">
              <strong>React renderer</strong>
              <span>The interface has loaded.</span>
            </div>
            <span className="check-label">READY</span>
          </div>

          <div className="check-row">
            <span className="check-icon">✓</span>
            <div className="check-copy">
              <strong>Desktop runtime</strong>
              <span>Electron manages this window.</span>
            </div>
            <span className="check-label">
              {isElectron ? 'READY' : 'PENDING'}
            </span>
          </div>

          <div className="check-row">
            <span className="check-icon">✓</span>
            <div className="check-copy">
              <strong>Application bridge</strong>
              <span>Preload exposes a limited app identity.</span>
            </div>
            <span className="check-label">
              {isElectron ? 'READY' : 'PENDING'}
            </span>
          </div>

          {!isElectron && (
            <p className="browser-note">
              Start Electron to verify the complete desktop setup.
            </p>
          )}
        </div>

        <div className="phase-note">
          <span className="phase-number">PHASE 01</span>
          <span>Desktop application foundation</span>
        </div>
      </section>

      <footer className="footer">
        <span>ATHENA TEST ENVIRONMENT</span>
        <span>DEVELOPMENT BUILD · v0.1.0</span>
      </footer>
    </main>
  );
}

export default App;