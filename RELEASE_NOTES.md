# Quick Pill v6.1.0 — Release Notes

> **Release Date:** November 16, 2026  
> **Target OS:** Windows 10 & 11 (64-bit) · Linux x64 (X11 & Wayland)  
> **Microsoft Store ID:** `9N371MQB4BS7` ([Store Listing](https://apps.microsoft.com/detail/9N371MQB4BS7?mode=direct))  
> **NSIS Installer:** `QuickPill-Windows-v6.1.0-Setup.exe` *(NSIS bundle output: `Quick Pill_6.1.0_x64-setup.exe`)*  
> **Microsoft Store Package:** `QuickPill_6.1.0_x64.msix`  
> **Linux Packages (via VM / `scripts/build-linux.sh`):** `QuickPill-Linux-v6.1.0.AppImage`, `QuickPill-Linux-v6.1.0.deb`, `QuickPill-Linux-v6.1.0.rpm`  
> **Download Link:** [Download Setup (v6.1.0)](https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Windows-v6.1.0-Setup.exe)  
> **Official Web App:** [quickpill.neosparkx.com](https://quickpill.neosparkx.com/) · [Privacy Policy](https://quickpill.neosparkx.com/#/privacy)

---

## 🌟 Highlights & Improvements in v6.1.0

### 1. 🐧 Cross-Platform Linux Support (X11 & Wayland)
* **Native Desktop Integration:** Added Linux support across X11, GNOME Wayland, KDE Plasma, Hyprland, Sway, and i3 with GTK3/GDK overlay positioning (`window_overlay.rs`), PipeWire/PulseAudio per-app audio mixer (`audio_mixer.rs`), MPRIS2 media controls (`media.rs`), D-Bus notifications (`notifications.rs`), and XDG `.desktop` app discovery (`launcher.rs`).
* **Native Linux Bundles & Self-Update Routing:** Supports `.AppImage`, `.deb`, and `.rpm` distributions (`updater.rs`, `tauri.conf.json`) plus automated ext4-staged VM bundling via `scripts/build-linux.sh`.

### 2. 📁 Drop Shelf Portal Transfer & Drag-Out Improvements
* **Cross-App Linux Drag-Out (`shelf.rs`):** Integrated `org.freedesktop.portal.FileTransfer` (`application/vnd.portal.filetransfer`) for sandboxed apps (Snap/Flatpak browsers), per-drag isolated hardlink exports with clean filenames (safe `COPY | MOVE | LINK` negotiation), inline `<= 3` XDND target lists, and native drag-in/drop handling.
* **Snappier UI & Scroll Navigation (`Island.jsx`):** Faster transition timing and improved mouse-wheel tab switching responsiveness in Large Mode.

### 3. 🔐 Microsoft Store MSIX, NSIS Setup & Release Tooling
* **Dual-Mode Microsoft Store MSIX (`QuickPill_6.1.0_x64.msix`):** Built against identity `NeoSparkX.QuickPill` (`9N371MQB4BS7`, manifest version `6.1.0.0`).
* **One-Command Release Builders (`scripts/`):** Added `scripts/build-windows.ps1` (runs Rust tests, NSIS setup, Store MSIX, SHA-256 checksums, and manifest), upgraded `scripts/build-linux.sh` to clear cached older bundles and sync `version.json`, and updated `scripts/generate-manifest.js` to validate platform versions automatically.

---

## 🔒 Verification & Checksums (Windows x64)

| Property | NSIS Setup (`.exe`) | Microsoft Store Package (`.msix`) |
| :--- | :--- | :--- |
| **Distribution File** | `QuickPill-Windows-v6.1.0-Setup.exe` | `QuickPill_6.1.0_x64.msix` |
| **Architecture** | Windows x64 (10 / 11) | Windows x64 (10 / 11 Desktop) |
| **File Size** | `4,245,513 bytes` (`4.05 MiB`) | `5,771,144 bytes` (`5.50 MiB`) |
| **SHA-256 Hash** | `609893ce0372bde2e08a405ed211e8f49da74892480d544d1a19191f043e5e63` | `9caca888999ae1c93f95fb3b1ff362c0c50119022818e7cce12a44532004d9fb` |
| **Test Suite** | `17 passed, 0 failed` (`cargo test --manifest-path src-tauri/Cargo.toml`) | `17 passed, 0 failed` |

> **Linux Checksums (`.AppImage`, `.deb`, `.rpm`):** Generated with `.sha256` files and merged into `web app/public/version.json` when running `bash scripts/build-linux.sh` inside your Linux VM or on GitHub Actions (`ubuntu-22.04`).

---

## 📥 Installation & Upgrade

1. **Microsoft Store (Recommended — Smart App Control Ready):** Install directly from the **[Microsoft Store (`9N371MQB4BS7`)](https://apps.microsoft.com/detail/9N371MQB4BS7?mode=direct)**.
2. **Direct Setup (`.exe`):** Download **`QuickPill-Windows-v6.1.0-Setup.exe`** from the [Release Asset](https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Windows-v6.1.0-Setup.exe) or [GitHub Releases](https://github.com/nabil24024004/Quick-Pill-Dynamic-Island-for-Windows/releases). Existing settings, pinned workspaces, notes, and preferences migrate cleanly.
3. **Linux (`.AppImage`, `.deb`, `.rpm`):** Build locally in the VM via `bash scripts/build-linux.sh` or download the Linux packages from [GitHub Releases](https://github.com/nabil24024004/Quick-Pill-Dynamic-Island-for-Windows/releases).
