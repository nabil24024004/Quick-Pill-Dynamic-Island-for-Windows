# CLAUDE.md - Quick Pill Developer & AI Guide

Welcome to the **Quick Pill** project codebase! This file serves as the reference for AI assistants and developers working on Quick Pill.

---

## 📌 Project Overview

**Quick Pill** is a native Windows desktop application that brings an Apple Dynamic Island experience to **Windows 10 & 11**. It floats above all desktop windows with minimal memory overhead, offering notifications, per-app WASAPI audio mixing, media playback control, a persistent drag-and-drop file shelf, prayer times, quick notes, an app launcher, and customizable widgets.

- **Product Name**: Quick Pill
- **Current Version**: 6.0.0
- **Architecture**: Tauri v2 + Rust native backend + Edge WebView2 (React 19)
- **License**: MIT
- **Author**: Abrar Nabil / NeoSparkX

---

## 🛠️ Technology Stack

| Layer | Technology / Library | Description |
| :--- | :--- | :--- |
| **Desktop Framework** | [Tauri v2](https://v2.tauri.app/) & [Rust](https://www.rust-lang.org/) | Native desktop host, tray icon, global shortcuts, Edge WebView2 |
| **Windows Native APIs** | `windows` crate (Win32 / WinRT / WASAPI) | Topmost overlay bounds, SMTC media controls, live toasts, UWP discovery, WASAPI audio mixer |
| **Frontend Library** | [React 19](https://react.dev/) & [Vite 5](https://vitejs.dev/) | UI components, state hooks, and fast HMR bundling |
| **Animations** | [Framer Motion 12](https://www.framer.com/motion/) | Tuned spring physics (`stiffness: 340, damping: 28, mass: 0.8`) and layout transitions |
| **Icons** | [Lucide React](https://lucide.dev/) | Modern SVG icon set |
| **Styling** | Vanilla CSS (`src/App.css`) | Themes, notch geometry, dark glassmorphism, animations |

---

## 📁 Repository Structure

```
Quick pill/
├── .github/workflows/       # GitHub Actions CI/CD (Windows x64 Tauri v2 + NSIS + signing)
├── assets/                  # Logos, icons, and README media assets
├── scripts/
│   ├── build-msix.ps1       # Packages release binary into Microsoft Store MSIX bundle
│   ├── generate-manifest.js # Computes SHA-256, byte size & Store links -> web app/public/version.json
│   └── sign-windows.ps1     # Authenticode signing hook (PFX, Cert Store, Azure Trusted Signing)
├── src/                     # React frontend
│   ├── components/          # Feature tabs & widgets (Launcher, Notes, Shelf, Prayer, AudioMixer...)
│   ├── tauriBridge.js       # Maps Tauri invoke/events -> window.electronAPI for seamless UI compat
│   ├── App.css              # Global styles & themes
│   ├── App.jsx              # Root React entrypoint + ErrorBoundary
│   └── Island.jsx           # Main Island container, mode transitions, shortcuts, & Settings UI
├── src-tauri/               # Native Rust backend & Tauri v2 bundle config
│   ├── capabilities/        # Tauri v2 window/command capability permissions
│   ├── icons/               # App & NSIS installer icons
│   ├── msix/                # Store manifest template, Visual Assets & store.config.json
│   ├── src/                 # lib.rs, state.rs, window_overlay.rs, audio_mixer.rs, launcher.rs,
│   │                        # media.rs, notes.rs, notifications.rs, prayer.rs, shelf.rs,
│   │                        # shortcuts.rs, system_stats.rs, updater.rs
│   ├── Cargo.toml           # Rust package & dependencies
│   └── tauri.conf.json      # Tauri v2 window config, bundle metadata, & NSIS/signing config
├── web app/                 # Official landing page & download portal (quickpill.neosparkx.com)
├── package.json             # Frontend dependencies & scripts
└── vite.config.mjs          # Vite configuration for React frontend
```

---

## 🖥️ Island Display Modes

- **Still Mode (Idle)**: Minimalist capsule resting flush at top screen edge (`top: 0px` default), flat top corners, rounded bottom corners (`20px`).
- **Quick Mode (Hover)**: Compact glanceable bar showing time, weather, battery, camera/mic privacy indicators, and media preview.
- **Large Mode (Active)**: Expanded interactive workspace triggered on click or global `Alt + Key` shortcuts.
- **Ctrl Click-Through**: Holding `Ctrl` while hovering dynamically enables `WS_EX_TRANSPARENT` click-through passthrough at the Win32 level (`window_overlay.rs`).
- **Stealth / Standby Modes**: Optional transparency-when-idle or always-visible Quick Mode metrics.

---

## 💻 Commands & Development Workflows

### Prerequisites
- **Node.js**: v18+ and `npm`
- **Rust**: `stable` toolchain via `rustup` + Visual Studio C++ Build Tools
- **Windows**: Windows 10 or 11 (x64) with Microsoft Edge WebView2 Runtime

### Command Reference

```bash
# Install JS dependencies
npm install

# Run Rust unit tests
npm test

# Start Vite dev server + Tauri v2 window with HMR
npm start

# Build frontend only
npm run build:frontend

# Build release binary + NSIS installer (with optional signing hook)
npm run build

# Build Microsoft Store MSIX package (src-tauri/target/release/bundle/msix/)
npm run build:msix

# Generate web app/public/version.json manifest with real SHA-256, byte size & Store URL
npm run generate-manifest
```

> Release NSIS installers live in `src-tauri/target/release/bundle/nsis/` and Store MSIX bundles in `src-tauri/target/release/bundle/msix/`.

---

## 🔌 Architecture & Bridge (`src/tauriBridge.js` ↔ `src-tauri/src/`)

- `src/tauriBridge.js` exposes `window.electronAPI` and translates calls to Tauri v2 `invoke(...)` commands and `listen(...)` event channels while preserving all frontend component contracts.
- **Overlay & Display**: `window_overlay.rs` manages Win32 `HWND` extended styles (`WS_EX_LAYERED`, `WS_EX_TRANSPARENT`), monitor bounds reporting (`{ left, top, right, bottom }`), `Ctrl` hover polling, drag-drop, and auto-launch (switches automatically between WinRT `StartupTask` inside Microsoft Store MSIX packages and `HKCU\...\Run` on standalone NSIS installs).
- **Global Shortcuts**: `shortcuts.rs` registers system-wide `Alt + <Key>` tab shortcuts via `tauri-plugin-global-shortcut` with Settings persistence.
- **Auto-Updater & Store Dual-Mode**: `state::is_store_packaged()` detects MSIX package identity at runtime via `GetCurrentPackageFullName`. In standalone `.exe` builds, `updater.rs` fetches `https://quickpill.neosparkx.com/version.json`, streams downloads to `%TEMP%\QuickPill-Updates`, verifies SHA-256 checksums, classifies Windows Smart App Control / Device Guard blocks (`4551` / `1260`), and launches silent `/S` NSIS upgrades. In Microsoft Store builds, external `.exe` self-updating is disabled (`store-managed`) for Store Policy 10.2 compliance. `scripts/sign-windows.ps1` hooks into Tauri's `bundle.windows.signCommand`.

---

## 📐 Coding Conventions & Guidelines

1. **Tauri Capability Least-Privilege**: Keep `src-tauri/capabilities/default.json` scoped to needed permissions and validate inputs in Rust commands.
2. **Thread & Startup Safety**: Never run slow blocking filesystem/Win32 scans synchronously in Tauri `setup()` before window creation; initialize heavy catalogs asynchronously (`launcher::init_launcher`).
3. **Mouse Passthrough**: Keep Win32 `ignore_mouse` state synchronized cleanly between `window_overlay.rs` and `Island.jsx` hover handlers.
4. **Installer Signing & Manifests**: Run `npm run generate-manifest` after every signed release build so `version.json`, `useReleaseInfo.js`, and `RELEASE_NOTES.md` match the distributed `.exe`.
