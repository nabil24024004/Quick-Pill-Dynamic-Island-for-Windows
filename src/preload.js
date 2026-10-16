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
  launchApp: (appName) => ipcRenderer.invoke('launcher:launch-app', appName),
  buildAppCache: () => ipcRenderer.invoke('launcher:reindex-catalog'),
  searchApps: (query) => ipcRenderer.invoke('launcher:search-apps', query),
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
  audioMixer: {
    getDevices: () => ipcRenderer.invoke('audio-mixer:get-devices'),
    getSessions: (deviceId) => ipcRenderer.invoke('audio-mixer:get-sessions', deviceId),
    setVolume: (payload) => ipcRenderer.invoke('audio-mixer:set-volume', payload),
    setMute: (payload) => ipcRenderer.invoke('audio-mixer:set-mute', payload),
    setMasterVolume: (payload) => ipcRenderer.invoke('audio-mixer:set-master-volume', payload),
    setMasterMute: (payload) => ipcRenderer.invoke('audio-mixer:set-master-mute', payload),
  },
  progress: {
    getSnapshot: () => ipcRenderer.invoke('progress:get-snapshot'),
    executeAction: (operationId, action, params) => ipcRenderer.invoke('progress:execute-action', operationId, action, params),
    startFileOperation: (params) => ipcRenderer.invoke('progress:start-file-op', params),
    startHashOperation: (params) => ipcRenderer.invoke('progress:start-hash-op', params),
    selectFile: () => ipcRenderer.invoke('progress:select-file'),
    clearHistory: () => ipcRenderer.invoke('progress:clear-history'),
    onUpdate: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('progress:update', handler);
      return () => ipcRenderer.removeListener('progress:update', handler);
    }
  },
  notifications: {
    getSnapshot: () => ipcRenderer.invoke('notification:get-snapshot'),
    syncNow: () => ipcRenderer.invoke('notification:sync-now'),
    executeAction: (notificationId, actionType, params) => ipcRenderer.invoke('notification:execute-action', notificationId, actionType, params),
    snooze: (notificationId, durationMs, untilTimestamp) => ipcRenderer.invoke('notification:snooze', notificationId, durationMs, untilTimestamp),
    cancelSnooze: (notificationId) => ipcRenderer.invoke('notification:cancel-snooze', notificationId),
    dismiss: (notificationId) => ipcRenderer.invoke('notification:dismiss', notificationId),
    dismissGroup: (groupId) => ipcRenderer.invoke('notification:dismiss-group', groupId),
    clearAll: () => ipcRenderer.invoke('notification:clear-all'),
    undoDismiss: (notificationId) => ipcRenderer.invoke('notification:undo-dismiss', notificationId),
    markReviewed: (notificationId) => ipcRenderer.invoke('notification:mark-reviewed', notificationId),
    markAllReviewed: () => ipcRenderer.invoke('notification:mark-all-reviewed'),
    setHidePreviews: (hide) => ipcRenderer.invoke('notification:set-hide-previews', hide),
    setAppExcluded: (appName, excluded) => ipcRenderer.invoke('notification:set-app-excluded', appName, excluded),
    clearHistory: () => ipcRenderer.invoke('notification:clear-history'),
    onUpdate: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('notification:update', handler);
      return () => ipcRenderer.removeListener('notification:update', handler);
    }
  },
  launcher: {
    searchApps: (query, options) => ipcRenderer.invoke('launcher:search-apps', query, options),
    getCatalog: () => ipcRenderer.invoke('launcher:get-catalog'),
    reindexCatalog: () => ipcRenderer.invoke('launcher:reindex-catalog'),
    launchApp: (target) => ipcRenderer.invoke('launcher:launch-app', target),
    getRunningWindows: (options) => ipcRenderer.invoke('launcher:get-running-windows', options),
    activateWindow: (hWnd) => ipcRenderer.invoke('launcher:activate-window', hWnd),
    getFavorites: () => ipcRenderer.invoke('launcher:get-favorites'),
    setFavorites: (favorites) => ipcRenderer.invoke('launcher:set-favorites', favorites),
    getWorkspaces: () => ipcRenderer.invoke('workspaces:get-workspaces'),
    saveWorkspace: (workspace) => ipcRenderer.invoke('workspaces:save-workspace', workspace),
    deleteWorkspace: (id) => ipcRenderer.invoke('workspaces:delete-workspace', id),
    launchWorkspace: (id, options) => ipcRenderer.invoke('workspaces:launch-workspace', id, options),
    onWindowActivated: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('launcher:window-activated', handler);
      return () => ipcRenderer.removeListener('launcher:window-activated', handler);
    },
  },
  workspaces: {
    getWorkspaces: () => ipcRenderer.invoke('workspaces:get-workspaces'),
    saveWorkspace: (workspace) => ipcRenderer.invoke('workspaces:save-workspace', workspace),
    deleteWorkspace: (id) => ipcRenderer.invoke('workspaces:delete-workspace', id),
    launchWorkspace: (id, options) => ipcRenderer.invoke('workspaces:launch-workspace', id, options),
  },
  notes: {
    getNotes: (filter, options) => ipcRenderer.invoke('notes:get-notes', filter, options),
    saveNote: (note) => ipcRenderer.invoke('notes:save-note', note),
    deleteNote: (id) => ipcRenderer.invoke('notes:delete-note', id),
    undoDelete: () => ipcRenderer.invoke('notes:undo-delete'),
    togglePin: (id) => ipcRenderer.invoke('notes:toggle-pin', id),
    toggleArchive: (id) => ipcRenderer.invoke('notes:toggle-archive', id),
    saveDraft: (draft) => ipcRenderer.invoke('notes:save-draft', draft),
    getDraft: () => ipcRenderer.invoke('notes:get-draft'),
    clearDraft: () => ipcRenderer.invoke('notes:clear-draft'),
    getContextualCapture: (options) => ipcRenderer.invoke('notes:get-contextual-capture', options),
    searchNotes: (query, options) => ipcRenderer.invoke('notes:search-notes', query, options),
    getTags: () => ipcRenderer.invoke('notes:get-tags'),
    convertToTask: (noteOrId) => ipcRenderer.invoke('notes:convert-to-task', noteOrId),
    onQuickCaptureTriggered: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('notes:quick-capture-triggered', handler);
      return () => ipcRenderer.removeListener('notes:quick-capture-triggered', handler);
    },
    onNotesUpdated: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('notes:updated', handler);
      return () => ipcRenderer.removeListener('notes:updated', handler);
    },
  },
  platform: 'win32'
});
