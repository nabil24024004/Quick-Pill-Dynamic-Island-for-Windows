# 💊 About Quick Pill — Complete Product Overview & Guide

> **Quick Pill** is a cross-platform, non-intrusive desktop assistant and Dynamic Island companion for **Windows**. Floating unobtrusively at the top of your screen, Quick Pill brings real-time system metrics, music controls, notifications, privacy alerts, and productivity widgets right to your fingertips without interrupting your active workspace.

---

## 📌 1. What is Quick Pill?

**Quick Pill** is an open-source desktop application built on Electron, React 19, and Framer Motion. Inspired by the fluidity of Apple's Dynamic Island, Quick Pill adapts natively to desktop environments.

Unlike traditional widget software or taskbar overlays that take up valuable screen space, Quick Pill rests as a minimal, semicircular capsule when idle. Upon hover or click, it morphs with fluid physics into an interactive control center equipped with 11 feature tabs.

---

## 💡 2. Purpose & Core Philosophy

The primary objective of Quick Pill is **zero-distraction productivity & unified desktop control**:

1. **Contextual Awareness**: Access vital information (time, weather, battery, playing tracks, notifications) without switching windows or interrupting full-screen applications.
2. **Unified Dashboard**: Consolidate hardware monitoring, media controls, task management, clipboard history, and system alerts into one single interface.
3. **Fluid UI Physics**: Powered by spring physics (`stiffness: 340, damping: 28`), the island expands and contracts smoothly based on your cursor interaction.
4. **Click-Through Translucency**: Hold `Control` while hovering to make the island 85% translucent and completely click-through, allowing you to click elements directly behind it.

---

## ✨ 3. Highlighted Core Functions

> [!IMPORTANT]
> Quick Pill runs as a transparent OS overlay floating above all desktop windows (`alwaysOnTop` level `screen-saver`).

* **Dynamic Island Physics**: Semicircular stadium pill geometry that expands between **Still Mode** (idle capsule), **Quick Mode** (hover preview), and **Large Mode** (active tab dashboard).
* **Native Notification Engine**: Captures Windows UWP notifications in real-time, extracting the app's process icon as a high-resolution base64 PNG data URL along with title and body text.
* **Privacy Dots & Alert Toast System**: Persistent camera (green) and microphone (orange) active indicator dots, alongside instant toasts for USB drive connection/disconnection, Bluetooth state changes, and Caps/Num Lock toggles.
* **Synchronized Depleting Timer Stroke**: SVG animated border that depleted clockwise around the island container as an active countdown timer runs.

---

## 🚀 4. Features in Detail

### 🎵 Media Controller & Scrubber (Tab 3 & Quick View)
* **Full-Bleed Art & Marquee Titles**: Displays high-resolution album artwork with smooth marquee text scrolling for long titles.
* **App Recognition**: Automatically recognizes music source applications (Spotify, Apple Music, Windows Media Player, Web Browsers).
* **Waveform Scrubber**: Interactive visual timeline scrubber for current track position.

### 🔔 Live Notification Center (Tab 5 & Toasts)
* **Real App Icons**: Automatically extracts the running process executable icon using native PowerShell APIs.
* **One-Click Focus**: Click any notification to instantly bring the originating application to the foreground.
* **Quick Dismiss**: Dismiss individual notifications or clear the feed.

### ⏱️ Preset Timer & Depleting Glow (Tab 10)
* **Quick Presets**: 15m, 30m, 60m, and 100m preset chips for instant one-click activation.
* **Custom Time Picker**: Fine-tune timer duration with simple `+` and `-` controls.
* **Depleting Border Stroke**: An orange glowing border traces the edge of the island, depleting as time counts down.

### 📝 Minimalist Tasks Manager (Tab 8)
* **Things 3 / Apple Style**: Minimalist task list with circular check controls and instant Enter submission.
* **Single-Capsule Input Bar**: Integrated task input field with auto-focus.
* **Local Persistence**: Tasks persist automatically across application restarts.

### 📋 Clipboard History Manager (Tab 7)
* **Automatic Capture**: Automatically captures text copied to your clipboard (up to 50 items).
* **One-Click Copy**: Copy past items back to your active clipboard with instant visual confirmation.

### 🌤️ Weather Dashboard & 3D Forecast (Tab 1 & 2)
* **3D Layered Icons**: Multi-layered weather status icons.
* **Detailed Metrics**: Real-time humidity, precipitation, wind speed, and 3-day sky glass forecasts.
* **Unit Customization**: Support for both Celsius (°C) and Fahrenheit (°F).

### 🕰️ Mechanical Split-Flap Flip Clock (Tab 2)
* **Retro Aesthetics**: Mechanical 3D split-flap flip clock with glowing orange colon dots and live date display.

### 🎮 System Metrics & Hardware Monitor (Tab 6)
* **CPU & RAM Utilization**: Real-time progress bars tracking CPU load and memory usage.
* **Battery Level & Charging Status**: Percentage readout with dynamic charging glow accents.

### 🚀 Quick Apps Launcher (Tab 1)
* **4-App Grid**: Configure up to 4 favorite application shortcuts for instant one-click launching.

### ⚙️ Comprehensive Settings Suite (Tab 9)
* **Themes**: Choose between Default, Sleek Black, and Windows 95 retro themes.
* **Positioning**: Place the Island at Top-Left, Top-Center, Top-Right, Bottom-Left, Bottom-Center, Bottom-Right, or Free Manual Dragging.
* **Tab Manager**: Drag to reorder tabs, click the eye icon to hide unused tabs, or set your favorite default tab.
* **Display Selector**: Multi-monitor support allowing you to target any connected monitor.

---

## 🛠️ 5. How Quick Pill Serves Your Daily Workflow

### 👨‍💻 For Developers & Power Users
* Keep CPU/RAM utilization and clipboard snippets accessible without opening heavy system monitor apps.
* Jump directly to tabs using `Ctrl + [1-8]` keyboard shortcuts.
* Use `Ctrl + Hover` to click through the island without having to move or hide it.

### 🎨 For Content Creators & Remote Workers
* **Privacy Dot Monitoring**: Instantly notice if your camera or microphone is unexpectedly active in the background.
* **Media Scrubber**: Control background music playback without alt-tabbing out of video editors or design suites.

### 📚 For Students & Professionals
* **Focus Timers**: Set quick 15m/30m/60m Pomodoro focus timers directly from your top screen bar.
* **Minimalist Task List**: Keep daily to-dos visible in a clean, distraction-free environment.

---

## 💻 6. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Desktop Framework** | **Electron 38+** | Cross-platform desktop window runtime |
| **Build & Tooling** | **Electron Forge 7+ & Vite 5+** | Fast HMR development, bundling, and distribution installers |
| **Frontend Library** | **React 19** | Modern component-based state management |
| **Animation Engine** | **Framer Motion 12** | Smooth spring physics, morphing animations, and layout transitions |
| **Iconography** | **Lucide React** | Scalable vector SVG icon set |
| **Styling** | **Vanilla CSS** | HSL color tokens, dark glassmorphism, responsive container math |
| **OS Scripting** | **PowerShell / Win32 API** | Native Windows UWP notifications, app icon extraction, media keys |


---

## ⌨️ 7. Keyboard Shortcuts & Quick Navigation

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + [1 - 8]` | Jump directly to Tab ID 1 through 8 in Large Mode |
| `Left / Right Arrow` | Navigate to previous / next tab in Large Mode |
| `Mouse Wheel Swipe` | Scroll horizontally across active tabs |
| `Ctrl + Hover` | Activate 85% translucency and click-through mouse passthrough |
| `Click Island` | Toggle between Large Mode and Still/Quick Mode |

---

## 📄 8. License & Attribution

Quick Pill is open-source software released under the **MIT License**. Created by **Abrar Nabil**.
