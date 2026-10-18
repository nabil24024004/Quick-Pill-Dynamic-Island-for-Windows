# 💊 About Quick Pill — Complete Product Overview & Guide

> **Quick Pill** (v5.5.1) is a non-intrusive desktop assistant and Dynamic Island companion engineered exclusively for **Windows 10 & 11**. Floating unobtrusively at the top of your screen, Quick Pill brings real-time system metrics, fluid battery diagnostics, per-app audio mixing, unified background progress tracking, actionable smart notifications, music controls, privacy alerts, and productivity widgets right to your fingertips without interrupting your active workspace.

---

## 📌 1. What is Quick Pill?

**Quick Pill** is an open-source desktop application built on **Electron 38**, **React 19**, and **Framer Motion 12**. Inspired by the fluidity of Apple's Dynamic Island and macOS Notch utilities, Quick Pill adapts natively to desktop environments.

Unlike traditional widget software or taskbar overlays that clutter your screen, Quick Pill rests as a minimal, semicircular capsule when idle. Upon hover or click, it morphs with fluid spring physics into an interactive control center equipped with **14 feature tabs** (including the Apple Dynamic Island Battery Hub, Per-App Audio Mixer, Universal Progress Island, Calendar, and Browser Search).

---

## 💡 2. Purpose & Core Philosophy

The primary objective of Quick Pill is **zero-distraction productivity & unified desktop control**:

1. **Contextual Awareness**: Access vital information (time, weather, battery drain, active media, notifications) without alt-tabbing or interrupting full-screen workflows.
2. **Unified Dashboard**: Consolidate hardware monitoring, battery health, media playback, per-app audio sessions, operations progress, task management, clipboard history, calendar planning, and system alerts into a single cohesive interface.
3. **Fluid UI Physics**: Powered by spring physics (`stiffness: 340, damping: 28, mass: 0.8`), the island expands and contracts smoothly based on cursor and keyboard interaction.
4. **Seamless Bounded Transitions**: All tab switches and layout expansions are strictly confined within the app boundary (`mode="wait"`), eliminating visual jitter, layout jumping, and overflow clipping.
5. **Click-Through Translucency**: Hold `Control` while hovering to make the island 85% translucent and completely click-through, allowing you to interact with windows directly underneath.
6. **Persistent Topmost Reliability**: Engineered with elevated `screen-saver` level priority, anti-minimize protection, and proactive heartbeat top-order re-assertion to guarantee visibility above all desktop applications.

---

## ✨ 3. Highlighted Core Functions

> [!IMPORTANT]
> Quick Pill runs as a transparent OS overlay floating above all desktop windows (`alwaysOnTop` level `screen-saver`) with dedicated background resilience (`backgroundThrottling: false`).

* **Dynamic Island Display Modes**:
  * **Still Mode (Idle)**: Semicircular stadium pill geometry (width: ~170px, height: 40px) resting flush against the top screen bezel.
  * **Quick Mode (Hover)**: Instant hover preview featuring current time, weather, battery status, now-playing media, incoming calls, and active system alerts.
  * **Large Mode (Active Dashboard)**: Full interactive horizontally-compact control center (height: 135px–185px, width: 540px–620px) housing all 16 feature tabs.
  * **Stealth Mode (Optional)**: Makes the Island completely transparent when idle to maximize screen real estate.
  * **Standby Mode (Optional)**: Keeps Quick View metrics permanently visible instead of collapsing to Still Mode.
* **Quick App Launcher & Workspace Switcher (Tab 14)**: Search and launch installed Windows applications with real icons, switch running application windows with native Win32 window restoration, pin favorites, and switch contextual productivity workspaces with launch profiles and preview safety.
* **Quick Notes & Contextual Capture (Tab 15)**: Instant quick-capture composer with debounced autosave and crash recovery, searchable notes inbox with tags and filters, contextual clipboard capture with large-content guard, and non-destructive note-to-task conversion.
* **Smart Notification Actions (Tab 5)**: Intelligent interaction layer with WhatsApp/VoIP call cards, inline replies, local snooze presets (5m, 15m, 30m, 1h), grouped multi-message stacks, low-priority collapsing, privacy preview masking, and dismissal undo buffer.
* **Per-App Audio Mixer (Tab 12)**: Native Windows Core Audio WASAPI mixer to adjust individual application volume levels, mute/unmute audio streams, monitor live peak audio meters, and toggle audio output endpoints.
* **Universal Progress Island (Tab 13)**: Consolidates background operations (file copying/hashing, download tasks, app updater) into an animated progress tracker directly anchored to the Island.
* **Apple Dynamic Island Battery Hub (Tab 11)**: Redesigned with Apple Human Interface Guidelines, featuring a 60 FPS right-to-left fluid liquid wave canvas engine, buoyant micro-bubbles, meniscus wave simulation, dynamic battery drain analytics, and real-time duration forecasting ("Time Until Full" or "Estimated Remaining").
* **Lock-Screen & Background Timers (Tab 10)**: Wall-clock timestamp synchronization (`timerEndTimeRef = Date.now() + sec * 1000`) and disabled background throttling ensure timers never pause, drift, or desync when Windows locks, sleeps, or enters connected standby.
* **Silent Background Auto-Updater**: Automatically detects remote releases from `version.json`, downloads updates to temporary storage, verifies SHA-256 checksums, and silently applies the update via NSIS in the background without interrupting the user.
* **Privacy Dots & System Alert Toasts**: Persistent camera (green) and microphone (orange) active indicator dots, alongside instant toasts for USB drive connection/disconnection, Bluetooth state changes, battery warnings, and Caps/Num/Scroll Lock toggles.
* **Synchronized Depleting Timer Stroke**: SVG animated glowing border that depletes clockwise around the island perimeter as an active countdown timer runs.
* **System Tray Companion**: Dedicated Windows taskbar notification tray icon with a right-click context menu to show/hide the Island, toggle Always on Top, or cleanly quit.

---

## 🚀 4. Features in Detail (All 16 Tabs)

```
Tabs Overview:
[0] Search  |  [1] Weather    |  [2] Overview     |  [11] Battery Hub |  [12] Audio Mixer  |  [13] Progress Island
[14] App Launcher  |  [15] Quick Notes  |  [3] Now Playing  |  [4] Calendar  |  [5] Notifications | [6] Stats
[7] Clipboard   |  [8] Tasks  |  [10] Timer  |  [9] Settings
```

### 🔍 Browser Search & Direct URL Launch (Tab 0)
* **Instant Search Input**: Minimalist omnibar input field with auto-focus.
* **Smart Execution**: Type any search query to search Google, or enter a valid web URL, `localhost:port`, or IP address to launch directly in your default browser.

### 🌤️ Weather Dashboard & 3D Sky Glass Forecast (Tab 1)
* **3D Animated Weather Icons**: Multi-layered weather icons with day and night celestial sets (glowing pearl moon, twinkling stars, and solar gradients).
* **Detailed Environmental Metrics**: Real-time temperature, humidity, precipitation (mm), and wind speed readouts.
* **3-Day Sky Glass Forecast**: Clean, glassmorphic daily forecast cards.
* **Customization**: Support for both Celsius (°C) and Fahrenheit (°F), plus customizable city/location settings.

### 🕰️ Overview — iOS StandBy Clock & Daily Quotes (Tab 2)
* **iOS StandBy-Style Clock**: Large, bold rounded digits (scaled to 80% notch height) with pulsating colon dots and live date/temperature indicators.
* **Curated Daily Quotes**: Glassmorphic quote card displaying inspirational quotes with the author's portrait; click anywhere on the card to cycle to the next quote with spring animations.

### 🔋 Apple Dynamic Island Battery Hub (Tab 11)
* **Apple HIG Liquid Wave Capsule**: 60 FPS HTML5 Canvas engine with high-DPI Retina scaling rendering fluid liquid waves moving right to left.
* **Buoyant Micro-Bubbles**: Organic micro-bubbles with randomized wobble speeds, radii, and vertical velocities rising through the liquid.
* **Adaptive Color Palette**: Dynamic Apple palette reflecting status—charging green (`#30D158`), low power amber (`#FFD60A`), and critical battery red (`#FF453A`).
* **Runtime Duration Forecasting**: Calculates and displays "Time Until Full" when connected to AC power or "Estimated Remaining" runtime on battery.
* **Power Mode Indicator**: Real-time badges for AC Power / Charging, On Battery Power, and Low Power Mode.

### 🎵 Media Controller & Waveform Scrubber (Tab 3 & Quick View)
* **Full-Bleed Art & Ambient Glow**: Displays high-resolution album artwork with ambient brightness dimming and smooth marquee scrolling for long titles.
* **Broad App Recognition**: Automatically recognizes music sources (Spotify, Apple Music, Windows Media Player, and web browsers) with clean UWP naming.
* **Waveform Scrubber & Volume Slider**: Interactive visual timeline scrubber for current track position, accompanied by track duration and volume control.
* **Hover Controls**: Seamless hover expansion in Quick Mode with instant play, pause, previous, and next controls.

### 📅 Compact Calendar (Tab 4)
* **Hero Date Card**: Displays current month, year, and full weekday name.
* **Monthly Grid View**: Interactive calendar grid with today's date highlighted and smooth month-to-month navigation arrows.
* **Height Optimization**: Sleek horizontal layout tailored to fit within the unified 135px notch height.

### 🔔 Live Notification Center & WhatsApp Calls (Tab 5 & Toasts)
* **Real Win32 App Icons**: Automatically extracts the running process executable icon using native PowerShell / Win32 APIs as high-res PNG data URLs.
* **One-Click Focus**: Click any notification card to bring the originating application directly to the foreground.
* **Quick Dismiss**: Dismiss individual notifications or clear the entire notification history.
* **WhatsApp Call Detection**: Live alerts for incoming WhatsApp voice and video calls with direct interaction capabilities.

### 🎮 System Metrics & Hardware Monitor (Tab 6)
* **CPU & RAM Utilization**: Real-time progress bars and percentage readouts tracking CPU load and memory usage.
* **Battery Card**: Percentage readout with dynamic charging glow accents and battery state warnings.

### 📋 Clipboard History Manager (Tab 7)
* **Automatic Capture**: Automatically captures text copied to your clipboard (up to 50 items).
* **Accelerated Polling**: Automatically boosts polling frequency to 2 seconds while the Clipboard tab is actively open.
* **One-Click Copy & Clear**: Copy past snippets back to the clipboard with instant visual confirmation, or wipe history with "Clear All".

### 📝 Minimalist Tasks Manager (Tab 8)
* **Things 3 / Apple Reminders Aesthetic**: Clean task cards with circular check controls and instant Enter submission.
* **Single-Capsule Input Bar**: Integrated task input field with auto-focus.
* **Local Persistence**: Tasks persist automatically in local storage across application restarts.

### ⏱️ Preset Timer & Depleting Glow (Tab 10)
* **Quick Presets**: 15m, 30m, 60m, and 100m preset chips for instant one-click activation.
* **Custom Time Picker**: Fine-tune timer duration with simple `+` and `-` minute controls.
* **Wall-Clock Accuracy**: Synchronized using timestamp math (`Date.now() + duration`) so timers stay accurate through system sleep or lock screen.
* **Depleting Border Stroke**: An orange glowing border traces the edge of the island, depleting clockwise as time counts down.
* **Sound Alerts & Toasts**: Visual and audio alerts triggered upon timer completion.

### ⚙️ Comprehensive Settings Suite (Tab 9)
* **Themes & Colors**: Choose between Default Dark Glass, Sleek Black, Windows 95 retro, or pick custom RGB accent colors.
* **Always on Top Toggle**: Toggle topmost enforcement with screen-saver priority.
* **Island Border & Accents**: Toggle outer border visibility and custom styles.
* **Display Modes**: Toggle Stealth Mode (transparent when idle) or Standby Mode (permanent Quick View).
* **Positioning**: Place the Island at Top-Left, Top-Center, Top-Right, Bottom-Left, Bottom-Center, Bottom-Right, or Free Manual Dragging.
* **Tab Manager**: Drag to reorder tabs, click the eye icon to hide unused tabs, or set your favorite default tab.
* **Display Selector**: Multi-monitor support allowing you to target any connected monitor.
* **Startup on Boot**: Enable or disable auto-launch on Windows startup (`app.setLoginItemSettings`).
* **Silent Auto-Updater Settings**:
  * **Auto-Check on Launch**: Check remote `version.json` 4 seconds after boot and periodically every 2 hours.
  * **Auto-Download & Install**: Silently download and apply NSIS updates in the background.

---

## 🛠️ 5. How Quick Pill Serves Your Daily Workflow

### 👨‍💻 For Developers & Power Users
* Keep CPU/RAM utilization, battery runtime forecasts, and clipboard snippets accessible without opening heavy monitoring software.
* Jump directly to tabs using `Ctrl + [0 - 9]` keyboard shortcuts.
* Use `Ctrl + Hover` to click through the island without having to move or hide it.
* Launch dev URLs and localhost endpoints instantly via the Browser Search tab.

### 🎨 For Content Creators & Remote Workers
* **Privacy Dot Monitoring**: Instantly notice if your camera or microphone is unexpectedly active in the background.
* **Media Scrubber**: Control background music playback without alt-tabbing out of video editors or design suites.
* **WhatsApp Call Alerts**: Never miss important client voice or video calls while working in full-screen applications.

### 📚 For Students & Professionals
* **Focus Timers**: Set quick 15m/30m/60m Pomodoro focus timers directly from your top screen bar that stay accurate across PC lock or sleep.
* **Minimalist Task List**: Keep daily to-dos visible in a clean, distraction-free environment.
* **Battery Hub**: Know exactly how much time remains on battery before needing your charger.

---

## 💻 6. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Desktop Framework** | **Electron 38+** | Windows desktop window runtime (Windows 10 & 11 exclusive) |
| **Build & Tooling** | **Electron Forge 7+, Electron Builder & Vite 5+** | Fast HMR development, bundling, and NSIS distribution installers |
| **Frontend Library** | **React 19** | Modern component-based UI and state management |
| **Animation Engine** | **Framer Motion 12** | Smooth spring physics, morphing animations, and bounded tab transitions |
| **High-Performance Canvas** | **HTML5 2D Canvas** | 60 FPS fluid liquid wave engine with high-DPI Retina scaling |
| **Iconography** | **Lucide React** | Scalable vector SVG icon set |
| **Styling** | **Vanilla CSS** | HSL color tokens, dark glassmorphism, responsive container math |
| **OS Scripting & APIs** | **PowerShell / Win32 / WinRT** | Native Windows UWP notifications, app icon extraction, media keys, battery status |

---

## ⌨️ 7. Keyboard Shortcuts & Quick Navigation

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + [0 - 9]` | Jump directly to Tab ID in Large Mode |
| `Left / Right Arrow` | Navigate to previous / next tab in Large Mode |
| `Mouse Wheel Scroll` | Scroll horizontally across active tabs |
| `Ctrl + Hover` | Activate 85% translucency and click-through mouse passthrough |
| `Click Island` | Toggle between Large Mode and Still/Quick Mode |
| `System Tray Menu` | Right-click tray icon to Show/Hide, toggle Always on Top, or Quit |

---

## 🔄 8. Distribution & Auto-Updates

* **Platform Targeting**: Standalone, optimized builds exclusively for **Windows (x64)**.
* **Installer Architecture**: Packaged via **NSIS** (`QuickPill-Windows-v5.5.1-Setup.exe`) with one-click installation and desktop/start menu shortcuts.
* **Update Verification**: Release binaries verify against remote manifest SHA-256 hashes hosted via Cloudflare R2 / GitHub releases.
* **Silent Background Execution**: Automated silent installs run with `/S` flags so updates apply seamlessly without disrupting your work.

---

## 📄 9. License & Attribution

Quick Pill is open-source software released under the **MIT License**.  
Created and maintained by **Abrar Nabil** ([abrar@neosparkx.com](mailto:abrar@neosparkx.com)).
