import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Island from './Island';
import './App.css';

// Safe browser mock for electronAPI when running in standard browser (e.g. localhost:5173)
if (typeof window !== 'undefined' && !window.electronAPI) {
  console.info('Quick Pill: Running outside Electron environment. Initializing development mock API.');
  window.electronAPI = {
    setIgnoreMouseEvents: () => {},
    getSystemMedia: async () => ({
      title: 'Quick Pill Live Preview',
      artist: 'Desktop Dynamic Island',
      isPlaying: true,
      position: 45,
      duration: 210,
    }),
    getBluetoothStatus: async () => true,
    getCameraStatus: async () => false,
    getMicrophoneStatus: async () => false,
    getSystemMetrics: async () => ({ cpu: 14, ramUsed: 7.8, ramTotal: 16 }),
    controlSystemMedia: (cmd) => console.log('Mock media command:', cmd),
    openExternal: (url) => window.open(url, '_blank'),
    launchApp: (name) => console.log('Mock launch app:', name),
    buildAppCache: async () => [],
    searchApps: async () => [],
    getDisplays: async () => [{ id: 1, primary: true, bounds: { x: 0, y: 0, width: 1920, height: 1080 } }],
    setDisplay: () => {},
    updateWindowPosition: () => {},
    setAutoLaunch: () => {},
    getClipboardText: async () => 'Quick Pill clipboard preview',
    writeClipboardText: () => {},
    clearClipboard: () => {},
    controlSystemVolume: () => {},
    focusWindow: () => {},
    logMessage: (level, msg) => console.log(`[App Log - ${level}]`, msg),
    getNotifications: async () => [],
    dismissNotification: () => {},
    focusNotificationApp: () => {},
    onKeyLockChange: () => () => {},
    onUSBChange: () => () => {},
    checkForUpdates: async () => ({ updateAvailable: false }),
    startUpdateDownload: () => {},
    cancelUpdateDownload: () => {},
    installUpdate: () => {},
    getAppVersion: async () => '5.3.0',
    onUpdateEvent: () => () => {},
    platform: 'win32'
  };
}

const App = () => {
  const isBrowser = typeof window !== 'undefined' && !navigator.userAgent.includes('Electron');

  return (
    <>
      <Island />
      {isBrowser && (
        <div
          style={{
            position: 'fixed',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(20, 20, 22, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(12px)',
            borderRadius: 12,
            padding: '8px 16px',
            fontSize: 12,
            color: 'rgba(255, 255, 255, 0.75)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            pointerEvents: 'none',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#30D158' }} />
          <span><b>Browser Preview Active</b> — For full Windows overlay & native system controls, view the Electron app on your screen.</span>
        </div>
      )}
    </>
  );
};

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
