import { useState, useRef, useEffect } from 'react';
import {
  Clock, Music, Timer, FolderDown, Rocket, FileText,
  Cloud, Search, Calendar, Sliders, Compass, Bell,
  Cpu, Clipboard, CheckSquare, Settings
} from 'lucide-react';

export const SANDBOX_TABS = [
  {
    id: 'overview',
    label: 'Overview',
    subtitle: 'StandBy Clock & Daily Quotes',
    type: 'video',
    src: 'tabs/overview.mp4',
    icon: Clock,
  },
  {
    id: 'now-playing',
    label: 'Now Playing',
    subtitle: 'Media Controller & Waveform Scrubber',
    type: 'video',
    src: 'tabs/now-playing.mp4',
    icon: Music,
  },
  {
    id: 'timer',
    label: 'Focus Timer',
    subtitle: 'Pomodoro Presets & Edge Depleting Glow',
    type: 'video',
    src: 'tabs/timer.mp4',
    icon: Timer,
  },
  {
    id: 'shelf',
    label: 'File Shelf',
    subtitle: 'Drag & Drop Temporary Staging Shelf',
    type: 'video',
    src: 'tabs/shelf.mp4',
    icon: FolderDown,
  },
  {
    id: 'app-launcher',
    label: 'App Launcher',
    subtitle: 'Installed App Search & Workspace Switcher',
    type: 'video',
    src: 'tabs/app-launcher.mp4',
    icon: Rocket,
  },
  {
    id: 'notes',
    label: 'Quick Notes',
    subtitle: 'Autosave Notepad & Contextual Capture',
    type: 'video',
    src: 'tabs/notes.mp4',
    icon: FileText,
  },
  {
    id: 'weather',
    label: 'Weather',
    subtitle: '3D Sky-Glass Forecast & Live Atmosphere',
    type: 'image',
    src: 'tabs/weather.png',
    icon: Cloud,
  },
  {
    id: 'search',
    label: 'Browser Search',
    subtitle: 'Instant Omnibar & Localhost URL Launcher',
    type: 'image',
    src: 'tabs/search.png',
    icon: Search,
  },
  {
    id: 'calendar',
    label: 'Calendar',
    subtitle: 'Compact Monthly Calendar Grid',
    type: 'image',
    src: 'tabs/calendar.png',
    icon: Calendar,
  },
  {
    id: 'audio-mixer',
    label: 'Audio Mixer',
    subtitle: 'Native Windows WASAPI Per-App Volume',
    type: 'image',
    src: 'tabs/audio-mixer.png',
    icon: Sliders,
  },
  {
    id: 'prayer',
    label: 'Prayer Times',
    subtitle: 'Daily Solar Arc & Offline Salah Windows',
    type: 'image',
    src: 'tabs/prayer.png',
    icon: Compass,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    subtitle: 'Smart Action Cards & WhatsApp VoIP Calls',
    type: 'image',
    src: 'tabs/notifications.png',
    icon: Bell,
  },
  {
    id: 'system-stats',
    label: 'System Stats',
    subtitle: 'Live CPU Load, RAM & Battery Diagnostics',
    type: 'image',
    src: 'tabs/system-stats.png',
    icon: Cpu,
  },
  {
    id: 'clipboard',
    label: 'Clipboard',
    subtitle: '50-Item History Buffer & Instant Paste',
    type: 'image',
    src: 'tabs/clipboard.png',
    icon: Clipboard,
  },
  {
    id: 'tasks',
    label: 'Tasks',
    subtitle: 'Minimalist Apple-Style To-Do Checklist',
    type: 'image',
    src: 'tabs/tasks.png',
    icon: CheckSquare,
  },
  {
    id: 'settings',
    label: 'Settings',
    subtitle: 'Positioning, Themes & Startup Preferences',
    type: 'image',
    src: 'tabs/settings.png',
    icon: Settings,
  },
];

export default function InteractiveSandbox() {
  const [activeTabId, setActiveTabId] = useState('overview');
  const videoRef = useRef(null);

  const activeTab = SANDBOX_TABS.find(t => t.id === activeTabId) || SANDBOX_TABS[0];

  // Ensure video auto-plays upon tab change
  useEffect(() => {
    if (activeTab.type === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [activeTabId, activeTab.type]);

  return (
    <div className="sandbox-wrapper" aria-label="Interactive Quick Pill Simulator">
      {/* Interactive 16 Tabs - Positioned at top of sandbox */}
      <div className="sandbox-dock" role="tablist" aria-label="Quick Pill 16 Features">
        {SANDBOX_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={`sandbox-tab-pill ${isActive ? 'is-active' : ''}`}
              onClick={() => setActiveTabId(tab.id)}
              aria-selected={isActive}
            >
              <Icon size={14} strokeWidth={isActive ? 2 : 1.5} className="tab-pill-icon" />
              <span className="tab-pill-label">{tab.label}</span>
              {tab.type === 'video' && <span className="tab-pill-dot" title="Video clip" />}
            </button>
          );
        })}
      </div>

      {/* Simulated Windows 11 Laptop Display Frame */}
      <div className="laptop-frame">
        {/* Top Laptop Bezel with Webcam and Sensor */}
        <div className="laptop-top-bezel">
          <div className="laptop-webcam">
            <span className="webcam-sensor" />
            <span className="webcam-lens" />
            <span className="webcam-led" />
          </div>
        </div>

        {/* Windows 11 Desktop Display Viewport - Fully filled with no gaps */}
        <div className="laptop-screen">
          <div className="sandbox-media-stage">
            {activeTab.type === 'video' ? (
              <video
                key={activeTab.src}
                ref={videoRef}
                src={activeTab.src}
                autoPlay
                loop
                muted
                playsInline
                className="sandbox-screen-media sandbox-screen-media--video"
                title={`Quick Pill ${activeTab.label} interactive demonstration`}
              />
            ) : (
              <img
                key={activeTab.src}
                src={activeTab.src}
                alt={`Quick Pill ${activeTab.label} interface on Windows 11`}
                className="sandbox-screen-media sandbox-screen-media--image"
                loading="eager"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
