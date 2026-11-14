# Quick Pill v6.0.0 — Release Notes

> **Release Date:** November 14, 2026  
> **Target OS:** Windows 10 & 11 (64-bit)  
> **Microsoft Store ID:** `9N371MQB4BS7` ([Store Listing](https://apps.microsoft.com/detail/9N371MQB4BS7?mode=direct))  
> **NSIS Installer:** `QuickPill-Windows-v6.0.0-Setup.exe` *(NSIS bundle output: `Quick Pill_6.0.0_x64-setup.exe`)*  
> **Download Link:** [Download Setup (v6.0.0)](https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Windows-v6.0.0-Setup.exe)  
> **Official Web App:** [quickpill.neosparkx.com](https://quickpill.neosparkx.com/) · [Privacy Policy](https://quickpill.neosparkx.com/#/privacy)

---

## 🌟 Highlights & Major Improvements

### 1. 🦀 Native Rust + Tauri v2 Rewrite
* **Lightweight Runtime:** Replaced Electron with a native Rust backend and Microsoft Edge WebView2 frontend while preserving the exact React 19 UI, animations, and 16+ tab layout.
* **Dramatically Smaller Installer:** Installer size drops from `135,202,987 bytes` (`~128.9 MiB` in v5.6.1) down to **`4,124,348 bytes` (`3.93 MiB`)** for the NSIS setup (`.exe`).
* **Instant Asynchronous Startup:** Backgrounded app catalog indexing (`launcher::init_launcher`) so the overlay window appears immediately on launch without blocking UI responsiveness.

### 2. ⚡ Direct Win32, WinRT & WASAPI Integrations
* **Overlay & Click-Through Engine:** `window_overlay.rs` directly manages Win32 `WS_EX_LAYERED` / `WS_EX_TRANSPARENT` click-through passthrough when holding `Ctrl`, topmost positioning, display bounds, and tray interactions.
* **Zero-Shell Native APIs:** Native Rust WinRT bindings power System Media Transport Controls (SMTC), Windows notification listeners, and UWP app discovery; native WASAPI powers per-app Audio Mixer metering and controls.
* **Global `Alt + <Key>` Shortcuts:** Registered natively via `tauri-plugin-global-shortcut` with Settings persistence.

### 3. 🔐 Microsoft Store MSIX, Code Signing & Smart App Control Protection
* **Microsoft Store Dual-Mode Package (`QuickPill_6.0.0_x64.msix`):** Added `src-tauri/msix/` and `scripts/build-msix.ps1` targeting `NeoSparkX.QuickPill` (`9N371MQB4BS7`). At runtime, `state::is_store_packaged()` checks `GetCurrentPackageFullName` so Store installs manage auto-launch via WinRT `StartupTask` and rely strictly on Microsoft Store updates (Policy 10.2 compliant), eliminating Smart App Control warnings.
* **Windows Code-Signing Hook (`scripts/sign-windows.ps1`):** Integrated Tauri `bundle.windows.signCommand` (`sha256` + RFC 3161 timestamping) supporting PFX secrets, Windows Certificate Store thumbprints, and Azure Trusted Signing across app binaries, NSIS plugins, uninstaller, and final setup executable.
* **Auto-Updater Contract Sync & SAC Error Handling:** Aligned Rust `updater.rs` event names/payloads with Settings UI (`Island.jsx`), added cancellation/progress telemetry sync, and added Windows Smart App Control / Device Guard (`4551` / `1260`) launch error detection so blocked direct `.exe` auto-updates keep the app open and surface a clear browser download prompt instead of failing silently.

---

## 🛠️ Detailed Changelog & Verification

| Area | Type | Description |
| :--- | :---: | :--- |
| **Runtime** | `Feat` | Full migration from Electron 38 to Tauri v2 + Rust native backend with Edge WebView2. |
| **Installer & Store** | `Perf` | NSIS setup shrunk to `4,124,348 bytes` (`3.93 MiB`); added Store MSIX package (`5,580,488 bytes`, `9N371MQB4BS7`). |
| **Signing & CI** | `Build` | Added `scripts/sign-windows.ps1`, `scripts/build-msix.ps1`, Tauri `bundle.windows.signCommand`, and GitHub Actions CI (`windows-latest` + Rust cache + `.exe`/`.msix` staging). |
| **Auto-Updater** | `Fix` | Aligned `updater.rs` events/payloads with `Island.jsx`, added `store-managed` compliance for MSIX, and handled Windows Smart App Control policy blocks (`4551` / `1260`). |
| **Repo Cleanup** | `Chore` | Removed legacy Electron stubs, C++ hook experiments, JS test scripts, runtime root JSON caches, and obsolete agent notes. |
| **Tests** | `Tests` | Native Rust unit test suite (`cargo test`): `14 passed, 0 failed`. |

---

## 🔒 Verification & Checksums

| Property | NSIS Setup (`.exe`) | Microsoft Store Package (`.msix`) |
| :--- | :--- | :--- |
| **Distribution File** | `QuickPill-Windows-v6.0.0-Setup.exe` | `QuickPill_6.0.0_x64.msix` |
| **Architecture** | Windows x64 (10 / 11) | Windows x64 (10 / 11 Desktop) |
| **File Size** | `4,124,348 bytes` (`3.93 MiB`) | `5,580,488 bytes` (`5.32 MiB`) |
| **SHA-256 Hash** | `6c7a3216fe125efd42ad28b4301829387f19f98a60f1b9fccec79408fa950366` | `a2dabcc9031fd84a3e4a755fc157a9a3195e11333a0fc2c139cfecfff325f484` |
| **Test Suite** | `14 passed, 0 failed` (`cargo test --manifest-path src-tauri/Cargo.toml`) | `14 passed, 0 failed` |

---

## 📥 Installation & Upgrade

1. **Microsoft Store (Recommended — Smart App Control Ready):** Install directly from the **[Microsoft Store (`9N371MQB4BS7`)](https://apps.microsoft.com/detail/9N371MQB4BS7?mode=direct)**.
2. **Direct Setup (`.exe`):** Download **`QuickPill-Windows-v6.0.0-Setup.exe`** from the [Release Asset](https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Windows-v6.0.0-Setup.exe) or [GitHub Releases](https://github.com/nabil24024004/Quick-Pill-Dynamic-Island-for-Windows/releases). Existing settings, pinned workspaces, notes, and preferences migrate cleanly.
