# Quick Pill v6.1.1 — Release Notes

> **Release Date:** November 16, 2026  
> **Target OS:** Windows 10 & 11 (64-bit) · Linux x64 (X11 & Wayland)  
> **Microsoft Store ID:** `9N371MQB4BS7` ([Store Listing](https://apps.microsoft.com/detail/9N371MQB4BS7?mode=direct))  
> **NSIS Installer:** `QuickPill-Windows-v6.1.1-Setup.exe` *(NSIS bundle output: `Quick Pill_6.1.1_x64-setup.exe`)*  
> **Microsoft Store Package:** `QuickPill_6.1.1_x64.msix`  
> **Linux Packages (via VM / `scripts/build-linux.sh --clean`):** `QuickPill-Linux-v6.1.1.AppImage`, `QuickPill-Linux-v6.1.1.deb`, `QuickPill-Linux-v6.1.1.rpm`  
> **Download Link:** [Download Setup (v6.1.1)](https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Windows-v6.1.1-Setup.exe)  
> **Official Web App:** [quickpill.neosparkx.com](https://quickpill.neosparkx.com/) · [Privacy Policy](https://quickpill.neosparkx.com/#/privacy)

---

## 🌟 Highlights & Improvements in v6.1.1

### 1. 🐧 Cross-Platform Linux Support (X11 & Wayland)
* **Native Desktop Integration:** Added Linux support across X11, GNOME Wayland, KDE Plasma, Hyprland, Sway, and i3 with GTK3/GDK overlay positioning (`window_overlay.rs`), PipeWire/PulseAudio per-app audio mixer (`audio_mixer.rs`), MPRIS2 media controls (`media.rs`), D-Bus notifications (`notifications.rs`), and XDG `.desktop` app discovery (`launcher.rs`).
* **Native Linux Bundles & Self-Update Routing:** Supports `.AppImage`, `.deb`, and `.rpm` distributions (`updater.rs`, `tauri.conf.json`) plus automated ext4-staged VM bundling via `scripts/build-linux.sh`.

### 2. 📁 Drop Shelf Portal Transfer & Drag-Out Improvements
* **Cross-App Linux Drag-Out (`shelf.rs`):** Integrated `org.freedesktop.portal.FileTransfer` (`application/vnd.portal.filetransfer`) for sandboxed apps (Snap/Flatpak browsers), per-drag isolated hardlink exports with clean filenames (safe `COPY | MOVE | LINK` negotiation), inline `<= 3` XDND target lists, and native drag-in/drop handling.
* **Snappier UI & Scroll Navigation (`Island.jsx`):** Faster transition timing and improved mouse-wheel tab switching responsiveness in Large Mode.

### 3. 🔐 Microsoft Store MSIX, NSIS Setup, Memory & Release Tooling
* **Compact WebView2 Overlay & Instant Store Startup (`window_overlay.rs`, `Island.jsx`, `tauri.conf.json`):** Uses a fixed compact Windows overlay HWND (`960x368` logical px — ~73% smaller than fullscreen `1920x1080` without resizing on hover), keeps `WS_EX_LAYERED` permanently enabled with `SetLayeredWindowAttributes(..., 255, LWA_ALPHA)` while toggling only `WS_EX_TRANSPARENT` (`ensure_layered_alpha_initialized`), enables `COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW` after first paint, trims WebView2 background services, and forces `ShowWindow(SW_SHOWNOACTIVATE)` + `SetIsVisible(true)` on first valid `#Island` mount.
* **Single-Instance Enforcement (`single_instance.rs`, `window_overlay.rs`, `lib.rs`):** Enforces a single instance on both Windows (Named Mutex + Event + Broadcast Message) and Linux (Unix socket), so clicking "Open" in Microsoft Store or launching again exits the duplicate immediately and activates Quick Pill.
* **Ctrl + Hover Click-Through Reliability (`window_overlay.rs`, `Island.jsx`, `shelf.rs`):** Polls physical OS `Ctrl` key state (`GetAsyncKeyState` on Windows, GDK modifiers on Linux), suppresses synthetic `mouseleave`/`blur` resets while click-through is active, ignores click-through during active text editing (`Ctrl+C`/`Ctrl+V`/`Ctrl+A`), and emits `island:ctrl-hover` for seamless ghosted click-through and instant restoration on release.
* **Reliable SMTC Media Controls & Scrubber (`media.rs`, `Island.jsx`):** Scores active SMTC sessions consistently, fixes false `Ok(false)` command acceptance checks with Play/Pause + `SendInput` media-key fallbacks, avoids caching missing thumbnails permanently, clamps SMTC seek targets to `[min_seek, max_seek]`, adds smooth drag scrubbing on `WaveformScrubber`, and triggers immediate state refreshes after playback actions.
* **Dual-Mode Microsoft Store MSIX (`QuickPill_6.1.1_x64.msix`):** Built against identity `NeoSparkX.QuickPill` (`9N371MQB4BS7`, manifest version `6.1.1.0`).
* **One-Command Release Builders (`scripts/`):** Added `scripts/build-windows.ps1` (runs Rust tests, NSIS setup, Store MSIX, SHA-256 checksums, and manifest), upgraded `scripts/build-linux.sh` to clear cached older bundles and sync `version.json`, and updated `scripts/generate-manifest.js` to validate platform versions automatically.

---

## 🔒 Verification & Checksums (Windows x64)

| Property | NSIS Setup (`.exe`) | Microsoft Store Package (`.msix`) |
| :--- | :--- | :--- |
| **Distribution File** | `QuickPill-Windows-v6.1.1-Setup.exe` | `QuickPill_6.1.1_x64.msix` |
| **Architecture** | Windows x64 (10 / 11) | Windows x64 (10 / 11 Desktop) |
| **File Size** | `4,264,420 bytes` (`4.07 MiB`) | `5,792,722 bytes` (`5.52 MiB`) |
| **SHA-256 Hash** | `606dfa5df49ab351bd01fb55109804d6a1e8696a972ad4fcccaa50177a665c9f` | `262dec75baee0edf4b70c4e4a1eb13db8cd9825f8492e0a15516c1d5eb447a0c` |
| **Test Suite** | `26 passed, 0 failed` (`cargo test --manifest-path src-tauri/Cargo.toml`) | `26 passed, 0 failed` |

> **Linux Checksums (`.AppImage`, `.deb`, `.rpm`):** Generated with `.sha256` files and merged into `web app/public/version.json` when running `bash scripts/build-linux.sh --clean` inside your Linux VM or on GitHub Actions (`ubuntu-22.04`).

---

## 📥 Installation & Upgrade

1. **Microsoft Store (Recommended — Smart App Control Ready):** Install directly from the **[Microsoft Store (`9N371MQB4BS7`)](https://apps.microsoft.com/detail/9N371MQB4BS7?mode=direct)**.
2. **Direct Setup (`.exe`):** Download **`QuickPill-Windows-v6.1.1-Setup.exe`** from the [Release Asset](https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Windows-v6.1.1-Setup.exe) or [GitHub Releases](https://github.com/nabil24024004/Quick-Pill-Dynamic-Island-for-Windows/releases). Existing settings, pinned workspaces, notes, and preferences migrate cleanly.
3. **Linux (`.AppImage`, `.deb`, `.rpm`):** Build locally in the VM via `bash scripts/build-linux.sh --clean` or download the Linux packages from [GitHub Releases](https://github.com/nabil24024004/Quick-Pill-Dynamic-Island-for-Windows/releases).
