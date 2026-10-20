import React, { useState, useEffect } from 'react';
import { 
  Settings, Palette, Sliders, Keyboard, Info, Check, X, Minus, 
  RotateCcw, Sparkles, Monitor, Bell, ExternalLink, ShieldAlert, Cpu,
  Music, Droplet, Clock, Timer, Inbox, BatteryCharging, SlidersHorizontal,
  Compass, FileText, CheckSquare, Calendar, Activity, List, Search
} from 'lucide-react';

const MODULES_CONFIG = [
  { id: 2, name: "Standby Clock", desc: "Digital & analog clock with seconds and date display", icon: Clock, color: "#38bdf8" },
  { id: 3, name: "Music & Synced Lyrics", desc: "Live media playback controls and real-time synced lyrics", icon: Music, color: "#22c55e" },
  { id: 10, name: "Pomodoro Focus Timer", desc: "Productivity timer with work/break intervals and alarm sounds", icon: Timer, color: "#ef4444" },
  { id: 1, name: "Water Reminder", desc: "Hydration tracking and customizable reminder interval alerts", icon: Droplet, color: "#0284c7" },
  { id: 13, name: "File Shelf", desc: "Quick drag & drop staging shelf for temporary file sharing", icon: FileText, color: "#a855f7" },
  { id: 11, name: "Battery Hub", desc: "Detailed battery percentage, health metrics, and power status", icon: BatteryCharging, color: "#22c55e" },
  { id: 12, name: "Audio Mixer", desc: "Per-application volume mixer and audio device selector", icon: SlidersHorizontal, color: "#38bdf8" },
  { id: 14, name: "App Launcher", desc: "Quick-access dock for your favorite apps and web shortcuts", icon: Compass, color: "#f59e0b" },
  { id: 15, name: "Quick Notes", desc: "Fast scratchpad for thoughts, markdown notes, and checklists", icon: List, color: "#10b981" },
  { id: 5, name: "Notifications", desc: "Aggregated notifications center and toast history", icon: Bell, color: "#a855f7" },
  { id: 8, name: "To-Do List", desc: "Task manager with completion status and priority tags", icon: CheckSquare, color: "#ec4899" },
  { id: 4, name: "Calendar", desc: "Monthly calendar view with schedule events and agenda", icon: Calendar, color: "#f43f5e" },
  { id: 6, name: "System Stats", desc: "Real-time CPU, RAM, GPU, network, and temperature graphs", icon: Activity, color: "#6366f1" },
  { id: 7, name: "Clipboard History", desc: "Searchable history of copied text snippets and links", icon: Inbox, color: "#38bdf8" },
  { id: 0, name: "Browser Search", desc: "Instant web search bar with engine presets", icon: Search, color: "#eab308" }
];

const DEFAULT_SHORTCUTS = {
  "minimal-notch": "Alt+Shift+M", // Minimal Notch Toggle
  0: "Alt+B",   // Browser Search
  1: "Alt+W",   // Water Reminder
  2: "Alt+O",   // Standby Clock
  11: "Alt+H",  // Battery Hub
  12: "Alt+A",  // Audio Mixer
  13: "Alt+P",  // File Shelf
  14: "Alt+L",  // App Launcher
  15: "Alt+Q",  // Quick Notes
  3: "Alt+M",   // Music & Lyrics
  4: "Alt+C",   // Calendar
  5: "Alt+N",   // Notifications
  6: "Alt+G",   // System Stats
  7: "Alt+V",   // Clipboard History
  8: "Alt+T",   // To-Do List
  10: "Alt+R"   // Pomodoro Focus
};

const MODULE_NAMES = {
  "minimal-notch": "Toggle Minimal Notch",
  0: "Browser Search",
  1: "Water Reminder",
  2: "Standby Clock",
  11: "Battery Hub",
  12: "Audio Mixer",
  13: "File Shelf",
  14: "App Launcher",
  15: "Quick Notes",
  3: "Music & Synced Lyrics",
  4: "Calendar",
  5: "Notifications",
  6: "System Stats",
  7: "Clipboard History",
  8: "To-Do List",
  10: "Pomodoro Focus"
};

const MODULE_DESCRIPTIONS = {
  "minimal-notch": "Quick shortcut to force collapse / expand ultra-slim micro-strip",
  0: "Instant web search bar with engine presets",
  1: "Hydration tracking and customizable reminder alerts",
  2: "Digital & analog clock with seconds and date display",
  11: "Detailed battery percentage, health metrics, and power status",
  12: "Per-application volume mixer and audio device selector",
  13: "Quick drag & drop staging shelf for temporary file sharing",
  14: "Quick-access dock for your favorite apps and web shortcuts",
  15: "Fast scratchpad for thoughts, markdown notes, and checklists",
  3: "Live media playback controls and real-time synced lyrics",
  4: "Monthly calendar view with schedule events and agenda",
  5: "Aggregated notifications center and toast history",
  6: "Real-time CPU, RAM, GPU, network, and temperature graphs",
  7: "Searchable history of copied text snippets and links",
  8: "Task manager with completion status and priority tags",
  10: "Productivity timer with work/break intervals and alarm sounds"
};

const MODULE_ICONS = {
  "minimal-notch": Minus,
  0: Search,
  1: Droplet,
  2: Clock,
  11: BatteryCharging,
  12: SlidersHorizontal,
  13: FileText,
  14: Compass,
  15: List,
  3: Music,
  4: Calendar,
  5: Bell,
  6: Activity,
  7: Inbox,
  8: CheckSquare,
  10: Timer
};

const MODULE_COLORS = {
  "minimal-notch": "#38bdf8",
  0: "#eab308",
  1: "#0284c7",
  2: "#38bdf8",
  11: "#22c55e",
  12: "#38bdf8",
  13: "#a855f7",
  14: "#f59e0b",
  15: "#10b981",
  3: "#22c55e",
  4: "#f43f5e",
  5: "#a855f7",
  6: "#6366f1",
  7: "#38bdf8",
  8: "#ec4899",
  10: "#ef4444"
};

const SHORTCUT_ITEMS = [
  "minimal-notch",
  2, 3, 10, 1, 13, 11, 12, 14, 15, 5, 8, 4, 6, 7, 0
];

export default function SettingsWindow() {
  const [activeNav, setActiveNav] = useState('general');

  // General Settings
  const [autoLaunch, setAutoLaunch] = useState(() => localStorage.getItem('auto-launch') === 'true');
  const [alwaysOnTop, setAlwaysOnTop] = useState(() => localStorage.getItem('always-on-top') !== 'false');
  const [hideWhenIdle, setHideWhenIdle] = useState(() => localStorage.getItem('hide-not-active-island') === 'true');
  const [showInfoIdle, setShowInfoIdle] = useState(() => localStorage.getItem('show-info-when-idle') !== 'false');
  const [weatherUnit, setWeatherUnit] = useState(() => localStorage.getItem('weather-unit') || 'c');

  // Appearance Settings
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'default');
  const [islandBorder, setIslandBorder] = useState(() => localStorage.getItem('island-border') !== 'false');
  const [textColor, setTextColor] = useState(() => localStorage.getItem('text-color') || '#FFFFFF');
  const [bgColor, setBgColor] = useState(() => localStorage.getItem('bg-color') || '#000000');

  // Smart Behavior
  const [minimalNotch, setMinimalNotch] = useState(false);
  const [smartBrowserAvoidance, setSmartBrowserAvoidance] = useState(() => localStorage.getItem('smart-browser-avoidance') !== 'false');
  const [mascotMode, setMascotMode] = useState(false);
  const [privacyDots, setPrivacyDots] = useState(() => localStorage.getItem('privacy-dots-enabled') === 'true');

  // Shortcuts
  const [shortcuts, setShortcuts] = useState(() => {
    try {
      const s = localStorage.getItem('quick_pill_tab_shortcuts');
      return s ? { ...DEFAULT_SHORTCUTS, ...JSON.parse(s) } : DEFAULT_SHORTCUTS;
    } catch {
      return DEFAULT_SHORTCUTS;
    }
  });
  const [recordingAction, setRecordingAction] = useState(null);
  const [shortcutNotice, setShortcutNotice] = useState(null);

  // Modules visibility
  const [hiddenTabs, setHiddenTabs] = useState(() => {
    try {
      const saved = localStorage.getItem('hidden-tabs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [6]; // Default: System Stats is hidden
  });

  // App version
  const [appVersion, setAppVersion] = useState('5.5.1');
  const [updateStatus, setUpdateStatus] = useState('idle');

  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(v => v && setAppVersion(v)).catch(() => {});
    }
    if (window.electronAPI?.getMinimalNotch) {
      window.electronAPI.getMinimalNotch().then(val => setMinimalNotch(Boolean(val))).catch(() => {});
    }
    if (window.electronAPI?.getSmartBrowserAvoidance) {
      window.electronAPI.getSmartBrowserAvoidance().then(val => {
        if (typeof val === 'boolean') setSmartBrowserAvoidance(val);
      }).catch(() => {});
    }
    if (window.electronAPI?.getMascotMode) {
      window.electronAPI.getMascotMode().then(val => setMascotMode(Boolean(val))).catch(() => {});
    }
    if (window.electronAPI?.getPrivacyDots) {
      window.electronAPI.getPrivacyDots().then(val => setPrivacyDots(Boolean(val))).catch(() => {});
    }
    if (window.electronAPI?.getAlwaysOnTop) {
      window.electronAPI.getAlwaysOnTop().then(val => setAlwaysOnTop(Boolean(val))).catch(() => {});
    }
    if (window.electronAPI?.getHiddenTabs) {
      window.electronAPI.getHiddenTabs().then(val => {
        if (Array.isArray(val)) setHiddenTabs(val);
      }).catch(() => {});
    }
    if (window.electronAPI?.shortcuts?.getTabShortcuts) {
      window.electronAPI.shortcuts.getTabShortcuts().then((saved) => {
        if (saved && typeof saved === 'object') {
          setShortcuts((prev) => ({ ...prev, ...saved }));
        }
      }).catch(() => {});
    }

    const unsubs = [];
    if (window.electronAPI?.onHiddenTabsChange) {
      unsubs.push(window.electronAPI.onHiddenTabsChange((val) => {
        if (Array.isArray(val)) setHiddenTabs(val);
      }));
    }
    if (window.electronAPI?.onSmartBrowserAvoidanceChange) {
      unsubs.push(window.electronAPI.onSmartBrowserAvoidanceChange((val) => {
        setSmartBrowserAvoidance(val);
      }));
    }
    if (window.electronAPI?.shortcuts?.onShortcutsUpdated) {
      unsubs.push(window.electronAPI.shortcuts.onShortcutsUpdated((updated) => {
        if (updated && typeof updated === 'object') {
          setShortcuts((prev) => ({ ...prev, ...updated }));
        }
      }));
    }

    return () => {
      unsubs.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, []);

  // Interactive Keydown Recorder for Shortcuts
  useEffect(() => {
    if (recordingAction === null) return;

    const handleRecordKey = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Escape cancels recording
      if (e.key === "Escape") {
        setRecordingAction(null);
        setShortcutNotice(null);
        return;
      }

      // Strictly disallow Ctrl / Meta (Click-Through feature exclusivity)
      if (e.ctrlKey || e.key === "Control" || e.metaKey || e.key === "Meta") {
        setShortcutNotice({ type: "error", message: "Ctrl is strictly reserved for Click-Through feature. Use Alt or Alt+Shift combinations." });
        return;
      }

      // Ignore bare Alt / Shift
      if (e.key === "Alt" || e.key === "Shift") {
        return;
      }

      let keyChar = e.key.toUpperCase();
      // Allow letters, numbers, and Function keys
      if (keyChar.length === 1 || (keyChar.startsWith("F") && !isNaN(keyChar.slice(1)))) {
        const parts = [];
        if (e.altKey) parts.push("Alt");
        if (e.shiftKey) parts.push("Shift");
        if (parts.length === 0) {
          parts.push("Alt");
        }
        parts.push(keyChar);
        const combo = parts.join("+");

        const updated = { ...shortcuts };
        let conflictName = null;

        for (const [key, existing] of Object.entries(updated)) {
          if (String(key) !== String(recordingAction) && existing && existing.toUpperCase() === combo) {
            conflictName = MODULE_NAMES[key] || `Tab ${key}`;
            updated[key] = ""; // clear from conflicted assignment
          }
        }

        updated[recordingAction] = combo;
        setShortcuts(updated);
        try {
          localStorage.setItem("quick_pill_tab_shortcuts", JSON.stringify(updated));
        } catch (_) {}

        if (window.electronAPI?.shortcuts?.setTabShortcuts) {
          window.electronAPI.shortcuts.setTabShortcuts(updated).catch(() => {});
        }

        setRecordingAction(null);
        if (conflictName) {
          setShortcutNotice({ type: "warning", message: `Assigned ${combo} (reassigned from ${conflictName})` });
        } else {
          setShortcutNotice({ type: "success", message: `Shortcut ${combo} registered successfully!` });
        }
        setTimeout(() => setShortcutNotice(null), 3500);
      } else {
        setShortcutNotice({ type: "error", message: "Press a letter (A-Z), digit (0-9), or F-key" });
      }
    };

    window.addEventListener("keydown", handleRecordKey, true);
    return () => {
      window.removeEventListener("keydown", handleRecordKey, true);
    };
  }, [recordingAction, shortcuts]);

  const handleClearShortcut = (key, e) => {
    e.stopPropagation();
    const updated = { ...shortcuts, [key]: "" };
    setShortcuts(updated);
    try {
      localStorage.setItem("quick_pill_tab_shortcuts", JSON.stringify(updated));
    } catch (_) {}
    if (window.electronAPI?.shortcuts?.setTabShortcuts) {
      window.electronAPI.shortcuts.setTabShortcuts(updated).catch(() => {});
    }
    setShortcutNotice({ type: "info", message: `Cleared shortcut for ${MODULE_NAMES[key] || key}` });
    setTimeout(() => setShortcutNotice(null), 2500);
  };

  const handleResetShortcuts = async () => {
    setShortcuts(DEFAULT_SHORTCUTS);
    setRecordingAction(null);
    try {
      localStorage.setItem("quick_pill_tab_shortcuts", JSON.stringify(DEFAULT_SHORTCUTS));
    } catch (_) {}
    if (window.electronAPI?.shortcuts?.resetTabShortcuts) {
      try {
        const res = await window.electronAPI.shortcuts.resetTabShortcuts();
        if (res?.shortcuts) setShortcuts(res.shortcuts);
      } catch (_) {}
    }
    setShortcutNotice({ type: "success", message: "Reset all shortcuts to defaults" });
    setTimeout(() => setShortcutNotice(null), 3000);
  };

  const handleMinimize = () => {
    if (window.electronAPI?.settingsWindow?.minimize) {
      window.electronAPI.settingsWindow.minimize();
    }
  };

  const handleClose = () => {
    if (window.electronAPI?.settingsWindow?.close) {
      window.electronAPI.settingsWindow.close();
    } else {
      window.close();
    }
  };

  const handleToggleAutoLaunch = (val) => {
    setAutoLaunch(val);
    localStorage.setItem('auto-launch', String(val));
    window.electronAPI?.setAutoLaunch?.(val);
  };

  const handleToggleAlwaysOnTop = (val) => {
    setAlwaysOnTop(val);
    localStorage.setItem('always-on-top', String(val));
    window.electronAPI?.setAlwaysOnTop?.(val);
  };

  const handleToggleMinimalNotch = (val) => {
    setMinimalNotch(val);
    localStorage.setItem('minimal-notch', String(val));
    window.electronAPI?.setMinimalNotch?.(val);
  };

  const handleToggleSmartBrowserAvoidance = (val) => {
    setSmartBrowserAvoidance(val);
    localStorage.setItem('smart-browser-avoidance', String(val));
    if (window.electronAPI?.setSmartBrowserAvoidance) {
      window.electronAPI.setSmartBrowserAvoidance(val).catch(() => {});
    }
  };

  const handleToggleMascotMode = (val) => {
    setMascotMode(val);
    localStorage.setItem('mascot-mode', String(val));
    window.electronAPI?.setMascotMode?.(val);
  };

  const handleTogglePrivacyDots = (val) => {
    setPrivacyDots(val);
    localStorage.setItem('privacy-dots-enabled', String(val));
    window.dispatchEvent(new Event('privacy-dots-changed'));
    window.electronAPI?.setPrivacyDots?.(val);
  };

  const handleToggleIslandBorder = (val) => {
    setIslandBorder(val);
    localStorage.setItem('island-border', String(val));
  };

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    try {
      if (window.electronAPI?.checkForUpdates) {
        await window.electronAPI.checkForUpdates();
      }
      setTimeout(() => setUpdateStatus('latest'), 1200);
    } catch {
      setUpdateStatus('error');
    }
  };

  const syncHiddenTabs = (newHidden) => {
    setHiddenTabs(newHidden);
    localStorage.setItem('hidden-tabs', JSON.stringify(newHidden));
    if (window.electronAPI?.setHiddenTabs) {
      window.electronAPI.setHiddenTabs(newHidden);
    }
  };

  const handleToggleModule = (id) => {
    const isCurrentlyHidden = hiddenTabs.includes(id);
    if (!isCurrentlyHidden) {
      const activeCount = MODULES_CONFIG.length - hiddenTabs.length;
      if (activeCount <= 1) {
        return; // Minimal 1 modul harus tetap aktif
      }
      syncHiddenTabs([...hiddenTabs, id]);
    } else {
      syncHiddenTabs(hiddenTabs.filter(t => t !== id));
    }
  };

  const handleEnableAllModules = () => {
    syncHiddenTabs([]);
  };

  const handleResetDefaultModules = () => {
    syncHiddenTabs([6]); // Default: System Stats (id 6) is hidden
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#121212',
      color: '#e5e7eb',
      fontFamily: 'OpenRunde, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      overflow: 'hidden',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxSizing: 'border-box'
    }}>
      {/* Titlebar */}
      <div style={{
        height: 38,
        background: '#18181b',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 0 0 14px',
        WebkitAppRegion: 'drag'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#38bdf8' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f3f4f6', letterSpacing: '-0.2px' }}>
            Quick Pill Settings
          </span>
          <span style={{ fontSize: 10, background: 'rgba(255, 255, 255, 0.08)', color: 'rgba(255,255,255,0.6)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
            v{appVersion}
          </span>
        </div>

        {/* Titlebar Window Controls */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', WebkitAppRegion: 'no-drag' }}>
          <button
            onClick={handleMinimize}
            title="Minimize"
            style={{
              width: 44,
              height: '100%',
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Minus size={13} />
          </button>
          <button
            onClick={handleClose}
            title="Close"
            style={{
              width: 44,
              height: '100%',
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ef4444';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{
          width: 190,
          background: '#161618',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          {[
            { id: 'general', label: 'General', icon: Settings },
            { id: 'appearance', label: 'Appearance', icon: Palette },
            { id: 'smart', label: 'Smart Behavior', icon: Sparkles },
            { id: 'modules', label: 'Modules', icon: Sliders },
            { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
            { id: 'about', label: 'About & Updates', icon: Info },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeNav === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveNav(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: isActive ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: isActive ? '#38bdf8' : '#9ca3af',
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Panel */}
        <div style={{
          flex: 1,
          padding: 24,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}>
          {activeNav === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px 0', color: '#ffffff' }}>General Settings</h2>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Configure system integration and idle behavior</p>
              </div>

              <div style={{ background: '#1c1c1f', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <SettingRow
                  title="Start with Windows"
                  desc="Automatically start Quick Pill upon system boot"
                  checked={autoLaunch}
                  onChange={handleToggleAutoLaunch}
                />
                <SettingRow
                  title="Always on Top"
                  desc="Keep the notch visible above all desktop applications"
                  checked={alwaysOnTop}
                  onChange={handleToggleAlwaysOnTop}
                />
                <SettingRow
                  title="Hide When Idle"
                  desc="Fade out the notch completely when no media or activity is running"
                  checked={hideWhenIdle}
                  onChange={(v) => {
                    setHideWhenIdle(v);
                    localStorage.setItem('hide-not-active-island', String(v));
                  }}
                />
                <SettingRow
                  title="Show Info When Idle"
                  desc="Display status indicator and clock in the compact notch"
                  checked={showInfoIdle}
                  onChange={(v) => {
                    setShowInfoIdle(v);
                    localStorage.setItem('show-info-when-idle', String(v));
                  }}
                  isLast
                />
              </div>

              <div style={{ background: '#1c1c1f', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Weather Temperature Unit</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Select preferred measurement system</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['c', 'f'].map(unit => (
                    <button
                      key={unit}
                      onClick={() => {
                        setWeatherUnit(unit);
                        localStorage.setItem('weather-unit', unit);
                      }}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: weatherUnit === unit ? '#38bdf8' : 'rgba(255,255,255,0.04)',
                        color: weatherUnit === unit ? '#000000' : '#ffffff',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      °{unit.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeNav === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px 0', color: '#ffffff' }}>Appearance & Aesthetics</h2>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Bezel-blended styling and visual tuning</p>
              </div>

              <div style={{ background: '#1c1c1f', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <SettingRow
                  title="Subtle Border Glow"
                  desc="Render refined inner edge highlight along notch boundaries"
                  checked={islandBorder}
                  onChange={handleToggleIslandBorder}
                  isLast
                />
              </div>

              <div style={{ background: '#1c1c1f', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Notch Ear Curvature</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Seamlessly blend the top notch corners into the monitor bezel</div>
                </div>
                <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, background: 'rgba(34,197,94,0.1)', padding: '3px 8px', borderRadius: 6 }}>
                  Active (Bezel Mask)
                </span>
              </div>
            </div>
          )}

          {activeNav === 'smart' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px 0', color: '#ffffff' }}>Smart Behavior & Modes</h2>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Intelligent obstruction avoidance and mascot companion</p>
              </div>

              <div style={{ background: '#1c1c1f', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <SettingRow
                  title="Minimal Notch (Force Micro-Strip)"
                  desc="Always stay in the ultra-slim 96x5px micro-strip to keep browser tabs visible"
                  checked={minimalNotch}
                  onChange={handleToggleMinimalNotch}
                />
                <SettingRow
                  title="Smart Browser Tab Obstruction Avoidance"
                  desc="Automatically retract into 96x5px Micro-Strip when Chrome, Edge, or IDE is maximized"
                  checked={smartBrowserAvoidance}
                  onChange={handleToggleSmartBrowserAvoidance}
                />
                <SettingRow
                  title="Animated Mascot Companion"
                  desc="Show blinking companion eyes in compact notch when no media is playing"
                  checked={mascotMode}
                  onChange={handleToggleMascotMode}
                />
                <SettingRow
                  title="Privacy Dots (Microphone & Camera Indicator)"
                  desc="Display status dots on the notch when desktop apps access your microphone or camera"
                  checked={privacyDots}
                  onChange={handleTogglePrivacyDots}
                  isLast
                />
              </div>
            </div>
          )}

          {activeNav === 'modules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Header with Title, Stats, and Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px 0', color: '#ffffff' }}>Manajemen Modul</h2>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                      {MODULES_CONFIG.length - hiddenTabs.length}
                    </span> dari {MODULES_CONFIG.length} modul aktif di Quick Pill
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={handleEnableAllModules}
                    title="Aktifkan semua modul sekaligus"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 7,
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      background: 'rgba(56, 189, 248, 0.12)',
                      color: '#38bdf8',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)';
                    }}
                  >
                    <Check size={13} />
                    <span>Aktifkan Semua</span>
                  </button>
                  <button
                    onClick={handleResetDefaultModules}
                    title="Kembalikan modul ke pengaturan default"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 7,
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#d1d5db',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = '#d1d5db';
                    }}
                  >
                    <RotateCcw size={12} />
                    <span>Reset Default</span>
                  </button>
                </div>
              </div>

              {/* Module List */}
              <div style={{
                background: '#1c1c1f',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.06)',
                overflow: 'hidden'
              }}>
                {MODULES_CONFIG.map((mod, index) => {
                  const Icon = mod.icon;
                  const isActive = !hiddenTabs.includes(mod.id);
                  const isLast = index === MODULES_CONFIG.length - 1;
                  const activeCount = MODULES_CONFIG.length - hiddenTabs.length;
                  const isLocked = isActive && activeCount <= 1;

                  return (
                    <div
                      key={mod.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderBottom: isLast ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                        background: isActive ? 'transparent' : 'rgba(0, 0, 0, 0.2)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Left: Icon & Title/Desc */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1, paddingRight: 12 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 9,
                          background: isActive ? `${mod.color}18` : 'rgba(255, 255, 255, 0.04)',
                          border: `1px solid ${isActive ? `${mod.color}40` : 'rgba(255, 255, 255, 0.08)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.2s ease'
                        }}>
                          <Icon size={18} color={isActive ? mod.color : '#6b7280'} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                          <span style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: isActive ? '#ffffff' : '#9ca3af',
                            letterSpacing: '-0.1px'
                          }}>
                            {mod.name}
                          </span>
                          <span style={{
                            fontSize: 11,
                            color: isActive ? '#9ca3af' : '#6b7280',
                            lineHeight: 1.3
                          }}>
                            {mod.desc}
                          </span>
                        </div>
                      </div>

                      {/* Right: Badge & Toggle Switch */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 5,
                          background: isActive ? 'rgba(34, 197, 94, 0.14)' : 'rgba(255, 255, 255, 0.05)',
                          color: isActive ? '#4ade80' : '#6b7280',
                          border: `1px solid ${isActive ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255, 255, 255, 0.08)'}`,
                          letterSpacing: '0.2px'
                        }}>
                          {isActive ? 'Aktif' : 'Nonaktif'}
                        </span>

                        <label
                          title={isLocked ? 'Minimal 1 modul harus tetap aktif' : (isActive ? 'Nonaktifkan modul' : 'Aktifkan modul')}
                          style={{
                            position: 'relative',
                            display: 'inline-block',
                            width: 38,
                            height: 22,
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            opacity: isLocked ? 0.6 : 1,
                            flexShrink: 0
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isActive}
                            disabled={isLocked}
                            onChange={() => handleToggleModule(mod.id)}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: isActive ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)',
                            transition: '0.2s',
                            borderRadius: 22
                          }}>
                            <span style={{
                              position: 'absolute',
                              height: 16,
                              width: 16,
                              left: isActive ? 19 : 3,
                              bottom: 3,
                              backgroundColor: isActive ? '#000000' : '#ffffff',
                              transition: '0.2s',
                              borderRadius: '50%'
                            }} />
                          </span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeNav === 'shortcuts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Header with Title and Reset button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px 0', color: '#ffffff' }}>Global Shortcuts</h2>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Customizable global hotkeys to switch tabs and force toggle minimal notch</p>
                </div>
                <button
                  onClick={handleResetShortcuts}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 7,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#ffffff',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Reset All</span>
                </button>
              </div>

              {/* Status / Feedback Notice Banner */}
              {shortcutNotice && (
                <div style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: shortcutNotice.type === 'error'
                    ? 'rgba(239, 68, 68, 0.15)'
                    : shortcutNotice.type === 'warning'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : shortcutNotice.type === 'success'
                        ? 'rgba(34, 197, 94, 0.15)'
                        : 'rgba(56, 189, 248, 0.15)',
                  border: shortcutNotice.type === 'error'
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : shortcutNotice.type === 'warning'
                      ? '1px solid rgba(245, 158, 11, 0.3)'
                      : shortcutNotice.type === 'success'
                        ? '1px solid rgba(34, 197, 94, 0.3)'
                        : '1px solid rgba(56, 189, 248, 0.3)',
                  color: shortcutNotice.type === 'error'
                    ? '#f87171'
                    : shortcutNotice.type === 'warning'
                      ? '#fbbf24'
                      : shortcutNotice.type === 'success'
                        ? '#4ade80'
                        : '#38bdf8'
                }}>
                  {shortcutNotice.message}
                </div>
              )}

              {/* Shortcuts List */}
              <div style={{ background: '#1c1c1f', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', padding: '6px 12px' }}>
                {SHORTCUT_ITEMS.map((key, idx, arr) => {
                  const Icon = MODULE_ICONS[key] || Keyboard;
                  const name = MODULE_NAMES[key] || `Tab ${key}`;
                  const desc = MODULE_DESCRIPTIONS[key] || "";
                  const color = MODULE_COLORS[key] || "#38bdf8";
                  const currentCombo = shortcuts[key];
                  const isRecording = recordingAction === key;
                  const isMinimalNotch = key === "minimal-notch";

                  return (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 4px',
                        borderBottom: idx === arr.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                        background: isRecording ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
                        borderRadius: isRecording ? 8 : 0,
                        transition: 'background 0.2s ease'
                      }}
                    >
                      {/* Left: Icon + Name + Description */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: `${color}18`,
                          border: `1px solid ${color}30`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Icon size={15} color={color} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, paddingRight: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, color: '#ffffff', fontWeight: 700 }}>
                              {name}
                            </span>
                            {isMinimalNotch && (
                              <span style={{
                                fontSize: 9,
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: 'rgba(56, 189, 248, 0.15)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                textTransform: 'uppercase'
                              }}>
                                Force Toggle
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {desc}
                          </span>
                        </div>
                      </div>

                      {/* Right: Shortcut Recorder / Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {isRecording ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '5px 12px',
                              borderRadius: 6,
                              background: 'rgba(56, 189, 248, 0.18)',
                              border: '1px solid #38bdf8',
                              boxShadow: '0 0 10px rgba(56, 189, 248, 0.3)',
                              color: '#38bdf8',
                              fontSize: 11,
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              cursor: 'pointer'
                            }}
                            onClick={() => setRecordingAction(null)}
                            title="Click or press Esc to cancel"
                          >
                            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#38bdf8' }} />
                            <span>Press keys... (Esc to cancel)</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <kbd
                              onClick={() => {
                                setRecordingAction(key);
                                setShortcutNotice(null);
                              }}
                              title="Click to record new shortcut"
                              style={{
                                cursor: 'pointer',
                                background: currentCombo ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                                border: currentCombo ? '1px solid rgba(56, 189, 248, 0.28)' : '1px dashed rgba(255, 255, 255, 0.18)',
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                color: currentCombo ? '#38bdf8' : '#9ca3af',
                                fontFamily: 'monospace',
                                transition: 'all 0.15s ease',
                                userSelect: 'none'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#38bdf8';
                                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = currentCombo ? 'rgba(56, 189, 248, 0.28)' : 'rgba(255, 255, 255, 0.18)';
                                e.currentTarget.style.background = currentCombo ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.05)';
                              }}
                            >
                              {currentCombo || "+ Add Shortcut"}
                            </kbd>
                            {Boolean(currentCombo) && (
                              <button
                                onClick={(e) => handleClearShortcut(key, e)}
                                title="Unbind / Clear shortcut"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#6b7280',
                                  cursor: 'pointer',
                                  padding: 4,
                                  borderRadius: 4,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'color 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#ef4444';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = '#6b7280';
                                }}
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeNav === 'about' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px 0', color: '#ffffff' }}>About Quick Pill</h2>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>The ultimate desktop dynamic notch for Windows</p>
              </div>

              <div style={{ background: '#1c1c1f', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#ffffff' }}>Quick Pill v{appVersion}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>Created by Abrar Nabil (MIT License)</div>
                  </div>
                  <button
                    onClick={handleCheckUpdate}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#0284c7',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {updateStatus === 'checking' ? 'Checking...' : updateStatus === 'latest' ? 'Up to date!' : 'Check for Updates'}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                  Quick Pill brings the elegance of the Dynamic Island to Windows with zero latency, hardware obstruction detection, media controls, and multi-workspace app launching.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingRow({ title, desc, checked, onChange, disabled, badge, isLast }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: isLast ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
      opacity: disabled ? 0.8 : 1
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>{title}</span>
          {badge && (
            <span style={{ fontSize: 9.5, fontWeight: 700, background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 6px', borderRadius: 4 }}>
              {badge}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>{desc}</span>
      </div>

      <label style={{ position: 'relative', display: 'inline-block', width: 38, height: 22, cursor: disabled ? 'default' : 'pointer', flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          style={{ opacity: 0, width: 0, height: 0 }}
        />
        <span style={{
          position: 'absolute',
          cursor: disabled ? 'default' : 'pointer',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: checked ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)',
          transition: '0.2s',
          borderRadius: 22
        }}>
          <span style={{
            position: 'absolute',
            content: '""',
            height: 16,
            width: 16,
            left: checked ? 19 : 3,
            bottom: 3,
            backgroundColor: checked ? '#000000' : '#ffffff',
            transition: '0.2s',
            borderRadius: '50%'
          }} />
        </span>
      </label>
    </div>
  );
}
