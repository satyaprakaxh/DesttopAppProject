const {
  app,
  BrowserWindow,
  ipcMain,
  session,
  systemPreferences
} = require('electron');

const path = require('node:path');

const DEV_URL = 'http://localhost:5173';

let mainWindow = null;

function isTrustedOrigin(origin) {
  try {
    const parsed = new URL(origin);

    if (app.isPackaged) {
      return parsed.protocol === 'file:';
    }

    return (
      parsed.protocol === 'http:' &&
      parsed.hostname === 'localhost' &&
      parsed.port === '5173'
    );
  } catch {
    return false;
  }
}
function isTrustedNavigation(url) {
  if (!app.isPackaged) {
    return isTrustedOrigin(url);
  }

  try {
    const parsed = new URL(url);
    const expectedFile = path.resolve(
      __dirname,
      '..',
      'dist',
      'index.html'
    );

    return (
      parsed.protocol === 'file:' &&
      path.resolve(decodeURIComponent(parsed.pathname)) ===
        expectedFile
    );
  } catch {
    return false;
  }
}

function isTrustedSender(webContents) {
  return Boolean(
    mainWindow &&
    webContents === mainWindow.webContents &&
    isTrustedOrigin(webContents.getURL())
  );
}
ipcMain.handle('athena:enter-fullscreen', (event) => {
  if (!isTrustedSender(event.sender)) {
    return false;
  }

  const win = BrowserWindow.fromWebContents(event.sender);

  if (!win) {
    return false;
  }

  win.setFullScreen(true);
  return true;
});

ipcMain.handle('athena:exit-fullscreen', (event) => {
  if (!isTrustedSender(event.sender)) {
    return false;
  }

  const win = BrowserWindow.fromWebContents(event.sender);

  if (!win) {
    return false;
  }

  win.setFullScreen(false);
  return true;
});

ipcMain.handle('athena:is-fullscreen', (event) => {
  if (!isTrustedSender(event.sender)) {
    return false;
  }

  const win = BrowserWindow.fromWebContents(event.sender);
  return win ? win.isFullScreen() : false;
});

function configureMediaPermissions() {
  const appSession = session.defaultSession;

  appSession.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin, details) => {
      if (
        !webContents ||
        webContents !== mainWindow?.webContents ||
        !isTrustedOrigin(requestingOrigin)
      ) {
        return false;
      }

      if (permission === 'media') {
        return details?.mediaType === 'video';
      }

      if (permission === 'display-capture') {
        return true;
      }

      return false;
    }
  );

  appSession.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      const requestingUrl =
        details?.requestingUrl ?? webContents?.getURL() ?? '';

      if (
        !isTrustedSender(webContents) ||
        !isTrustedOrigin(requestingUrl)
      ) {
        return callback(false);
      }

      if (permission === 'media') {
        const mediaTypes = details?.mediaTypes ?? [];

        return callback(
          mediaTypes.includes('video') &&
          !mediaTypes.includes('audio')
        );
      }

      if (permission === 'display-capture') {
        return callback(true);
      }

      return callback(false);
    }
  );

  appSession.setDisplayMediaRequestHandler(
    (request, callback) => {
      if (!isTrustedOrigin(request.securityOrigin)) {
        return callback(null);
      }

      // Do not silently select a screen if the native picker
      // is unavailable.
      callback(null);
    },
    { useSystemPicker: true }
  );
}

ipcMain.handle(
  'athena:request-camera-access',
  async (event) => {
    if (!isTrustedSender(event.sender)) {
      return false;
    }

    if (process.platform !== 'darwin') {
      return true;
    }

    try {
      return await systemPreferences.askForMediaAccess('camera');
    } catch {
      return false;
    }
  }
);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#09090b',
    title: 'Athena Exam',

    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
mainWindow.on('enter-full-screen', () => {
  mainWindow?.webContents.send(
    'athena:fullscreen-changed',
    true
  );
});

mainWindow.on('leave-full-screen', () => {
  mainWindow?.webContents.send(
    'athena:fullscreen-changed',
    false
  );
});
  mainWindow.webContents.setWindowOpenHandler(() => ({
    action: 'deny'
  }));

  mainWindow.webContents.on('will-navigate', (event, url) => {
  if (!isTrustedNavigation(url)) {
    event.preventDefault();
  }
});

  if (app.isPackaged) {
    mainWindow.loadFile(
      path.join(__dirname, '..', 'dist', 'index.html')
    );
  } else {
    mainWindow.loadURL(DEV_URL);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  configureMediaPermissions();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});