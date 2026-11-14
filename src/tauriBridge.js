import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebview } from '@tauri-apps/api/webview';

/**
 * Subscribe to a Tauri event while exposing a synchronous unsubscribe function
 * compatible with Quick Pill's Electron preload contract.
 */
function subscribe(eventName, callback) {
  if (typeof callback !== 'function') {
    return () => {};
  }

  let disposed = false;
  let unlistenFn = null;

  listen(eventName, (event) => {
    if (!disposed) {
      callback(event.payload);
    }
  })
    .then((fn) => {
      if (disposed) {
        fn();
      } else {
        unlistenFn = fn;
      }
    })
    .catch((err) => {
      console.error(`[tauriBridge] Failed to listen to ${eventName}:`, err);
    });

  return () => {
    disposed = true;
    if (typeof unlistenFn === 'function') {
      unlistenFn();
      unlistenFn = null;
    }
  };
}

let isShelfDragOutActive = false;

if (typeof window !== 'undefined') {
  window.addEventListener('shelf-native-drag-start', () => {
    isShelfDragOutActive = true;
  });

  subscribe('shelf:drag-ended', () => {
    isShelfDragOutActive = false;
  });

  try {
    const webview = getCurrentWebview();
    webview
      .onDragDropEvent((event) => {
        const payload = event?.payload;
        if (!payload || isShelfDragOutActive) return;

        if (payload.type === 'enter' || payload.type === 'over') {
          const synthetic = new Event('dragover', { cancelable: true });
          Object.defineProperty(synthetic, 'dataTransfer', {
            value: {
              types: ['Files'],
              dropEffect: 'copy',
            },
          });
          window.dispatchEvent(synthetic);
        } else if (payload.type === 'leave') {
          window.dispatchEvent(new CustomEvent('quick-pill-file-drag-end'));
        } else if (payload.type === 'drop') {
          const paths = Array.isArray(payload.paths)
            ? payload.paths.filter((p) => typeof p === 'string' && p.length > 0)
            : [];
          window.dispatchEvent(new CustomEvent('quick-pill-file-drag-end'));
          if (paths.length > 0) {
            invoke('shelf_add_files', { filePaths: paths }).catch((err) => {
              console.error('[tauriBridge] shelf_add_files on native drop failed:', err);
            });
          }
        }
      })
      .catch((err) => {
        console.warn('[tauriBridge] DragDrop listener unavailable:', err);
      });
  } catch (err) {
    console.warn('[tauriBridge] Webview unavailable during bridge init:', err);
  }
}

function getFilePathCompat(file) {
  if (file && typeof file.path === 'string') {
    return file.path;
  }
  return '';
}

const electronAPI = {
  setIgnoreMouseEvents: (ignore, forward, isCtrl) =>
    invoke('set_ignore_mouse_events', {
      ignore: Boolean(ignore),
      forward: Boolean(forward),
      isCtrl: Boolean(isCtrl),
    }),
  updateIslandBounds: (bounds) =>
    invoke('update_island_bounds', {
      bounds: bounds ?? null,
    }),
  onIslandCursorEntered: (cb) => subscribe('island:cursor-entered', cb),
  onIslandCursorOutside: (cb) => subscribe('island:cursor-outside', cb),
  getPathForFile: getFilePathCompat,

  getSystemMedia: () => invoke('get_system_media'),
  getBluetoothStatus: () => invoke('get_bluetooth_status'),
  getCameraStatus: () => invoke('get_camera_status'),
  getMicrophoneStatus: () => invoke('get_microphone_status'),
  getSystemMetrics: () => invoke('get_system_metrics'),
  controlSystemMedia: (command, ...args) =>
    invoke('control_system_media', {
      command: String(command || ''),
      seekSeconds: typeof args[0] === 'number' ? args[0] : 0,
    }),
  openExternal: (url) => invoke('open_external', { url: String(url || '') }),
  launchApp: (appName) => invoke('launcher_launch_app', { target: appName }),
  buildAppCache: () => invoke('launcher_reindex_catalog'),
  searchApps: (query) =>
    invoke('launcher_search_apps', { query: query || '', options: null }),

  getDisplays: () => invoke('get_displays'),
  setDisplay: (displayId) =>
    invoke('set_display', {
      displayId: displayId == null ? '' : String(displayId),
    }),
  updateWindowPosition: (xPerc, yPx) =>
    invoke('update_window_position', {
      xPerc: Number(xPerc) || 50,
      yPx: Number(yPx) || 0,
    }),
  setAutoLaunch: (enable) => invoke('set_auto_launch', { enable: Boolean(enable) }),
  getClipboardText: () => invoke('get_clipboard_text'),
  writeClipboardText: (text) =>
    invoke('write_clipboard_text', { text: text == null ? '' : String(text) }),
  clearClipboard: () => invoke('clear_clipboard'),
  controlSystemVolume: (action) =>
    invoke('control_system_volume', { action: String(action || '') }),
  focusWindow: () => invoke('focus_window'),

  logMessage: (level, msg, details) =>
    invoke('log_message', {
      level: String(level || 'info'),
      msg: String(msg || ''),
      details: details ?? null,
    }).catch(() => {}),
  logRendererError: (errorData) =>
    invoke('log_renderer_error', {
      errorData: errorData ?? {},
    }).catch(() => {}),

  getNotifications: () => invoke('get_notifications'),
  dismissNotification: (id) => invoke('dismiss_notification', { id }),
  focusNotificationApp: (appId) => invoke('focus_notification_app', { appId }),

  onKeyLockChange: (cb) => subscribe('key-lock-change', cb),
  onUSBChange: (cb) => subscribe('usb-change', cb),

  checkForUpdates: () => invoke('check_for_updates'),
  startUpdateDownload: () => invoke('start_update_download'),
  cancelUpdateDownload: () => invoke('cancel_update_download'),
  installUpdate: () => invoke('install_update'),
  getAppVersion: () => invoke('get_app_version'),
  isStoreBuild: () => invoke('is_store_build'),
  getAutoDownloadInstall: () => invoke('get_auto_download_install'),
  setAutoDownloadInstall: (enable) =>
    invoke('set_auto_download_install', { enable: Boolean(enable) }),
  onUpdateEvent: (cb) => subscribe('update-event', cb),

  getAlwaysOnTop: () => invoke('get_always_on_top'),
  setAlwaysOnTop: (enable) => invoke('set_always_on_top', { enable: Boolean(enable) }),
  onAlwaysOnTopChange: (cb) => subscribe('always-on-top-changed', cb),
  onSystemResume: (cb) => subscribe('system-resume', cb),

  platform: 'win32',

  audioMixer: {
    getDevices: () => invoke('audio_mixer_get_devices'),
    getSessions: (deviceId) =>
      invoke('audio_mixer_get_sessions', { deviceId: deviceId || null }),
    setVolume: (payload) => invoke('audio_mixer_set_volume', { payload }),
    setMute: (payload) => invoke('audio_mixer_set_mute', { payload }),
    setMasterVolume: (payload) => invoke('audio_mixer_set_master_volume', { payload }),
    setMasterMute: (payload) => invoke('audio_mixer_set_master_mute', { payload }),
  },

  notifications: {
    getSnapshot: () => invoke('notifications_get_snapshot'),
    syncNow: () => invoke('notifications_sync_now'),
    executeAction: (notificationId, actionType, params) =>
      invoke('notifications_execute_action', {
        notificationId,
        actionType,
        params: params ?? null,
      }),
    snooze: (notificationId, durationMs, untilTimestamp) =>
      invoke('notifications_snooze', {
        notificationId,
        durationMs: durationMs ?? null,
        untilTimestamp: untilTimestamp ?? null,
      }),
    cancelSnooze: (notificationId) =>
      invoke('notifications_cancel_snooze', { notificationId }),
    dismiss: (notificationId) => invoke('notifications_dismiss', { notificationId }),
    dismissGroup: (groupId) => invoke('notifications_dismiss_group', { groupId }),
    clearAll: () => invoke('notifications_clear_all'),
    undoDismiss: (notificationId) =>
      invoke('notifications_undo_dismiss', { notificationId }),
    markReviewed: (notificationId) =>
      invoke('notifications_mark_reviewed', { notificationId }),
    markAllReviewed: () => invoke('notifications_mark_all_reviewed'),
    setHidePreviews: (hide) =>
      invoke('notifications_set_hide_previews', { hide: Boolean(hide) }),
    setAppExcluded: (appName, excluded) =>
      invoke('notifications_set_app_excluded', {
        appName,
        excluded: Boolean(excluded),
      }),
    clearHistory: () => invoke('notifications_clear_history'),
    onUpdate: (cb) => subscribe('notification:update', cb),
  },

  launcher: {
    searchApps: (query, options) =>
      invoke('launcher_search_apps', { query: query || '', options: options ?? null }),
    getCatalog: () => invoke('launcher_get_catalog'),
    reindexCatalog: () => invoke('launcher_reindex_catalog'),
    launchApp: (target) => invoke('launcher_launch_app', { target }),
    getRunningWindows: (options) =>
      invoke('launcher_get_running_windows', { options: options ?? null }),
    activateWindow: (hWnd) => invoke('launcher_activate_window', { hWnd: Number(hWnd) }),
    getFavorites: () => invoke('launcher_get_favorites'),
    setFavorites: (favorites) => invoke('launcher_set_favorites', { favorites }),
    getWorkspaces: () => invoke('workspaces_get_all'),
    saveWorkspace: (workspace) => invoke('workspaces_save', { workspace }),
    deleteWorkspace: (id) => invoke('workspaces_delete', { id }),
    launchWorkspace: (id) =>
      invoke('workspaces_launch', { id, options: null }),
    onWindowActivated: (cb) => subscribe('launcher:window-activated', cb),
  },

  workspaces: {
    getWorkspaces: () => invoke('workspaces_get_all'),
    saveWorkspace: (workspace) => invoke('workspaces_save', { workspace }),
    deleteWorkspace: (id) => invoke('workspaces_delete', { id }),
    launchWorkspace: (id, options) =>
      invoke('workspaces_launch', { id, options: options ?? null }),
  },

  notes: {
    getNotes: (filter, options) =>
      invoke('notes_get_all', { filter: filter ?? null, options: options ?? null }),
    saveNote: (note) => invoke('notes_save', { note }),
    deleteNote: (id) => invoke('notes_delete', { id }),
    undoDelete: () => invoke('notes_undo_delete'),
    togglePin: (id) => invoke('notes_toggle_pin', { id }),
    toggleArchive: (id) => invoke('notes_toggle_archive', { id }),
    saveDraft: (draft) => invoke('notes_save_draft', { draft }),
    getDraft: () => invoke('notes_get_draft'),
    clearDraft: () => invoke('notes_clear_draft'),
    getContextualCapture: (options) =>
      invoke('notes_get_context', { options: options ?? null }),
    searchNotes: (query, options) =>
      invoke('notes_search', { query: query || '', options: options ?? null }),
    getTags: () => invoke('notes_get_tags'),
    convertToTask: (noteOrId) => invoke('notes_convert_to_task', { noteOrId }),
    onQuickCaptureTriggered: (cb) => subscribe('notes:quick-capture-triggered', cb),
    onNotesUpdated: (cb) => subscribe('notes:updated', cb),
  },

  shelf: {
    getItems: () => invoke('shelf_get_items'),
    addFiles: (filePaths) => invoke('shelf_add_files', { filePaths }),
    removeItem: (id) => invoke('shelf_remove_item', { id }),
    clear: () => invoke('shelf_clear'),
    openFile: (filePathOrId) => invoke('shelf_open_file', { filePathOrId }),
    showInFolder: (filePathOrId) => invoke('shelf_show_in_folder', { filePathOrId }),
    startDrag: (filePathOrId, islandBounds) =>
      invoke('shelf_start_drag', {
        filePathOrId,
        islandBounds: islandBounds ?? null,
      }),
    getPathForFile: getFilePathCompat,
    onUpdate: (cb) => subscribe('shelf:update', cb),
    onDragEnded: (cb) => subscribe('shelf:drag-ended', cb),
  },

  prayer: {
    getTimings: (city, country) =>
      invoke('prayer_get_timings', { city, country: country ?? null }),
  },

  shortcuts: {
    getTabShortcuts: () => invoke('shortcuts_get_tabs'),
    setTabShortcuts: (shortcuts) => invoke('shortcuts_set_tabs', { shortcuts }),
    resetTabShortcuts: () => invoke('shortcuts_reset_tabs'),
    onOpenTabInstant: (cb) => subscribe('open-tab-instant', cb),
  },
};

if (typeof window !== 'undefined' && !window.electronAPI) {
  window.electronAPI = electronAPI;
}

export default electronAPI;
