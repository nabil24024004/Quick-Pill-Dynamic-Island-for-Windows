# CLAUDE.md - Quick Pill Developer & AI Guide

Welcome to the **Quick Pill** project codebase! This file serves as the definitive reference for AI assistants and developers working on Quick Pill.

---

## 📌 Project Overview

**Quick Pill** is a desktop application that recreates Apple's Dynamic Island experience on **Windows 10 & 11**. It acts as a non-intrusive notification hub, system monitor, media controller, and customizable widget panel that expands on hover or click while floating seamlessly above all desktop windows.

- **Product Name**: Quick Pill
- **Current Version**: 5.5.1
- **License**: MIT
- **Author**: Abrar Nabil

---

## 🛠️ Technology Stack

| Layer | Technology / Library | Description |
| :--- | :--- | :--- |
| **Desktop Framework** | [Electron 38+](https://www.electronjs.org/) | Windows desktop runtime |
| **Build & Tooling** | [Electron Forge 7+](https://www.electronforge.io/) & [Vite 5+](https://vitejs.dev/) | HMR development, bundling, and distribution packaging |
| **Frontend Library** | [React 19](https://react.dev/) | Component-based UI library |
| **Animations** | [Framer Motion 12](https://www.framer.com/motion/) | Smooth UI physics, layout transitions, and mode expansions |
| **Icons** | [Lucide React](https://lucide.dev/) | Modern SVG icon set |
| **Styling** | Vanilla CSS (`src/App.css`) | Custom animations, themes, dark glassmorphism, responsive metrics |
| **OS Integration** | PowerShell / Win32 / WinRT | Native media control, hardware stats, app discovery, camera/mic status |

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
├── forge.config.js          # Electron Forge packaging, makers (Squirrel, ZIP), fuses & post-hooks
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
   - Minimalist, non-distracting resting state (width: ~170px, height: 40px).
   - Positioned flush against top screen bezel (`top: 0px` default) with flat top corners (`radius: 0`), concave notch ear fillets, and rounded bottom corners (`20px`).
2. **Quick Mode (Hover)**:
   - Compact status preview on hover when configured.
   - Shows current time, live weather, battery level, camera/mic active status, and music "Now Playing" preview with hover-activated media controls.
3. **Large Mode (Active Hover / NotchNook Compact Style)**:
   - Full interactive dashboard accessed on hover / click.
   - Dynamic Island / MacBook Notch geometry: flush to top bezel (`top: 0px`), flat top corners (`borderTopLeftRadius: 0`, `borderTopRightRadius: 0`), smooth concave fillet notch ears merging with the bezel, and rounded bottom corners (`26px`).
   - **Horizontal Compact Expansion**: Spreads sideways horizontally (`width: 520px`, or `540px` for settings) with a unified, compact height of `135px` across all tabs rather than jumping up in height vertically.
   - **Horizontal Widget Layouts**: All tabs (Now Playing side-by-side album art card & scrubber, Weather 3D icon & 3-day forecast, Calendar mini-grid & date card, System performance gauges, Tasks, and Timer setup/countdown) are designed horizontally to fit within the sleek 135px height.
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

- **Dynamic Pill Shape**: MacBook-inspired Dynamic Island notch geometry (flat top edge with `borderTopLeftRadius: 0` and `borderTopRightRadius: 0`, and smooth curved bottom corners with `borderBottomLeftRadius`/`borderBottomRightRadius`: 20 in Still/Quick mode, expanding to 32 in Large mode, resting flush at `top: 0px` by default).
- **Spring Physics**: Framer Motion tuned spring transitions (`stiffness: 340, damping: 28, mass: 0.8`) ensuring frame-accurate morphing without snap artifacts.
- **Drop Shadows**: Animated `boxShadow` (`0 8px 24px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.18)`) across hovered and unhovered states.

---

## 💻 Commands & Development Workflows

### Prerequisites
- **Node.js**: v16+ and `npm`
- **Build Tools**:
  - Windows: Visual Studio C++ Build Tools

### Command Reference

```bash
# Install dependencies
npm install

# Start local development server (Electron Forge + Vite HMR)
npm start

# Package application into binaries (without building installers)
npm run package

# Build production installers for Windows
npm run make
```

### Windows Packaging

To compile production release binaries for Windows (x64):

```bash
# Windows (x64 Installer & ZIP)
npm run make -- --platform=win32 --arch=x64
```

> Output build artifacts are compiled to `out/make/` and renamed according to versioning rules defined in `forge.config.js` (`postMake` hook).

---

## 🔌 Architecture & Inter-Process Communication (IPC)

### Renderer (`src/Island.jsx`) ↔ Preload (`src/preload.js`) ↔ Main (`src/main.js`)

All interactions with native operating system APIs execute asynchronously via Electron IPC:

- `electronAPI.setIgnoreMouseEvents(ignore, forward)`: Toggles mouse passthrough so clicks pass through empty transparent areas while catching mouse events over active Island controls.
- `electronAPI.getSystemMedia()` / `controlSystemMedia(cmd)`: Fetches metadata (title, artist, artwork) and controls playback via PowerShell / WinRT on Windows.
- `electronAPI.getSystemMetrics()`: Retrieves CPU load percentage and RAM usage via PowerShell WMI (`Win32_Processor`, `Win32_OperatingSystem`).
- `electronAPI.getBluetoothStatus()`, `getCameraStatus()`, `getMicrophoneStatus()`: Queries Windows registry and hardware status indicators.
- `electronAPI.searchApps(query)` / `launchApp(name)`: Discovers installed Start Menu / UWP apps on Windows and launches applications.
- `electronAPI.getDisplays()` / `setDisplay(id)`: Controls multi-monitor placement and bounds alignment.
- `electronAPI.setAutoLaunch(enable)`: Configures OS startup registry entries (`app.setLoginItemSettings`).
- `electronAPI.checkForUpdates()`: Checks remote `version.json` for new releases.
- `electronAPI.startUpdateDownload()` / `cancelUpdateDownload()`: Streams release binary download with progress tracking.
- `electronAPI.installUpdate()`: Executes NSIS setup (`/S` silent upgrade) and restarts app cleanly.
- `electronAPI.onUpdateEvent(callback)`: Real-time listener for update lifecycle (`checking`, `available`, `download-progress`, `downloaded`, `error`).

---

## 🔄 Auto-Update & Distribution Architecture

1. **Manifest File (`version.json`)**:
   - Hosted at `https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/version.json` and in `web app/public/version.json`.
   - Contains release version, changelog, download URLs, and SHA-256 hashes for Windows (`nsis`).
2. **Update Engine (`src/updater.js`)**:
   - Runs in Electron Main process (`main.js`).
   - Automatically checks for updates 4s after startup (if auto-check enabled).
   - Performs semver comparisons, streams downloads to temp directory, verifies checksums, and launches silent NSIS upgrade.
3. **Manifest Generator (`scripts/generate-manifest.js`)**:
   - `npm run update:manifest`: Inspects compiled release binaries in `dist/` or `out/make/`, computes SHA-256 checksums, and outputs updated `version.json`.

## 📐 Coding Conventions & Guidelines

1. **Safety & Electron Security**:
   - Keep `contextBridge` isolated in [preload.js](file:///d:/Ripple%20Island/src/preload.js). Do NOT enable `nodeIntegration` in BrowserWindow `webPreferences`.
   - Sanitize all string inputs passed to PowerShell / shell execution to prevent command execution escaping.
2. **Windows Platform Targeting**:
   - Application targets Windows 10 and 11 environments.
3. **State Persistence**:
   - User settings (theme, background color, tab ordering, location, default tab, active display) are persisted in `localStorage`.
   - When introducing new user preferences, provide default fallbacks using nullish coalescing or logical OR.
4. **Styling & Animation**:
   - Keep styles centralized in [App.css](file:///d:/Ripple%20Island/src/App.css).
   - Use Framer Motion (`<motion.div>`) for layout state transitions between Still, Quick, and Large modes.
5. **Mouse Passthrough Management**:
   - Ensure hover listeners accurately notify `electronAPI.setIgnoreMouseEvents` so the window non-interactive area remains click-through without blocking desktop interaction.

# 2. TARGET GEOMETRY & VISUAL DESIGN ("TOP-FLUSH NOTCH")
Transform the floating pill into a **Top-Flush Bezel Notch** docked at the exact top-center of the primary display (`top: 0px`, `margin-top: 0px`):

- **Color & Shape:** Pure pitch black (`#000000`) background to blend seamlessly into the physical monitor bezel.
- **Inverted Top Corners ("Notch Ears"):** Create smooth concave outer curves (`10px–12px` radius using SVG masks or pseudo-elements) at the top-left and top-right edges where the notch meets the top edge of the screen (`y = 0`), paired with smooth convex bottom corners (`border-bottom-left-radius: 22px`, `border-bottom-right-radius: 22px`).
- **Four Strict Window/Container Size States:**
  1. **Micro-Strip State (Retracted / Obstructed / Minimal Idle):** `width: 96px`, `height: 5px` flush at `top: 0px`.
  2. **Normal Idle State (Closed):** `width: 130px`, `height: 28px` flush at `top: 0px`.
     - **Left:** Mini circular progress ring (`#22c55e` green) or active status icon.
     - **Center:** Crisp current time (`HH:mm`, `12px` semi-bold white).
     - **Right:** Mini animated audio waveform bars.
     - **Mascot Idle Option:** When no media or timer is active and "Mascot Mode" is enabled, display a pair of cute minimalist blinking eyes inside the idle notch.
  3. **System HUD Toast State (Pop-up Notification):** `width: 280px`, `height: 46px` for `2000ms` on system events:
     - **Caps Lock Toggle:** Icon on the left + `"Caps Lock"` label, `"On"` or `"Off"` status on the right.
     - **Bluetooth / Audio Device Connected:** Device icon + name (e.g., `"Baseus Encok WM01"`) + `"Connected - 80%"` subtext, and headphone icon on the right.
     - **Battery / Charging / Volume HUD:** Compact single-row indicator.
  4. **Expanded Card State:** Strictly capped at `width: 350px`, `height: 118px` (maximum `125px`). Never allow any module to expand into a tall vertical window.

- **Spring Animation Physics:**
  - Morph smoothly between all 4 states using spring-like interpolation (`transition: width 220ms cubic-bezier(0.22, 1, 0.36, 1), height 220ms cubic-bezier(0.22, 1, 0.36, 1), transform 220ms cubic-bezier(0.22, 1, 0.36, 1)`).
  - Ensure click-through transparency outside the visible black notch shape (pixel-level hit-testing or dynamic window region resizing so transparent bounding boxes never block mouse clicks on underlying apps).

---

# 3. UNIFIED EXPANDED NOTCH LAYOUT & CURATED MODULES
Inside the **Expanded State (`350px × 118px`)**, enforce a consistent shell across all tabs:

- **Top Segmented Progress/Pagination Bar:** Subtle thin horizontal indicator segments at the very top edge showing the total number of tabs and the currently active tab.
- **Unified Header Row (`height: 24px`):**
  - **Left:** Active module title in bold (`11px`, e.g., `Pomodoro`, `Water Reminder`, `Shelf`, `ToDoList`).
  - **Center:** Dark pill badge containing a green status dot (`#22c55e`) + formatted date and time (`Sat 17 Oct 2026 19:25`).
  - **Right:** Mini audio waveform or battery indicator.
- **Left & Right Edge Navigation:** Subtle `<` and `>` icon buttons vertically centered on the left and right edges of the card, plus mouse wheel horizontal/vertical scroll support to cycle through tabs seamlessly.

### Curated Core Modules (Fit strictly inside the `350px × 118px` card):
1. **Music & Synced Lyrics:**
   - **Standard View:** Left rounded album art (`48px × 48px`), track title + artist name, elapsed/remaining time (`01:04` / `-01:39`) with a sleek progress scrubber, and bottom playback controls (`Lyrics toggle`, `Prev`, `Play/Pause`, `Next`).
   - **Synced Lyrics Split View:** Clicking the lyrics icon shifts the compact album/title info to the left column and reveals real-time auto-scrolling synced lyrics on the right column with the active line highlighted in bright white and upcoming lines dimmed.
2. **Pomodoro / Focus Timer:**
   - **Left:** Circular countdown ring with timer icon.
   - **Center/Right:** Large countdown readout (`25:00`), `Focus Time` subtitle, and compact pill buttons below: `Short Break`, `Play/Pause` (accent red/orange button), and `Focus Time` / `Reset`.
3. **Water Reminder:**
   - **Left:** Daily intake readout (`1.0 / 1.5 L`), progress bar (`Today: 66%`), `+ Drink` primary button, and `Settings` button.
   - **Right:** Compact hourly hydration bar chart or circular percentage gauge (`66%`).
4. **File Shelf (Temporary Drag-and-Drop Stash):**
   - **Auto-Expand on Drag:** When the user drags a file from Windows Explorer near the top-center of the screen, automatically expand the notch to the `Shelf` module.
   - **Empty/Drag State:** Dashed rounded border box with download/tray icon and `"Drop files here / Release to add"`.
   - **Populated State:** Horizontal scrollable row of file/folder thumbnails with file names, sizes, individual remove (`×`) buttons, and a top-left `Clear` button. Users can drag files back out into any app.
5. **To-Do List (Quick Tasks):**
   - **Left Column:** Large task completion ratio (`1/3 Task Done Today`) with compact `+ Add Task` and `Edit Task` buttons.
   - **Right Column:** Compact scrollable list of tasks with green checkable radio/checkboxes and strike-through styling for completed items.
6. **Existing Utility Modules (Launcher / Audio Mixer / Notes / Search):**
   - Refactor existing Quick Pill modules you wish to keep into this exact `350px × 118px` compact two-column card constraint (maximum 3 visible rows with smooth internal scrolling). Move full Settings to a standalone window launched from the System Tray menu instead of bloating the notch cycle.