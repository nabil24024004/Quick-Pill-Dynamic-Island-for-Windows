# Quick Pill v5.6.1 — Release Notes

> **Release Date:** November 11, 2026  
> **Target OS:** Windows 10 & 11 (64-bit)  
> **Installer:** `QuickPill-Windows-v5.6.1-Setup.exe`  
> **Download Link:** [Download Setup (v5.6.1)](https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Windows-v5.6.1-Setup.exe)  
> **Official Web App:** [quickpill.neosparkx.com](https://quickpill.neosparkx.com/)

---

## 🌟 Highlights & Major Improvements

### 1. 🚀 App Launcher: Strict Workspaces Isolation & Catalog Cleanup
* **Pure Workspace Views:** Resolved an issue where regular desktop applications (e.g. *Android Studio*, *Python*, *Windows PowerShell ISE*) and installer stubs inadvertently populated the **Workspaces** tab (`filter === "workspaces"`).
* **`isStrictWorkspace()` Verification:** The Workspaces tab now strictly validates workspace objects (requiring an explicit `.apps` schema), ensuring non-workspace apps are filtered out during memory caching, data loading, keyboard navigation, and Enter-to-launch actions.
* **Redistributable & Noise Pruning:** Enhanced `isInternalHelperExe()` to filter out residual installer stubs, package cache paths (`\package cache\`), Microsoft Visual C++ redistributable packages (`vcredist`, `vc_redist`), setup wrappers, and system diagnostic utilities (`odbcad32.exe`).

### 2. 📁 Drop Shelf (Tab 16 • `Alt+F`): Visual Previews & Horizontal Navigation
* **Image & PDF File Previews:** Shelf cards now render rich inline visual preview thumbnails for supported image formats (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.bmp`, `.ico`) and PDF document badges, making it effortless to distinguish between staged files at a glance.
* **Custom Horizontal Scrollbar:** Introduced a sleek, low-profile glass horizontal scrollbar that remains visible whenever staged items exceed the notch container width.
* **Carousel Navigation Chevrons:** Added responsive left and right chevron buttons for quick horizontal panning across large file queues.
* **Mouse Wheel Translation:** Vertical mouse wheel scrolling automatically translates to smooth horizontal shelf navigation (`onWheel` mapping).
* **Bidirectional Drag-and-Drop:** Seamlessly drag files into the notch to stage them, and drag them **out** of the shelf directly into File Explorer, web browsers, Discord, Slack, or creative apps via native Electron OS drag-out (`startDrag`).

### 3. 🕌 Prayer Times & Celestial Arc (Tab 17 • `Alt+P`)
* **Live Celestial Sun Arc:** Visual celestial tracker rendering the sun and moon's position relative to your location throughout the day.
* **Synchronized Timings:** High-accuracy prayer calculations (Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha) with offline astronomical calculation fallbacks.
* **Next-Prayer Hero Countdown:** Prominent countdown to the next prayer time, accompanied by a tranquil collapsed azan notification banner and audio chime.

### 4. 🎨 Modernized README & Web Experience
* **Modern README Redesign:** Updated documentation with high-contrast download CTA buttons, official for-the-badge shield badges, and updated product showcase media.
* **Web App Manifest Sync:** Synced the official React 19 web landing page with live dynamic release metadata, real-time SHA-256 verification, and active setup download links.

---

## 🛠️ Detailed Changelog & Bug Fixes

| Area | Type | Description |
| :--- | :---: | :--- |
| **App Launcher** | `Fix` | Filtered external apps and setup wrappers from leaking into the Workspaces category tab. |
| **Discovery Service** | `Fix` | Pruned `\package cache\` entries, `vcredist*.exe`, and `odbcad32.exe` from the system application catalog. |
| **Drop Shelf** | `Feat` | Added visual thumbnail previews for image and PDF files. |
| **Drop Shelf** | `Feat` | Added sleek horizontal scrollbar, wheel translation, and carousel navigation chevrons. |
| **Drop Shelf** | `Feat` | Full native OS drag-out capability to drag files directly from the notch into external applications. |
| **Navigation** | `Fix` | Enforced strict schema validation on workspace execution and quick-launch hotkeys. |
| **Packaging** | `Build` | Re-built and verified clean NSIS installer bundle with standard ASAR compression. |
| **Tests** | `Tests` | Added unit tests for workspace isolation and redistributable discovery pruning; 145/145 tests passing. |

---

## 🔒 Verification & Checksum

| Property | Value |
| :--- | :--- |
| **Installer File** | `QuickPill-Windows-v5.6.1-Setup.exe` |
| **Architecture** | Windows x64 (10 / 11) |
| **File Size** | `135,202,073 bytes` (~128.9 MB) |
| **SHA-256 Hash** | `c48bc0eecad5b709bfbe01e0034f38af40cae5b08c1ae40d5ca68a0771412e90` |
| **Test Suite** | `145 passed, 0 failed` across all suites |

---

## 📥 Installation & Upgrade

1. Download **`QuickPill-Windows-v5.6.1-Setup.exe`** from the [Release Asset](https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Windows-v5.6.1-Setup.exe) or the [GitHub Releases](https://github.com/nabil24024004/Quick-Pill-Dynamic-Island-for-Windows/releases) page.
2. Run the installer. Existing configurations, pinned workspaces, notes, and preferences will be preserved automatically.
3. Quick Pill will launch and position seamlessly at the top center of your display.
