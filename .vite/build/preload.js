"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  setIgnoreMouseEvents: (ignore, forward) => {
    return ipcRenderer.invoke("set-ignore-mouse-events", ignore, forward);
  },
  getSystemMedia: () => ipcRenderer.invoke("get-system-media"),
  getBluetoothStatus: () => ipcRenderer.invoke("get-bluetooth-status"),
  getCameraStatus: () => ipcRenderer.invoke("get-camera-status"),
  getMicrophoneStatus: () => ipcRenderer.invoke("get-microphone-status"),
  getSystemMetrics: () => ipcRenderer.invoke("get-system-metrics"),
  controlSystemMedia: (command) => ipcRenderer.invoke("control-system-media", command),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  launchApp: (appName) => ipcRenderer.invoke("launch-app", appName),
  buildAppCache: () => ipcRenderer.invoke("build-app-cache"),
  searchApps: (query) => ipcRenderer.invoke("search-apps", query),
  getDisplays: () => ipcRenderer.invoke("get-displays"),
  setDisplay: (displayId) => ipcRenderer.invoke("set-display", displayId),
  updateWindowPosition: (xPerc, yPx) => ipcRenderer.invoke("update-window-position", xPerc, yPx),
  setAutoLaunch: (enable) => process.platform !== "darwin" ? ipcRenderer.invoke("set-auto-launch", enable) : Promise.resolve(),
  getClipboardText: () => ipcRenderer.invoke("get-clipboard-text"),
  writeClipboardText: (text) => ipcRenderer.invoke("write-clipboard-text", text),
  clearClipboard: () => ipcRenderer.invoke("clear-clipboard"),
  controlSystemVolume: (action) => ipcRenderer.invoke("control-system-volume", action),
  focusWindow: () => ipcRenderer.invoke("focus-window"),
  logMessage: (level, msg, details) => ipcRenderer.invoke("log-message", level, msg, details),
  getNotifications: () => ipcRenderer.invoke("get-notifications"),
  dismissNotification: (id) => ipcRenderer.invoke("dismiss-notification", id),
  focusNotificationApp: (appId) => ipcRenderer.invoke("focus-notification-app", appId),
  onKeyLockChange: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on("key-lock-change", handler);
    return () => ipcRenderer.removeListener("key-lock-change", handler);
  },
  onUSBChange: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on("usb-change", handler);
    return () => ipcRenderer.removeListener("usb-change", handler);
  },
  platform: process.platform
});
