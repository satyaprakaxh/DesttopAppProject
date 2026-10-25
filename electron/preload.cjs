const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('athenaAPI', {
  appName: 'Athena Exam',
  isElectron: true,

  requestCameraAccess: () => {
    return ipcRenderer.invoke('athena:request-camera-access');
  },

  enterFullscreen: () => {
    return ipcRenderer.invoke('athena:enter-fullscreen');
  },

  exitFullscreen: () => {
    return ipcRenderer.invoke('athena:exit-fullscreen');
  },

  isFullscreen: () => {
    return ipcRenderer.invoke('athena:is-fullscreen');
  },

  onFullscreenChanged: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }

    const listener = (_event, isFullscreen) => {
      callback(Boolean(isFullscreen));
    };

    ipcRenderer.on('athena:fullscreen-changed', listener);

    return () => {
      ipcRenderer.removeListener(
        'athena:fullscreen-changed',
        listener
      );
    };
  }
});