const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore, forward) => {
    return ipcRenderer.invoke('set-ignore-mouse-events', ignore, forward);
  },
  getSystemMedia: () => ipcRenderer.invoke('get-system-media'),
  getBluetoothStatus: () => ipcRenderer.invoke('get-bluetooth-status'),
  getCameraStatus: () => ipcRenderer.invoke('get-camera-status'),
  getMicrophoneStatus: () => ipcRenderer.invoke('get-microphone-status'),
  getSystemMetrics: () => ipcRenderer.invoke('get-system-metrics'),
  controlSystemMedia: (command, ...args) => ipcRenderer.invoke('control-system-media', command, ...args),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  launchApp: (appName) => ipcRenderer.invoke('launch-app', appName),
  buildAppCache: () => ipcRenderer.invoke('build-app-cache'),
  searchApps: (query) => ipcRenderer.invoke('search-apps', query),
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  setDisplay: (displayId) => ipcRenderer.invoke('set-display', displayId),
  updateWindowPosition: (xPerc, yPx) => ipcRenderer.invoke('update-window-position', xPerc, yPx),
  setAutoLaunch: (enable) => ipcRenderer.invoke('set-auto-launch', enable),
  getClipboardText: () => ipcRenderer.invoke('get-clipboard-text'),
  writeClipboardText: (text) => ipcRenderer.invoke('write-clipboard-text', text),
  clearClipboard: () => ipcRenderer.invoke('clear-clipboard'),
  controlSystemVolume: (action) => ipcRenderer.invoke('control-system-volume', action),
  focusWindow: () => ipcRenderer.invoke('focus-window'),
  logMessage: (level, msg, details) => ipcRenderer.invoke('log-message', level, msg, details),
  getNotifications: () => ipcRenderer.invoke('get-notifications'),
  dismissNotification: (id) => ipcRenderer.invoke('dismiss-notification', id),
  focusNotificationApp: (appId) => ipcRenderer.invoke('focus-notification-app', appId),
  onKeyLockChange: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('key-lock-change', handler);
    return () => ipcRenderer.removeListener('key-lock-change', handler);
  },
  onUSBChange: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('usb-change', handler);
    return () => ipcRenderer.removeListener('usb-change', handler);
  },
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  startUpdateDownload: () => ipcRenderer.invoke('start-update-download'),
  cancelUpdateDownload: () => ipcRenderer.invoke('cancel-update-download'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAutoDownloadInstall: () => ipcRenderer.invoke('get-auto-download-install'),
  setAutoDownloadInstall: (enable) => ipcRenderer.invoke('set-auto-download-install', enable),
  getAlwaysOnTop: () => ipcRenderer.invoke('get-always-on-top'),
  setAlwaysOnTop: (enable) => ipcRenderer.invoke('set-always-on-top', enable),
  onAlwaysOnTopChange: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('always-on-top-changed', handler);
    return () => ipcRenderer.removeListener('always-on-top-changed', handler);
  },
  onUpdateEvent: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('update-event', handler);
    return () => ipcRenderer.removeListener('update-event', handler);
  },
  onSystemResume: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('system-resume', handler);
    return () => ipcRenderer.removeListener('system-resume', handler);
  },
  platform: 'win32'
});
