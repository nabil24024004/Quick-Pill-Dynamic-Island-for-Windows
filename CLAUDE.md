# CLAUDE.md - Quick Pill Developer & AI Guide

Welcome to the **Quick Pill** project codebase! This file serves as the definitive reference for AI assistants and developers working on Quick Pill.

---

## 📌 Project Overview

**Quick Pill** is a cross-platform desktop application that recreates Apple's Dynamic Island experience on **Windows**. It acts as a non-intrusive notification hub, system monitor, media controller, and customizable widget panel that expands on hover or click while floating seamlessly above all desktop windows.

- **Product Name**: Quick Pill
- **Current Version**: 5.0.0
- **License**: MIT
- **Author**: Abrar Nabil

---

## 🛠️ Technology Stack

| Layer | Technology / Library | Description |
| :--- | :--- | :--- |
| **Desktop Framework** | [Electron 38+](https://www.electronjs.org/) | Cross-platform desktop runtime |
| **Build & Tooling** | [Electron Forge 7+](https://www.electronforge.io/) & [Vite 5+](https://vitejs.dev/) | HMR development, bundling, and distribution packaging |
| **Frontend Library** | [React 19](https://react.dev/) | Component-based UI library |
| **Animations** | [Framer Motion 12](https://www.framer.com/motion/) | Smooth UI physics, layout transitions, and mode expansions |
| **Icons** | [Lucide React](https://lucide.dev/) | Modern SVG icon set |
| **Styling** | Vanilla CSS (`src/App.css`) | Custom animations, themes, dark glassmorphism, responsive metrics |
| **OS Integration** | PowerShell (Win32) | Native media control, hardware stats, app discovery, camera/mic status |

---

## 📁 Repository Structure

```
Ripple Island/
├── .github/                 # GitHub workflows & CI/CD configs
├── src/                     # Core application source code
│   ├── assets/              # App icons and media assets
│   │   └── icons/           # App icons (.ico, .png, etc.)
│   ├── components/          # Reusable UI components (if modularized)
│   ├── App.css              # Global styles, themes, and animations
│   ├── App.jsx              # React root entry point
│   ├── Island.jsx           # Main Island interface, state & tabs logic (~2700+ lines)
│   ├── main.js              # Electron main process (OS integrations, IPC handlers, window setup)
│   └── preload.js           # Secure contextBridge exposing electronAPI to renderer
├── update/                  # Native extension scripts / hooks (e.g. WH C++ hooks)
├── entitlements.plist       # macOS code signing entitlements
├── forge.config.js          # Electron Forge packaging, makers (WiX, DMG, DEB, RPM, ZIP), fuses & post-hooks
├── index.html               # Main HTML entry document for Vite renderer
├── package.json             # Dependencies, scripts, and permissions
├── vite.main.config.mjs     # Vite configuration for Electron Main process
├── vite.preload.config.mjs  # Vite configuration for Electron Preload script
└── vite.renderer.config.mjs # Vite configuration for React Renderer process
```

---

## 🖥️ Island Display Modes

The Island interface operates across **3 primary modes** and **2 optional toggle modes**:

1. **Still Mode (Idle)**:
   - Minimalist, non-distracting resting state (width: ~170px).
   - Floats at top center of screen (configurable position/display).
2. **Quick Mode (Hover)**:
   - Expands on mouse hover.
   - Shows current time, live weather, battery level, camera/mic active status, and music "Now Playing" preview with hover-activated media controls.
3. **Large Mode (Active Click)**:
   - Full interface accessed by clicking the Island.
   - Displays interactive Tab widgets with keyboard (`Ctrl + [Num]`, Arrow Keys) and mouse wheel navigation.
4. **Stealth Mode (Optional Setting)**:
   - Makes the Island completely transparent when idle to maximize screen real estate.
5. **Standby Mode (Optional Setting)**:
   - Keeps Quick View metrics (time, weather, battery) permanently displayed instead of collapsing to Still Mode.

---

## 🧩 Feature Tabs (0 to 10)

Quick Pill includes **feature tabs** managed in [Island.jsx](file:///d:/Ripple%20Island/src/Island.jsx):

| Tab ID | Tab Name | Functionality & Recent Enhancements |
| :-: | :--- | :--- |
| `0` | **Browser Search** | Instant web search input bar with URL auto-launching |
| `1` | **Workflows & QA** | Quick Apps launcher (up to 4 configurable apps) and workflow URL shortcuts |
| `2` | **Overview** | Detailed daily weather preview, location settings, and date header |
| `3` | **Now Playing** | Active media status, album art display, track playback controls (Spotify / Apple Music / Windows Media) with cleaned UWP app titles and un-cropped title text |
| `4` | **Calendar** | Full monthly interactive calendar view with date highlighting and compact zero-margin 188px layout |
| `5` | **Notifications** | Live feed of system alerts, battery notifications, and device updates |
| `6` | **Game / Stats** | Real-time CPU and RAM hardware utilization counters |
| `7` | **Clipboard** | History manager for copied text snippets |
| `8` | **Tasks** | Apple / Things 3 minimalist task manager with circular check controls, capsule input bar, and local persistence |
| `9` | **Settings** | Full customization suite (Themes, Custom RGB Colors, Background Wallpaper, Multi-monitor selection, Positioning, Auto-launch on boot, Battery Alerts, Stealth/Standby modes, Tab Reordering & Hiding) |
| `10` | **Timer** | Preset timer chips (15m, 30m, 60m, 100m) and custom time picker with start controls |

---

## 🎨 UI Physics & Design System

- **Dynamic Pill Shape**: Semicircular stadium pill geometry (`borderRadius: 20` for 40px height in Still mode, expanding smoothly to `32` in Large mode).
- **Spring Physics**: Framer Motion tuned spring transitions (`stiffness: 340, damping: 28, mass: 0.8`) ensuring frame-accurate morphing without snap artifacts.
- **Drop Shadows**: Animated `boxShadow` (`0 8px 24px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.18)`) across hovered and unhovered states.

---

## 💻 Commands & Development Workflows

### Prerequisites
- **Node.js**: v16+ and `npm`
- **Build Tools**:
  - Windows: Visual Studio C++ Build Tools
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Linux: `build-essential`, `dpkg`, `fakeroot`, `rpm`

### Command Reference

```bash
# Install dependencies
npm install

# Start local development server (Electron Forge + Vite HMR)
npm start

# Package application into binaries (without building installers)
npm run package

# Build production installers for current platform
npm run make
```

### Multi-Platform Cross-Packaging

To compile production release binaries for targeted operating systems and architectures:

```bash
# Windows (x64 Installer / WiX MSI & ZIP)
npm run make -- --platform=win32 --arch=x64

# Linux (x64 .deb & .rpm)
npm run make -- --platform=linux --arch=x64

# macOS (Apple Silicon arm64 .dmg)
npm run make -- --platform=darwin --arch=arm64

# macOS (Intel x64 .dmg)
npm run make -- --platform=darwin --arch=x64
```

> Output build artifacts are compiled to `out/make/` and renamed according to versioning rules defined in `forge.config.js` (`postMake` hook).

---

## 🔌 Architecture & Inter-Process Communication (IPC)

### Renderer (`src/Island.jsx`) ↔ Preload (`src/preload.js`) ↔ Main (`src/main.js`)

All interactions with native operating system APIs execute asynchronously via Electron IPC:

- `electronAPI.setIgnoreMouseEvents(ignore, forward)`: Toggles mouse passthrough so clicks pass through empty transparent areas while catching mouse events over active Island controls.
- `electronAPI.getSystemMedia()` / `controlSystemMedia(cmd)`: Fetches metadata (title, artist, artwork) and controls playback via AppleScript on macOS, PowerShell/WinRT on Windows, or `playerctl` on Linux.
- `electronAPI.getSystemMetrics()`: Retrieves CPU load percentage and RAM usage via PowerShell WMI (`Win32_Processor`, `Win32_OperatingSystem`).
- `electronAPI.getBluetoothStatus()`, `getCameraStatus()`, `getMicrophoneStatus()`: Queries OS hardware status indicators.
- `electronAPI.searchApps(query)` / `launchApp(name)`: Discovers installed Start Menu / UWP apps on Windows and launches applications.
- `electronAPI.getDisplays()` / `setDisplay(id)`: Controls multi-monitor placement and bounds alignment.
- `electronAPI.setAutoLaunch(enable)`: Configures OS startup registry entries (Windows) or `.config/autostart` desktop files (Linux).
- `electronAPI.checkForUpdates()`: Checks remote `version.json` for new releases.
- `electronAPI.startUpdateDownload()` / `cancelUpdateDownload()`: Streams release binary download with progress tracking.
- `electronAPI.installUpdate()`: Executes NSIS setup (`/S` silent upgrade) and restarts app cleanly.
- `electronAPI.onUpdateEvent(callback)`: Real-time listener for update lifecycle (`checking`, `available`, `download-progress`, `downloaded`, `error`).

---

## 🔄 Auto-Update & Distribution Architecture

1. **Manifest File (`version.json`)**:
   - Hosted at `https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/version.json` and in `web app/public/version.json`.
   - Contains release version, changelog, download URLs, and SHA-256 hashes for Windows (`nsis`), macOS (`dmg`), and Linux (`deb`).
2. **Update Engine (`src/updater.js`)**:
   - Runs in Electron Main process (`main.js`).
   - Automatically checks for updates 4s after startup (if auto-check enabled).
   - Performs semver comparisons, streams downloads to temp directory, verifies checksums, and launches silent NSIS upgrade.
3. **Manifest Generator (`scripts/generate-manifest.js`)**:
   - `npm run update:manifest`: Inspects compiled release binaries in `dist/` or `out/make/`, computes SHA-256 checksums, and outputs updated `version.json`.

## 📐 Coding Conventions & Guidelines

1. **Safety & Electron Security**:
   - Keep `contextBridge` isolated in [preload.js](file:///d:/Ripple%20Island/src/preload.js). Do NOT enable `nodeIntegration` in BrowserWindow `webPreferences`.
   - Sanitize all string inputs passed to OS shells (PowerShell, `osascript`, `exec`) to prevent command execution escaping.
2. **Cross-Platform Compatibility**:
   - Always check platform guards: `process.platform === 'win32'`, `'darwin'`, or `'linux'` in `main.js`.
   - Use `window.electronAPI.platform` inside React renderer components when rendering platform-specific UI elements.
3. **State Persistence**:
   - User settings (theme, background color, tab ordering, location, default tab, active display) are persisted in `localStorage`.
   - When introducing new user preferences, provide default fallbacks using nullish coalescing or logical OR.
4. **Styling & Animation**:
   - Keep styles centralized in [App.css](file:///d:/Ripple%20Island/src/App.css).
   - Use Framer Motion (`<motion.div>`) for layout state transitions between Still, Quick, and Large modes.
5. **Mouse Passthrough Management**:
   - Ensure hover listeners accurately notify `electronAPI.setIgnoreMouseEvents` so the window non-interactive area remains click-through without blocking desktop interaction.
