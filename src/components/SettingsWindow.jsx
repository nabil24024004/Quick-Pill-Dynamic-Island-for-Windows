import React, { useState, useEffect } from 'react';
import { 
  Settings, Palette, Sliders, Keyboard, Info, Check, X, Minus, 
  RotateCcw, Sparkles, Monitor, Bell, ExternalLink, ShieldAlert, Cpu,
  Music, Droplet, Clock, Timer, Inbox, BatteryCharging, SlidersHorizontal,
  Compass, FileText, CheckSquare, Calendar, Activity, List, Search,
  Trash2, Plus, ArrowUp, ArrowDown, Globe, Play, Bot, Zap, Power,
  ChevronUp, ChevronDown, Download, RefreshCw, AlertCircle, CheckCircle2
} from 'lucide-react';
import { DEFAULT_LAUNCHER_SHORTCUTS } from './AppLauncher';

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
  { id: 16, name: "Ask AI", desc: "Local JARVIS AI companion query & assistant", icon: Bot, color: "#c084fc" },
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
  16: "Alt+I",  // Ask AI
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
  16: "Ask AI",
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
  16: "Local JARVIS AI companion query & assistant",
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
  16: Bot,
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
  16: "#c084fc",
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
  2, 3, 10, 1, 13, 11, 12, 14, 15, 16, 5, 8, 4, 6, 7, 0
];


export default function SettingsWindow() {
  const [activeNav, setActiveNav] = useState('general');

  // General Settings
  const [autoLaunch, setAutoLaunch] = useState(() => localStorage.getItem('auto-launch') !== 'false');
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

  // Modules visibility and order
  const [hiddenTabs, setHiddenTabs] = useState(() => {
    try {
      const saved = localStorage.getItem('hidden-tabs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [6]; // Default: System Stats is hidden
  });

  const [tabOrder, setTabOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('tab-order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [2, 11, 12, 13, 14, 15, 16, 4, 5, 6, 7, 8, 10, 0, 1, 3];
  });

  // Curated Launcher Shortcuts
  const [launcherShortcuts, setLauncherShortcuts] = useState(() => {
    try {
      const saved = localStorage.getItem('qp_curated_shortcuts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_LAUNCHER_SHORTCUTS;
  });
  const [isAddingWeb, setIsAddingWeb] = useState(false);
  const [webName, setWebName] = useState('');
  const [webUrl, setWebUrl] = useState('');

  // JARVIS Integration Settings
  const [jarvisEnabled, setJarvisEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis-enabled');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });
  const [jarvisEndpoint, setJarvisEndpoint] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis-endpoint');
      if (saved && saved !== 'http://localhost:5000/api/ask') return saved;
    } catch {}
    return 'http://127.0.0.1:8765/api/process';
  });
  const [jarvisStatus, setJarvisStatus] = useState('idle'); // 'idle' | 'testing' | 'connected' | 'offline'
  const [jarvisStatusDetails, setJarvisStatusDetails] = useState('');
  const [jarvisSavedFeedback, setJarvisSavedFeedback] = useState(false);

  // App version & Auto-updater
  const [appVersion, setAppVersion] = useState('5.5.1');
  const [updateStatus, setUpdateStatus] = useState('idle'); // 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({ percent: 0, transferredBytes: 0, totalBytes: 0, speedBytesPerSec: 0 });
  const [updateError, setUpdateError] = useState('');
  const [autoDownloadInstall, setAutoDownloadInstall] = useState(true);
  const [desktopShortcutStatus, setDesktopShortcutStatus] = useState(null); // null | 'created' | 'error'

  useEffect(() => {
    const safeRead = async (apiFn, setter) => {
      try {
        if (typeof apiFn === 'function') {
          const res = await apiFn();
          if (res !== undefined && res !== null) {
            setter(res);
          }
        }
      } catch (e) {
        // Safe degrade without crashing ErrorBoundary
      }
    };

    safeRead(window.electronAPI?.getAppVersion, v => v && setAppVersion(v));
    safeRead(window.electronAPI?.getAutoLaunch, val => {
      if (typeof val === 'boolean') {
        setAutoLaunch(val);
        localStorage.setItem('auto-launch', String(val));
      }
    });
    safeRead(window.electronAPI?.getMinimalNotch, val => setMinimalNotch(Boolean(val)));
    safeRead(window.electronAPI?.getSmartBrowserAvoidance, val => {
      if (typeof val === 'boolean') setSmartBrowserAvoidance(val);
    });
    safeRead(window.electronAPI?.getMascotMode, val => setMascotMode(Boolean(val)));
    safeRead(window.electronAPI?.getPrivacyDots, val => setPrivacyDots(Boolean(val)));
    safeRead(window.electronAPI?.getAlwaysOnTop, val => setAlwaysOnTop(Boolean(val)));
    safeRead(window.electronAPI?.getHiddenTabs, val => {
      if (Array.isArray(val)) setHiddenTabs(val);
    });
    safeRead(window.electronAPI?.getJarvisConfig, cfg => {
      if (cfg && typeof cfg === 'object') {
        if (typeof cfg.enabled === 'boolean') {
          setJarvisEnabled(cfg.enabled);
          localStorage.setItem('jarvis-enabled', String(cfg.enabled));
        }
        if (typeof cfg.endpoint === 'string' && cfg.endpoint) {
          setJarvisEndpoint(cfg.endpoint);
          localStorage.setItem('jarvis-endpoint', cfg.endpoint);
        }
      }
    });
    safeRead(window.electronAPI?.shortcuts?.getTabShortcuts, saved => {
      if (saved && typeof saved === 'object') {
        setShortcuts(prev => ({ ...prev, ...saved }));
      }
    });
    safeRead(window.electronAPI?.getTabOrder, val => {
      if (Array.isArray(val) && val.length > 0) setTabOrder(val);
    });
    safeRead(window.electronAPI?.getUpdaterState, state => {
      if (state && typeof state === 'object') {
        if (state.status) setUpdateStatus(state.status);
        if (state.updateInfo) setUpdateInfo(state.updateInfo);
      }
    });
    safeRead(window.electronAPI?.getAutoDownloadInstall, val => {
      if (typeof val === 'boolean') setAutoDownloadInstall(val);
    });

    const unsubs = [];
    try {
      if (window.electronAPI?.onHiddenTabsChange) {
        unsubs.push(window.electronAPI.onHiddenTabsChange((val) => {
          if (Array.isArray(val)) setHiddenTabs(val);
        }));
      }
      if (window.electronAPI?.onTabOrderChange) {
        unsubs.push(window.electronAPI.onTabOrderChange((val) => {
          if (Array.isArray(val) && val.length > 0) {
            setTabOrder(val);
            localStorage.setItem('tab-order', JSON.stringify(val));
          }
        }));
      }
      if (window.electronAPI?.onUpdateEvent) {
        unsubs.push(window.electronAPI.onUpdateEvent(({ event, data }) => {
          if (event === "checking") {
            setUpdateStatus("checking");
            setUpdateError("");
          } else if (event === "available") {
            setUpdateStatus("available");
            setUpdateInfo(data);
          } else if (event === "not-available") {
            setUpdateStatus("not-available");
            setUpdateInfo(null);
          } else if (event === "download-started") {
            setUpdateStatus("downloading");
          } else if (event === "download-progress") {
            setUpdateStatus("downloading");
            setDownloadProgress(data);
          } else if (event === "downloaded") {
            setUpdateStatus("downloaded");
          } else if (event === "cancelled") {
            setUpdateStatus("available");
          } else if (event === "error") {
            setUpdateStatus("error");
            setUpdateError(typeof data === "string" ? data : "Update error");
          }
        }));
      }
      if (window.electronAPI?.onAutoLaunchChange) {
        unsubs.push(window.electronAPI.onAutoLaunchChange((val) => {
          if (typeof val === 'boolean') {
            setAutoLaunch(val);
            localStorage.setItem('auto-launch', String(val));
          }
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
      if (window.electronAPI?.onJarvisConfigUpdate) {
        unsubs.push(window.electronAPI.onJarvisConfigUpdate((cfg) => {
          if (cfg && typeof cfg === 'object') {
            if (typeof cfg.enabled === 'boolean') setJarvisEnabled(cfg.enabled);
            if (typeof cfg.endpoint === 'string') setJarvisEndpoint(cfg.endpoint);
          }
        }));
      }
    } catch (_) {}

    return () => {
      unsubs.forEach(unsub => {
        try {
          if (typeof unsub === 'function') unsub();
        } catch (_) {}
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

  const handleCreateDesktopShortcut = async () => {
    try {
      if (window.electronAPI?.createDesktopShortcut) {
        const res = await window.electronAPI.createDesktopShortcut();
        if (res && res.success) {
          setDesktopShortcutStatus('created');
          setTimeout(() => setDesktopShortcutStatus(null), 3000);
        } else {
          setDesktopShortcutStatus('error');
          setTimeout(() => setDesktopShortcutStatus(null), 3000);
        }
      }
    } catch (_) {
      setDesktopShortcutStatus('error');
      setTimeout(() => setDesktopShortcutStatus(null), 3000);
    }
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

  // Sort modules dynamically according to tabOrder
  const sortedModules = React.useMemo(() => {
    const list = [...MODULES_CONFIG];
    return list.sort((a, b) => {
      const idxA = tabOrder.indexOf(a.id);
      const idxB = tabOrder.indexOf(b.id);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
  }, [tabOrder]);

  const syncTabOrder = (newOrder) => {
    setTabOrder(newOrder);
    localStorage.setItem('tab-order', JSON.stringify(newOrder));
    if (window.electronAPI?.setTabOrder) {
      window.electronAPI.setTabOrder(newOrder);
    }
  };

  const moveModuleOrder = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= sortedModules.length) return;
    const newSorted = [...sortedModules];
    const [moved] = newSorted.splice(fromIdx, 1);
    newSorted.splice(toIdx, 0, moved);
    const newOrderIds = newSorted.map(m => m.id);
    syncTabOrder(newOrderIds);
  };

  const handleResetModuleOrder = () => {
    const defaultOrder = [2, 11, 12, 13, 14, 15, 16, 4, 5, 6, 7, 8, 10, 0, 1, 3];
    syncTabOrder(defaultOrder);
  };

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    setUpdateError('');
    try {
      if (window.electronAPI?.checkForUpdates) {
        const res = await window.electronAPI.checkForUpdates();
        if (res?.status === 'available') {
          setUpdateStatus('available');
          setUpdateInfo(res.updateInfo);
        } else if (res?.status === 'not-available') {
          setUpdateStatus('not-available');
          setUpdateInfo(null);
        } else if (res?.status === 'error') {
          setUpdateStatus('error');
          setUpdateError(res.error || 'Gagal terhubung ke server update.');
        }
      }
    } catch (err) {
      setUpdateStatus('error');
      setUpdateError(err.message || 'Gagal memeriksa pembaruan.');
    }
  };

  const handleStartDownload = async () => {
    setUpdateStatus('downloading');
    setUpdateError('');
    try {
      if (window.electronAPI?.startUpdateDownload) {
        await window.electronAPI.startUpdateDownload();
      }
    } catch (err) {
      setUpdateStatus('error');
      setUpdateError(err.message || 'Gagal mengunduh pembaruan.');
    }
  };

  const handleCancelDownload = () => {
    if (window.electronAPI?.cancelUpdateDownload) {
      window.electronAPI.cancelUpdateDownload();
      setUpdateStatus('available');
    }
  };

  const handleInstallUpdate = () => {
    if (window.electronAPI?.installUpdate) {
      window.electronAPI.installUpdate();
    }
  };

  const handleToggleAutoDownload = (checked) => {
    setAutoDownloadInstall(checked);
    if (window.electronAPI?.setAutoDownloadInstall) {
      window.electronAPI.setAutoDownloadInstall(checked);
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

  const saveLauncherShortcuts = (updated) => {
    setLauncherShortcuts(updated);
    localStorage.setItem('qp_curated_shortcuts', JSON.stringify(updated));
    window.dispatchEvent(new Event('qp_shortcuts_updated'));
  };

  const handleAddApp = async () => {
    try {
      if (window.electronAPI?.launcher?.selectFile) {
        const res = await window.electronAPI.launcher.selectFile();
        if (!res.canceled && res.filePath) {
          const newApp = {
            id: 'app_' + Date.now(),
            type: 'app',
            name: res.name || 'Application',
            target: res.filePath,
            icon: null
          };
          saveLauncherShortcuts([...launcherShortcuts, newApp]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddWeb = (e) => {
    e?.preventDefault();
    if (!webUrl.trim()) return;
    let url = webUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    let name = webName.trim();
    if (!name) {
      try {
        name = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        name = 'Website';
      }
    }
    const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`;
    const newWeb = {
      id: 'web_' + Date.now(),
      type: 'url',
      name,
      target: url,
      icon: faviconUrl
    };
    saveLauncherShortcuts([...launcherShortcuts, newWeb]);
    setWebName('');
    setWebUrl('');
    setIsAddingWeb(false);
  };

  const handleDeleteShortcut = (id) => {
    saveLauncherShortcuts((launcherShortcuts || []).filter(s => s && s.id !== id));
  };

  const handleMoveShortcut = (idx, dir) => {
    const list = launcherShortcuts || [];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const updated = [...list];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    saveLauncherShortcuts(updated);
  };

  const handleResetLauncherShortcuts = () => {
    saveLauncherShortcuts(DEFAULT_LAUNCHER_SHORTCUTS);
  };

  const handleToggleJarvis = async (val) => {
    setJarvisEnabled(val);
    localStorage.setItem('jarvis-enabled', String(val));
    if (window.electronAPI?.setJarvisConfig) {
      await window.electronAPI.setJarvisConfig({ enabled: val });
    }
  };

  const handleSaveJarvisEndpoint = async () => {
    const trimmed = jarvisEndpoint.trim() || 'http://127.0.0.1:8765/api/process';
    setJarvisEndpoint(trimmed);
    localStorage.setItem('jarvis-endpoint', trimmed);
    if (window.electronAPI?.setJarvisConfig) {
      await window.electronAPI.setJarvisConfig({ endpoint: trimmed });
    }
    setJarvisSavedFeedback(true);
    setTimeout(() => setJarvisSavedFeedback(false), 2000);
  };

  const handleResetJarvisEndpoint = async () => {
    const def = 'http://127.0.0.1:8765/api/process';
    setJarvisEndpoint(def);
    localStorage.setItem('jarvis-endpoint', def);
    if (window.electronAPI?.setJarvisConfig) {
      await window.electronAPI.setJarvisConfig({ endpoint: def });
    }
    setJarvisSavedFeedback(true);
    setTimeout(() => setJarvisSavedFeedback(false), 2000);
  };

  const handleTestJarvis = async () => {
    setJarvisStatus('testing');
    setJarvisStatusDetails('');
    try {
      if (window.electronAPI?.testJarvisConnection) {
        const res = await window.electronAPI.testJarvisConnection(jarvisEndpoint);
        if (res?.connected) {
          setJarvisStatus('connected');
          setJarvisStatusDetails(res.details || 'Server is responding');
        } else {
          setJarvisStatus('offline');
          setJarvisStatusDetails(res?.error || 'JARVIS local server offline. Make sure D:/JARVIS is running.');
        }
      } else {
        setJarvisStatus('offline');
        setJarvisStatusDetails('Test connection API unavailable');
      }
    } catch (e) {
      setJarvisStatus('offline');
      setJarvisStatusDetails(e.message || 'Connection test failed');
    }
  };

  const handleStopJarvis = async () => {
    setJarvisStatus('testing');
    setJarvisStatusDetails('Stopping JARVIS & releasing memory...');
    try {
      if (window.electronAPI?.stopJarvisServer) {
        await window.electronAPI.stopJarvisServer();
        setTimeout(() => {
          handleTestJarvis();
        }, 1200);
      } else {
        setJarvisStatus('offline');
        setJarvisStatusDetails('Stop API unavailable');
      }
    } catch (e) {
      setJarvisStatus('offline');
      setJarvisStatusDetails(e.message || 'Failed to stop JARVIS');
    }
  };

  const handleLaunchJarvis = async () => {
    setJarvisStatus('testing');
    setJarvisStatusDetails('Starting D:/JARVIS (run_gui.bat)...');
    try {
      if (window.electronAPI?.launchJarvisServer) {
        const res = await window.electronAPI.launchJarvisServer();
        if (res?.success) {
          setTimeout(() => {
            handleTestJarvis();
          }, 3000);
        } else {
          setJarvisStatus('offline');
          setJarvisStatusDetails(res?.error || 'Could not launch D:/JARVIS');
        }
      } else {
        setJarvisStatus('offline');
        setJarvisStatusDetails('Launch API unavailable');
      }
    } catch (e) {
      setJarvisStatus('offline');
      setJarvisStatusDetails(e.message || 'Failed to start JARVIS');
    }
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
            { id: 'launcher', label: 'Launcher', icon: Compass },
            { id: 'jarvis', label: 'JARVIS AI', icon: Bot },
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
                />
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Desktop Shortcut</span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Create a shortcut on your desktop for quick launch</span>
                  </div>
                  <button
                    onClick={handleCreateDesktopShortcut}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: '1px solid ' + (desktopShortcutStatus === 'created' ? 'rgba(34, 197, 94, 0.4)' : desktopShortcutStatus === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.3)'),
                      background: desktopShortcutStatus === 'created' ? 'rgba(34, 197, 94, 0.15)' : desktopShortcutStatus === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.12)',
                      color: desktopShortcutStatus === 'created' ? '#4ade80' : desktopShortcutStatus === 'error' ? '#f87171' : '#38bdf8',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {desktopShortcutStatus === 'created' ? (
                      <>
                        <Check size={13} />
                        <span>Shortcut Dibuat</span>
                      </>
                    ) : desktopShortcutStatus === 'error' ? (
                      <>
                        <AlertCircle size={13} />
                        <span>Gagal Membuat</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>Buat Shortcut di Desktop</span>
                      </>
                    )}
                  </button>
                </div>
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
                    onClick={handleResetModuleOrder}
                    title="Kembalikan urutan modul ke pengaturan default"
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
                    <span>Reset Urutan</span>
                  </button>
                  <button
                    onClick={handleResetDefaultModules}
                    title="Kembalikan visibilitas modul ke pengaturan default"
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
                    <span>Reset Visibilitas</span>
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
                {sortedModules.map((mod, index) => {
                  const Icon = mod.icon;
                  const isActive = !hiddenTabs.includes(mod.id);
                  const isLast = index === sortedModules.length - 1;
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
                      {/* Left: Index, Icon & Title/Desc */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1, paddingRight: 12 }}>
                        <div style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: '#9ca3af',
                          fontSize: 10,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          #{index + 1}
                        </div>
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

                      {/* Right: Move Buttons, Badge & Toggle Switch */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        {/* Move Up / Down Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => moveModuleOrder(index, index - 1)}
                            disabled={index === 0}
                            title="Geser modul ke atas"
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              background: index === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.04)',
                              color: index === 0 ? 'rgba(255, 255, 255, 0.2)' : '#d1d5db',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: index === 0 ? 'default' : 'pointer',
                              transition: 'all 0.12s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (index !== 0) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              if (index !== 0) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                            }}
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveModuleOrder(index, index + 1)}
                            disabled={index === sortedModules.length - 1}
                            title="Geser modul ke bawah"
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              background: index === sortedModules.length - 1 ? 'transparent' : 'rgba(255, 255, 255, 0.04)',
                              color: index === sortedModules.length - 1 ? 'rgba(255, 255, 255, 0.2)' : '#d1d5db',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: index === sortedModules.length - 1 ? 'default' : 'pointer',
                              transition: 'all 0.12s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (index !== sortedModules.length - 1) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              if (index !== sortedModules.length - 1) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                            }}
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>

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

          {activeNav === 'launcher' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px 0', color: '#ffffff' }}>Launcher Shortcuts</h2>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Configure curated desktop applications and web shortcuts for your Quick Pill dock.</p>
                </div>
                <button
                  onClick={handleResetLauncherShortcuts}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#e5e7eb',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={12} />
                  Reset Defaults
                </button>
              </div>

              {/* Action Buttons: Add App & Add Website */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleAddApp}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 9,
                    background: '#38bdf8',
                    border: 'none',
                    color: '#000000',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} />
                  Add Application (.exe / .lnk)
                </button>
                <button
                  onClick={() => setIsAddingWeb(prev => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 9,
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Globe size={14} />
                  {isAddingWeb ? 'Cancel' : 'Add Website Shortcut'}
                </button>
              </div>

              {/* Inline Add Website Form */}
              {isAddingWeb && (
                <form
                  onSubmit={handleAddWeb}
                  style={{
                    background: '#1c1c1f',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: 12,
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Add Website Shortcut</span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      type="text"
                      placeholder="Website Name (e.g. Notion)"
                      value={webName}
                      onChange={(e) => setWebName(e.target.value)}
                      style={{
                        flex: 1,
                        background: '#121212',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        color: '#ffffff',
                        fontSize: 12,
                        outline: 'none'
                      }}
                    />
                    <input
                      type="text"
                      placeholder="URL (e.g. https://notion.so)"
                      value={webUrl}
                      onChange={(e) => setWebUrl(e.target.value)}
                      style={{
                        flex: 1.5,
                        background: '#121212',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        color: '#ffffff',
                        fontSize: 12,
                        outline: 'none'
                      }}
                      required
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: '#38bdf8',
                        color: '#000000',
                        fontWeight: 700,
                        fontSize: 12,
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}

              {/* Shortcuts List */}
              <div style={{
                background: '#1c1c1f',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.06)',
                overflow: 'hidden'
              }}>
                {(!launcherShortcuts || launcherShortcuts.length === 0) ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                    No shortcuts added yet. Click &quot;Add Application&quot; or &quot;Add Website Shortcut&quot; above.
                  </div>
                ) : (
                  (launcherShortcuts || []).map((item, idx) => {
                    if (!item) return null;
                    return (
                    <div
                      key={item?.id || (item?.target ? `${item.target}_${idx}` : `shortcut_${idx}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderBottom: idx === (launcherShortcuts || []).length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: 'rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}>
                          {item.icon ? (
                            <img src={item.icon} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          ) : item.type === 'url' ? (
                            <Globe size={18} color="#38bdf8" />
                          ) : (
                            <Play size={16} color="#ffffff" />
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.name}
                            </span>
                            <span style={{
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '1px 5px',
                              borderRadius: 4,
                              background: item.type === 'url' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                              color: item.type === 'url' ? '#38bdf8' : '#22c55e'
                            }}>
                              {item.type === 'url' ? 'Web' : 'App'}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.target}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => handleMoveShortcut(idx, -1)}
                          disabled={idx === 0}
                          title="Move Up"
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: 'none',
                            color: idx === 0 ? 'rgba(255, 255, 255, 0.2)' : '#ffffff',
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: idx === 0 ? 'default' : 'pointer'
                          }}
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          onClick={() => handleMoveShortcut(idx, 1)}
                          disabled={idx === (launcherShortcuts?.length || 0) - 1}
                          title="Move Down"
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: 'none',
                            color: idx === (launcherShortcuts?.length || 0) - 1 ? 'rgba(255, 255, 255, 0.2)' : '#ffffff',
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: idx === (launcherShortcuts?.length || 0) - 1 ? 'default' : 'pointer'
                          }}
                        >
                          <ArrowDown size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteShortcut(item.id)}
                          title="Delete shortcut"
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: 'none',
                            color: '#ef4444',
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
                )}
              </div>
            </div>
          )}

          {activeNav === 'jarvis' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px 0', color: '#ffffff' }}>JARVIS AI Integration</h2>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Connect Quick Pill directly to your local JARVIS AI instance</p>
              </div>

              {/* 1. Toggle Enable / Disable */}
              <div style={{ background: '#1c1c1f', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Enable JARVIS Integration</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Allow the Ask AI tab to route questions and commands to your local JARVIS model</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleJarvis(!jarvisEnabled)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 999,
                    border: 'none',
                    background: jarvisEnabled ? '#a855f7' : 'rgba(255, 255, 255, 0.12)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s',
                    padding: 0
                  }}
                >
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#ffffff',
                    position: 'absolute',
                    top: 3,
                    left: jarvisEnabled ? 23 : 3,
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                  }} />
                </button>
              </div>

              {/* 2. Endpoint Configuration */}
              <div style={{ background: '#1c1c1f', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Local API URL Endpoint</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                    The HTTP address of your local JARVIS server (running at D:/JARVIS). Default: <code>http://127.0.0.1:8765/api/process</code>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={jarvisEndpoint}
                    onChange={(e) => setJarvisEndpoint(e.target.value)}
                    placeholder="http://127.0.0.1:8765/api/process"
                    style={{
                      flex: 1,
                      height: 36,
                      background: '#121212',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 8,
                      padding: '0 12px',
                      color: '#ffffff',
                      fontSize: 12,
                      outline: 'none',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveJarvisEndpoint}
                    style={{
                      height: 36,
                      padding: '0 16px',
                      background: jarvisSavedFeedback ? '#22c55e' : '#ffffff',
                      color: '#000000',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      transition: 'all 0.15s'
                    }}
                  >
                    {jarvisSavedFeedback ? <Check size={13} color="#000" /> : null}
                    <span>{jarvisSavedFeedback ? 'Saved' : 'Save'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetJarvisEndpoint}
                    title="Reset to default (http://127.0.0.1:8765/api/process)"
                    style={{
                      height: 36,
                      padding: '0 12px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: '#e5e7eb',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* 3. Connection Status & Test */}
              <div style={{ background: '#1c1c1f', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Connection Diagnostic</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Verify reachability of your local JARVIS backend</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {jarvisStatus === 'connected' ? (
                      <button
                        type="button"
                        onClick={handleStopJarvis}
                        disabled={jarvisStatus === 'testing'}
                        title="Shut down JARVIS and release RAM/CPU"
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(239, 68, 68, 0.14)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          borderRadius: 8,
                          color: '#f87171',
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        <Power size={12} color="#f87171" />
                        <span>Stop JARVIS</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleLaunchJarvis}
                        disabled={jarvisStatus === 'testing'}
                        title="Launch D:/JARVIS/run_gui.bat"
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(234, 179, 8, 0.12)',
                          border: '1px solid rgba(234, 179, 8, 0.28)',
                          borderRadius: 8,
                          color: '#facc15',
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        <Zap size={12} color="#facc15" />
                        <span>Start JARVIS</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleTestJarvis}
                      disabled={jarvisStatus === 'testing'}
                      style={{
                        padding: '6px 14px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        borderRadius: 8,
                        color: '#ffffff',
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: jarvisStatus === 'testing' ? 'default' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s'
                      }}
                    >
                      <RotateCcw size={12} className={jarvisStatus === 'testing' ? 'ai-pulse-spin' : ''} />
                      <span>{jarvisStatus === 'testing' ? 'Testing...' : 'Test Connection'}</span>
                    </button>
                  </div>
                </div>

                {/* Status Indicator */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: jarvisStatus === 'connected'
                    ? 'rgba(34, 197, 94, 0.12)'
                    : jarvisStatus === 'offline'
                    ? 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(255, 255, 255, 0.04)',
                  border: jarvisStatus === 'connected'
                    ? '1px solid rgba(34, 197, 94, 0.25)'
                    : jarvisStatus === 'offline'
                    ? '1px solid rgba(239, 68, 68, 0.25)'
                    : '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: jarvisStatus === 'connected'
                      ? '#22c55e'
                      : jarvisStatus === 'offline'
                      ? '#ef4444'
                      : jarvisStatus === 'testing'
                      ? '#eab308'
                      : '#9ca3af'
                  }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: jarvisStatus === 'connected'
                        ? '#22c55e'
                        : jarvisStatus === 'offline'
                        ? '#ef4444'
                        : jarvisStatus === 'testing'
                        ? '#eab308'
                        : '#e5e7eb'
                    }}>
                      {jarvisStatus === 'connected' ? 'Connected' : jarvisStatus === 'offline' ? 'Offline' : jarvisStatus === 'testing' ? 'Testing Connection...' : 'Untested'}
                    </div>
                    {jarvisStatusDetails ? (
                      <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.6)' }}>
                        {jarvisStatusDetails}
                      </div>
                    ) : (
                      <div style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.4)' }}>
                        Click "Test Connection" to ping your local JARVIS server
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeNav === 'about' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px 0', color: '#ffffff' }}>About & Software Update</h2>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Informasi versi aplikasi dan pembaruan Quick Pill</p>
              </div>

              {/* 1. App Info & Version Card */}
              <div style={{ background: '#1c1c1f', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>Quick Pill</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                        v{appVersion}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      Dynamic Island for Windows • MIT License
                    </div>
                  </div>

                  {/* Manual Check Button (available when not downloading/checking) */}
                  {updateStatus !== 'downloading' && updateStatus !== 'downloaded' && (
                    <button
                      onClick={handleCheckUpdate}
                      disabled={updateStatus === 'checking'}
                      style={{
                        padding: '7px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: updateStatus === 'checking' ? 'rgba(56, 189, 248, 0.2)' : '#0284c7',
                        color: '#ffffff',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: updateStatus === 'checking' ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <RefreshCw size={13} style={{ animation: updateStatus === 'checking' ? 'spin 1s linear infinite' : 'none' }} />
                      <span>{updateStatus === 'checking' ? 'Memeriksa...' : 'Periksa Pembaruan'}</span>
                    </button>
                  )}
                </div>

                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                  Quick Pill menghadirkan Dynamic Island modern di Windows dengan obstruction detection, WASAPI audio mixer, Spotify lyrics, JARVIS AI, dan multi-workspace app launcher.
                </div>
              </div>

              {/* 2. Interactive Auto-Updater Dashboard */}
              <div style={{ background: '#1c1c1f', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Status Pembaruan Sistem</div>

                {/* State A: Checking */}
                {updateStatus === 'checking' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 8, background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                    <RefreshCw size={16} color="#38bdf8" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 600 }}>
                      Menghubungi server pembaruan Quick Pill...
                    </span>
                  </div>
                )}

                {/* State B: Not-Available (Up to Date) */}
                {updateStatus === 'not-available' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 8, background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <CheckCircle2 size={16} color="#22c55e" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 700 }}>
                        Quick Pill sudah dalam versi terbaru (v{appVersion})
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                        Tidak ada berkas pembaruan baru yang ditemukan saat ini.
                      </span>
                    </div>
                  </div>
                )}

                {/* State C: Update Available */}
                {updateStatus === 'available' && updateInfo && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, borderRadius: 8, background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Sparkles size={16} color="#38bdf8" />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                          Pembaruan Tersedia: v{updateInfo.version}
                        </span>
                        {updateInfo.releaseDate && (
                          <span style={{ fontSize: 10, color: '#9ca3af', padding: '1px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                            {updateInfo.releaseDate}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600 }}>
                        {updateInfo.size ? `${(updateInfo.size / (1024 * 1024)).toFixed(1)} MB` : ''}
                      </span>
                    </div>

                    {/* Changelog snippets if available */}
                    {Array.isArray(updateInfo.changelog) && updateInfo.changelog.length > 0 && (
                      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 110, overflowY: 'auto' }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Catatan Rilis:</span>
                        {updateInfo.changelog.slice(0, 4).map((line, i) => (
                          <div key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
                            • {line}
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <button
                        onClick={handleStartDownload}
                        style={{
                          padding: '7px 16px',
                          borderRadius: 7,
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Download size={13} />
                        <span>Unduh Pembaruan</span>
                      </button>
                      <button
                        onClick={() => setUpdateStatus('idle')}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 7,
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: '#d1d5db',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Nanti Saja
                      </button>
                    </div>
                  </div>
                )}

                {/* State D: Downloading Progress */}
                {updateStatus === 'downloading' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 8, background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#ffffff', fontWeight: 700 }}>
                        Mengunduh pembaruan v{updateInfo?.version || ''}...
                      </span>
                      <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 800 }}>
                        {Math.round(downloadProgress.percent || 0)}%
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.max(2, Math.min(100, downloadProgress.percent || 0))}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                          transition: 'width 0.2s ease'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
                      <span>
                        {downloadProgress.transferredBytes ? (downloadProgress.transferredBytes / (1024 * 1024)).toFixed(1) : '0'} MB / {downloadProgress.totalBytes ? (downloadProgress.totalBytes / (1024 * 1024)).toFixed(1) : '0'} MB
                      </span>
                      <span>
                        {downloadProgress.speedBytesPerSec ? `${(downloadProgress.speedBytesPerSec / (1024 * 1024)).toFixed(1)} MB/s` : 'Mengunduh...'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      <button
                        onClick={handleCancelDownload}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 6,
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {/* State E: Downloaded & Ready to Install */}
                {updateStatus === 'downloaded' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, borderRadius: 8, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CheckCircle2 size={18} color="#22c55e" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                          Pembaruan v{updateInfo?.version || ''} Siap Dipasang!
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                          Berkas installer telah selesai diunduh. Aplikasi akan menutup dan memasang versi terbaru secara otomatis.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <button
                        onClick={handleInstallUpdate}
                        style={{
                          padding: '8px 18px',
                          borderRadius: 7,
                          background: '#22c55e',
                          color: '#000000',
                          border: 'none',
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'transform 0.1s ease'
                        }}
                      >
                        <RefreshCw size={13} />
                        <span>Restart & Pasang Sekarang</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* State F: Error */}
                {updateStatus === 'error' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertCircle size={16} color="#ef4444" />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#ef4444' }}>
                        Pemeriksaan Pembaruan Terkendala
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                      {updateError || 'Tidak dapat terhubung ke server pembaruan Quick Pill. Pastikan koneksi internet Anda aktif.'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button
                        onClick={handleCheckUpdate}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Coba Lagi
                      </button>
                    </div>
                  </div>
                )}

                {/* State G: Idle Initial */}
                {updateStatus === 'idle' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 11.5, color: '#9ca3af' }}>
                      Pemeriksaan otomatis berjalan secara berkala di latar belakang.
                    </span>
                    <button
                      onClick={handleCheckUpdate}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Periksa Sekarang
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Auto-Updater Preferences Toggle */}
              <div style={{ background: '#1c1c1f', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <SettingRow
                  title="Unduh Pembaruan Otomatis di Latar Belakang"
                  desc="Saat versi baru rilis, unduh berkas installer secara otomatis agar siap dipasang"
                  checked={autoDownloadInstall}
                  onChange={handleToggleAutoDownload}
                  isLast
                />
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
