import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Mic, SkipBackIcon, Play, Pause, SkipForwardIcon, Music, Headphones, Zap, Settings, Sun, Cloud, Trash2, ChevronRight, ChevronLeft, Check, X, CloudRain, CloudSnow, CloudLightning, CloudSun, Moon, Eye, EyeOff, GripVertical, List, Search, Star, Calendar as CalendarIcon, Bell, BellOff, AlarmClock, Timer, Activity, Clock, Volume2, VolumeX, Wind, Usb, Download, RefreshCw, Sparkles, AlertCircle, CheckCircle2, SlidersHorizontal, Palette, Compass, Layers, Quote, Copy, Clipboard, Shuffle, BatteryCharging, Battery, ArrowDown, ArrowUp, ArrowLeft, FolderOpen, RotateCcw, FileText, CheckCircle, Upload, Film, Package, Phone, PhoneCall, PhoneIncoming, Send, MessageSquare, ExternalLink, Undo, ChevronDown, ChevronUp, BellRing, Keyboard, Droplet, Flame, Inbox, File, CheckSquare, Square, CornerDownLeft, Lock } from "lucide-react";
import "./App.css";
import AppLauncher from "./components/AppLauncher";
import QuickNotes from "./components/QuickNotes";
import MascotStandbyHub from "./components/MascotStandbyHub";
import CalendarModule from "./components/CalendarModule";
import ErrorBoundary from "./components/ErrorBoundary";

// Helper parse synced LRC format lyrics
function parseLrc(lrcText) {
  if (!lrcText || typeof lrcText !== "string") return null;
  const lines = lrcText.split(/\r?\n/);
  const result = [];
  for (const line of lines) {
    const match = line.match(/^\[(\d{2}):(\d{2}(?:\.\d{2,3})?)\](.*)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const text = match[3].trim();
      if (text) {
        result.push({ time: minutes * 60 + seconds, text });
      }
    }
  }
  return result.length > 0 ? result : null;
}

// Helper format file sizes (Bytes -> KB -> MB)
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper format relative time for notifications
function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const date = new Date(timestamp);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Helper format timer MM:SS
function formatTimerMMSS(totalSec) {
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Play melodic audio alarm chime on timer completion using Web Audio API
function playTimerAlarmSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playChime = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    // Play 3 pulses of a 3-note melodic alarm chime (C5 -> E5 -> G5)
    [0, 0.45, 0.90].forEach((pulseDelay) => {
      playChime(523.25, pulseDelay + 0.00, 0.18); // C5
      playChime(659.25, pulseDelay + 0.12, 0.18); // E5
      playChime(784.00, pulseDelay + 0.24, 0.30); // G5
    });
  } catch (err) {
    console.error("Failed to play timer alarm sound:", err);
  }
}

const TimerCircleProgress = ({ progress = 1, size = 18, strokeWidth = 2.5 }) => {
  const safeProgress = Math.min(1, Math.max(0, progress));
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - safeProgress);
  const glowRadius = Math.max(1, Math.round(safeProgress * 8));

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible', display: 'block' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255, 149, 0, 0.25)"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#ff9500"
        strokeWidth={strokeWidth}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.4, ease: "linear" }}
        style={{ filter: `drop-shadow(0 0 ${glowRadius}px rgba(255, 149, 0, ${0.3 + safeProgress * 0.5}))` }}
      />
    </svg>
  );
};

const ProgressMiniRing = ({ progress = null, size = 18, strokeWidth = 2.5, status = "running" }) => {
  const isFailed = status === "failed";
  const isCompleted = status === "completed";
  const color = isFailed ? "#ef4444" : isCompleted ? "#22c55e" : "#38bdf8";

  if (isFailed) return <AlertCircle size={size} color={color} />;
  if (isCompleted) return <CheckCircle2 size={size} color={color} />;

  const safeProgress = typeof progress === "number" ? Math.min(1, Math.max(0, progress / 100)) : null;

  if (safeProgress === null) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw size={size - 4} color={color} className="spin-anim" />
      </div>
    );
  }

  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - safeProgress);

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible', display: 'block' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.3s linear' }}
      />
    </svg>
  );
};

// 3D Layered Animated Weather Icon (Dedicated Day & Night Icon Sets - Optimized with React.memo & GPU hardware acceleration)
const Animated3DWeatherIcon = React.memo(({ status = "Partly Sunny", size = 64, isNight: isNightProp = null }) => {
  const statusLower = (status || "Partly Sunny").toLowerCase();

  // Auto-detect Night if local time is >= 18:00 or < 06:00, or status includes night/moon, or isNightProp is true
  const currentHour = new Date().getHours();
  const isNightTime = isNightProp !== null ? isNightProp : (statusLower.includes("night") || statusLower.includes("moon") || (currentHour >= 18 || currentHour < 6));

  const isRain = statusLower.includes("rain") || statusLower.includes("drizzle");
  const isSnow = statusLower.includes("snow");
  const isThunder = statusLower.includes("thunder") || statusLower.includes("storm");
  const isCloudy = statusLower.includes("cloud") || statusLower.includes("overcast") || statusLower.includes("partly") || statusLower.includes("fair");

  const scaleRatio = size / 64;
  const isMini = size <= 28;

  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, willChange: 'transform', transform: 'translateZ(0)' }}>
      {/* 1. DAY SET: 3D Pulsing Sun */}
      {!isNightTime && (
        <motion.div
          animate={isMini ? undefined : { scale: [1, 1.06, 1], rotate: [0, 45, 90] }}
          transition={isMini ? undefined : { duration: 12, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute',
            top: isCloudy ? `${size * 0.05}px` : `${size * 0.1}px`,
            left: isCloudy ? `${size * 0.08}px` : `${size * 0.15}px`,
            width: size * 0.55,
            height: size * 0.55,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #fff59d 0%, #ffb74d 50%, #ff9800 100%)',
            boxShadow: '0 0 14px rgba(255, 167, 38, 0.75)',
            willChange: 'transform',
            transform: 'translateZ(0)',
            zIndex: 1
          }}
        />
      )}

      {/* 2. NIGHT SET: 3D Glowing Pearl Moon & Twinkling Stars */}
      {isNightTime && (
        <>
          {/* Glowing Moon */}
          <motion.div
            animate={isMini ? undefined : { rotate: [-4, 4, -4], scale: [1, 1.03, 1] }}
            transition={isMini ? undefined : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: 'absolute',
              top: `${size * 0.06}px`,
              left: `${size * 0.1}px`,
              width: size * 0.52,
              height: size * 0.52,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #dbeafe 45%, #93c5fd 80%, #3b82f6 100%)',
              boxShadow: '0 0 14px rgba(147, 197, 253, 0.8)',
              willChange: 'transform',
              transform: 'translateZ(0)',
              zIndex: 1
            }}
          />

          {/* Twinkling Stars (Header Icon only) */}
          {!isMini && (
            <>
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: 'absolute',
                  top: `${size * 0.05}px`,
                  right: `${size * 0.08}px`,
                  width: 4 * scaleRatio,
                  height: 4 * scaleRatio,
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 0 6px #ffffff',
                  zIndex: 1
                }}
              />
              <motion.div
                animate={{ opacity: [1, 0.2, 1], scale: [1.1, 0.7, 1.1] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.8, ease: "easeInOut" }}
                style={{
                  position: 'absolute',
                  top: `${size * 0.35}px`,
                  left: `${size * 0.02}px`,
                  width: 3 * scaleRatio,
                  height: 3 * scaleRatio,
                  borderRadius: '50%',
                  background: '#93c5fd',
                  boxShadow: '0 0 5px #93c5fd',
                  zIndex: 1
                }}
              />
            </>
          )}
        </>
      )}

      {/* 3. Layered 3D Frosted Glass Cloud Layer */}
      {(isCloudy || isRain || isSnow || isThunder) && (
        <motion.div
          animate={isMini ? undefined : { y: [-1.5, 1.5, -1.5], x: [-1, 1, -1] }}
          transition={isMini ? undefined : { duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: 'absolute',
            bottom: `${size * 0.1}px`,
            right: `${size * 0.05}px`,
            width: size * 0.72,
            height: size * 0.38,
            borderRadius: size * 0.25,
            background: isNightTime
              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.92) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(220, 232, 245, 0.9) 100%)',
            boxShadow: isNightTime
              ? '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.25)'
              : '0 4px 10px rgba(0, 0, 0, 0.2), inset 0 1.5px 2px rgba(255, 255, 255, 0.95)',
            border: isNightTime
              ? '1px solid rgba(148, 163, 184, 0.35)'
              : '1px solid rgba(255, 255, 255, 0.7)',
            willChange: 'transform',
            transform: 'translateZ(0)',
            zIndex: 2
          }}
        >
          {/* Top Cloud Bump Left */}
          <div style={{
            position: 'absolute',
            top: `-${size * 0.18}px`,
            left: `${size * 0.1}px`,
            width: size * 0.32,
            height: size * 0.32,
            borderRadius: '50%',
            background: isNightTime
              ? 'linear-gradient(135deg, rgba(51, 65, 85, 0.98) 0%, rgba(30, 41, 59, 0.92) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(225, 235, 248, 0.9) 100%)',
            boxShadow: isNightTime ? 'inset 0 1px 2px rgba(255, 255, 255, 0.2)' : 'inset 0 1.5px 2px rgba(255, 255, 255, 0.95)'
          }} />
          {/* Top Cloud Bump Right */}
          <div style={{
            position: 'absolute',
            top: `-${size * 0.14}px`,
            right: `${size * 0.12}px`,
            width: size * 0.26,
            height: size * 0.26,
            borderRadius: '50%',
            background: isNightTime
              ? 'linear-gradient(135deg, rgba(40, 53, 72, 0.95) 0%, rgba(20, 30, 48, 0.88) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(215, 228, 242, 0.88) 100%)',
            boxShadow: isNightTime ? 'inset 0 1px 2px rgba(255, 255, 255, 0.2)' : 'inset 0 1.5px 2px rgba(255, 255, 255, 0.95)'
          }} />
        </motion.div>
      )}

      {/* 4. Falling Animated Raindrops */}
      {(isRain && !isMini) && (
        <div style={{ position: 'absolute', bottom: '0px', right: `${size * 0.15}px`, zIndex: 3, display: 'flex', gap: 4 * scaleRatio }}>
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.div
              key={`drop-${i}`}
              animate={{ y: [0, 8 * scaleRatio], opacity: [0, 1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay, ease: "easeIn" }}
              style={{
                width: Math.max(2, 3 * scaleRatio),
                height: Math.max(5, 7 * scaleRatio),
                borderRadius: 4,
                background: 'linear-gradient(to bottom, #38bdf8, #0284c7)',
                boxShadow: '0 0 4px #38bdf8'
              }}
            />
          ))}
        </div>
      )}

      {/* 5. Animated Snowflakes */}
      {(isSnow && !isMini) && (
        <div style={{ position: 'absolute', bottom: '2px', right: `${size * 0.12}px`, zIndex: 3, display: 'flex', gap: 4 * scaleRatio }}>
          {[0, 0.3, 0.6].map((delay, i) => (
            <motion.div
              key={`snow-${i}`}
              animate={{ y: [0, 6 * scaleRatio], rotate: [0, 180], opacity: [0.3, 1, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, delay, ease: "easeInOut" }}
              style={{
                width: Math.max(3, 5 * scaleRatio),
                height: Math.max(3, 5 * scaleRatio),
                borderRadius: '50%',
                background: '#ffffff',
                boxShadow: '0 0 6px rgba(255, 255, 255, 0.9)'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});

//Get Date
function formatDateShort(input) {
  const date = input ? new Date(input) : new Date();
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date provided to formatDateShort");
  }
  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  const month = date.toLocaleDateString(undefined, { month: "short" });
  const day = date.getDate();
  return `${weekday}, ${month} ${day}`;
}

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const days = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, isCurrentMonth: true });
  }
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    days.push({ day: d, isCurrentMonth: false });
  }
  return days;
}

const textMeasureCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
function measureTextWidth(text, font = "600 13px OpenRunde, Arial, sans-serif") {
  if (!textMeasureCanvas || !textMeasureCanvas.getContext || !text) return null;
  const ctx = textMeasureCanvas.getContext("2d");
  if (!ctx) return null;
  const fontStr = typeof font === "number" ? `600 ${font}px OpenRunde, Arial, sans-serif` : font;
  ctx.font = fontStr;
  return ctx.measureText(text).width;
}

const WeatherIcon = ({ status, size = 16, color = "currentColor" }) => {
  const s = status?.toLowerCase() || "";
  if (s.includes("sunny") || s.includes("clear")) return <Sun size={size} color={color} />;
  if (s.includes("partly cloudy")) return <CloudSun size={size} color={color} />;
  if (s.includes("cloudy") || s.includes("overcast") || s.includes("mist") || s.includes("fog")) return <Cloud size={size} color={color} />;
  if (s.includes("rain") || s.includes("drizzle") || s.includes("showers")) return <CloudRain size={size} color={color} />;
  if (s.includes("snow") || s.includes("sleet") || s.includes("ice") || s.includes("blizzard")) return <CloudSnow size={size} color={color} />;
  if (s.includes("thunder") || s.includes("storm")) return <CloudLightning size={size} color={color} />;
  return <Sun size={size} color={color} />;
};

function openApp(app) {
  if (!app) return;
  const trimmedApp = app.trim();

  if (/^(https?|file):\/\//i.test(trimmedApp)) {
    window.electronAPI?.openExternal(trimmedApp);
    return;
  }

  const isLaunchTarget =
    /[\\\/]/.test(trimmedApp) ||
    /\.exe$/i.test(trimmedApp) ||
    trimmedApp.startsWith('shell:');

  if (isLaunchTarget) {
    window.electronAPI?.launchApp(trimmedApp);
    return;
  }

  if (/^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(trimmedApp) ||
    /^localhost(:\d+)?(\/.*)?$/i.test(trimmedApp)) {
    window.electronAPI?.openExternal(`http://${trimmedApp}`);
    return;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(trimmedApp)) {
    window.electronAPI?.openExternal(`https://${trimmedApp}`);
    return;
  }

  window.electronAPI?.launchApp(trimmedApp);
}

function openMusicPlayer(source) {
  if (!source) return;

  if (source === "Spotify") {
    openApp("Spotify");
  } else if (source === "Music") {
    openApp("Music");
  } else if (source === "music.apple.com" || source.includes("Apple")) {
    openApp("Music");
  } else {
    openApp(source);
  }
}

function cleanAppName(src) {
  if (!src) return "Spotify";
  let s = String(src).trim();
  if (s.includes("!")) {
    s = s.split("!").pop();
  }
  if (s.includes(".")) {
    const parts = s.split(".");
    const lastPart = parts[parts.length - 1];
    s = lastPart.toLowerCase() === "exe" ? (parts[parts.length - 2] || lastPart) : lastPart;
  }
  s = s.replace(/^SpotifyAB\.?/i, "").replace(/_.*$/, "").trim();
  if (!s || s.toLowerCase().includes("spotify")) return "Spotify";
  if (s.toLowerCase().includes("apple")) return "Apple Music";
  if (s.toLowerCase().includes("chrome")) return "Chrome";
  if (s.toLowerCase().includes("edge")) return "Edge";
  if (s.toLowerCase().includes("firefox")) return "Firefox";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function cleanBluetoothDeviceName(rawName) {
  if (!rawName) return "Connected";
  let name = String(rawName)
    .replace(/\s+(Avrcp|Transport|Hands-Free|AG Audio|Stereo|Audio|Bluetooth|Service|Control|HID)\b/gi, "")
    .trim();
  if (!name) return "Connected";
  return name;
}

const TABS = [
  { id: 0, name: "Browser Search", icon: (color, size = 15) => <Search size={size} color={color} /> },
  { id: 1, name: "Water Reminder", icon: (color, size = 15) => <Droplet size={size} color={color} /> },
  { id: 2, name: "Overview", icon: (color, size = 15) => <Sun size={size} color={color} /> },
  { id: 11, name: "Battery Hub", icon: (color, size = 15) => <BatteryCharging size={size} color={color} /> },
  { id: 12, name: "Audio Mixer", icon: (color, size = 15) => <SlidersHorizontal size={size} color={color} /> },
  { id: 13, name: "File Shelf", icon: (color, size = 15) => <Inbox size={size} color={color} /> },
  { id: 14, name: "App Launcher", icon: (color, size = 15) => <Compass size={size} color={color} /> },
  { id: 15, name: "Quick Notes", icon: (color, size = 15) => <FileText size={size} color={color} /> },
  { id: 3, name: "Music", icon: (color, size = 15) => <Music size={size} color={color} /> },
  { id: 4, name: "Calendar", icon: (color, size = 15) => <CalendarIcon size={size} color={color} /> },
  { id: 5, name: "Notifications", icon: (color, size = 15) => <Bell size={size} color={color} /> },
  { id: 6, name: "Game / Stats", icon: (color, size = 15) => <Activity size={size} color={color} /> },
  { id: 7, name: "Clipboard", icon: (color, size = 15) => <List size={size} color={color} /> },
  { id: 8, name: "To-Do List", icon: (color, size = 15) => <CheckSquare size={size} color={color} /> },
  { id: 10, name: "Pomodoro", icon: (color, size = 15) => <Timer size={size} color={color} /> }
];

const DEFAULT_TAB_SHORTCUTS = {
  0: "Alt+B",   // Browser Search
  1: "Alt+W",   // Weather
  2: "Alt+O",   // Overview
  11: "Alt+H",  // Battery Hub
  12: "Alt+A",  // Audio Mixer
  13: "Alt+P",  // Progress Island
  14: "Alt+L",  // App Launcher
  15: "Alt+Q",  // Quick Notes
  3: "Alt+M",   // Now Playing
  4: "Alt+C",   // Calendar
  5: "Alt+N",   // Notifications
  6: "Alt+G",   // Game / Stats
  7: "Alt+V",   // Clipboard
  8: "Alt+T",   // Tasks
  10: "Alt+R",  // Timer
  "minimal-notch": "Alt+Shift+M"
};

// 5-Bar Live Equalizer Waveform for Idle Notch Standby
const MiniWaveform = ({ isPlaying = false }) => {
  return (
    <div className={`notch-live-eq-5 ${isPlaying ? "" : "paused"}`} title={isPlaying ? "Media Playing" : "Idle Standby"}>
      <span className="eq-bar-5" />
      <span className="eq-bar-5" />
      <span className="eq-bar-5" />
      <span className="eq-bar-5" />
      <span className="eq-bar-5" />
    </div>
  );
};

// Mini Circular Progress Ring for Idle Notch Standby (14px)
const MiniProgressRing = ({ progress = 1, color = "#22c55e", size = 14, strokeWidth = 2.2 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - Math.min(1, Math.max(0, progress)) * circumference;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block', flexShrink: 0 }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke="rgba(255, 255, 255, 0.2)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
      />
    </svg>
  );
};

// Mascot Eyes for Quiet Standby Notch Mode (Glowing Pill Eyes + Reactive Mood Accessories)
const MascotEyes = ({ mood = "chill", isPlaying = false, charging = false, percent = null }) => {
  const [isBlink, setIsBlink] = useState(false);
  const [lookOffset, setLookOffset] = useState(0);

  useEffect(() => {
    // Natural blinking interval
    const blinkInterval = setInterval(() => {
      setIsBlink(true);
      setTimeout(() => setIsBlink(false), 140);
    }, 3200 + Math.random() * 2500);

    // Natural eye look left/right interval
    const lookInterval = setInterval(() => {
      const directions = [-3, 0, 3, 0];
      const nextDir = directions[Math.floor(Math.random() * directions.length)];
      setLookOffset(nextDir);
    }, 2400);

    return () => {
      clearInterval(blinkInterval);
      clearInterval(lookInterval);
    };
  }, []);

  const eyeColor = charging
    ? "#22c55e"
    : mood === "thirsty"
    ? "#38bdf8"
    : mood === "focusing"
    ? "#ef4444"
    : mood === "vibing"
    ? "#c084fc"
    : percent !== null && percent < 25
    ? "#f43f5e"
    : "#ffffff";

  const glowShadow = charging
    ? "0 0 8px rgba(34, 197, 94, 0.9)"
    : mood === "thirsty"
    ? "0 0 8px rgba(56, 189, 248, 0.9)"
    : mood === "focusing"
    ? "0 0 8px rgba(239, 68, 68, 0.9)"
    : mood === "vibing"
    ? "0 0 8px rgba(192, 132, 252, 0.9)"
    : percent !== null && percent < 25
    ? "0 0 6px rgba(244, 63, 94, 0.8)"
    : "0 0 6px rgba(255, 255, 255, 0.85)";

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Soft ambient radial glow at bottom edge of the notch */}
      <div
        className="mascot-ambient-glow"
        style={{
          background: charging
            ? "radial-gradient(circle at 50% 100%, rgba(34, 197, 94, 0.4), transparent 70%)"
            : mood === "thirsty"
            ? "radial-gradient(circle at 50% 100%, rgba(56, 189, 248, 0.4), transparent 70%)"
            : mood === "focusing"
            ? "radial-gradient(circle at 50% 100%, rgba(239, 68, 68, 0.4), transparent 70%)"
            : mood === "vibing"
            ? "radial-gradient(circle at 50% 100%, rgba(168, 85, 247, 0.4), transparent 70%)"
            : undefined
        }}
      />
      <div
        className={`mascot-pill-eyes ${isPlaying || mood === "vibing" ? "idle-mascot-vibing" : ""}`}
        style={{
          transform: `translateX(${lookOffset}px)`,
          transition: 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}
        title={`Quick Pill Companion (${mood})`}
      >
        {/* Mood Reactive Badge Icon */}
        {mood === "thirsty" && (
          <Droplet size={11} color="#38bdf8" className="idle-mascot-droplet" style={{ filter: "drop-shadow(0 0 4px #38bdf8)" }} />
        )}
        {charging && (
          <Zap size={10} color="#22c55e" style={{ filter: "drop-shadow(0 0 4px #22c55e)" }} />
        )}
        {mood === "focusing" && !charging && (
          <Timer size={10} color="#ef4444" style={{ filter: "drop-shadow(0 0 4px #ef4444)" }} />
        )}
        {(isPlaying || mood === "vibing") && !charging && (
          <Music size={10} color="#38bdf8" style={{ filter: "drop-shadow(0 0 4px #38bdf8)" }} />
        )}

        {/* Mascot Glowing Pill Eyes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            className={`mascot-eye-pill ${isBlink ? "blink" : ""}`}
            style={{
              background: eyeColor,
              boxShadow: glowShadow
            }}
          />
          <div
            className={`mascot-eye-pill ${isBlink ? "blink" : ""}`}
            style={{
              background: eyeColor,
              boxShadow: glowShadow
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Top Segmented Pagination Bar for Expanded Card
const TopSegmentedBar = ({ totalTabs = 1, activeIndex = 0, onSelectTab }) => {
  return (
    <div className="notch-segmented-bar">
      {Array.from({ length: totalTabs }).map((_, idx) => (
        <div
          key={idx}
          className={`notch-segment ${idx === activeIndex ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelectTab?.(idx);
          }}
          style={{ cursor: 'pointer' }}
        />
      ))}
    </div>
  );
};

// Left & Right Edge Navigation Arrows
const EdgeNavigation = ({ onPrev, onNext }) => {
  return (
    <>
      <div
        className="notch-nav-btn left"
        onClick={(e) => {
          e.stopPropagation();
          onPrev?.();
        }}
        title="Previous Tab"
      >
        <ChevronLeft size={14} />
      </div>
      <div
        className="notch-nav-btn right"
        onClick={(e) => {
          e.stopPropagation();
          onNext?.();
        }}
        title="Next Tab"
      >
        <ChevronRight size={14} />
      </div>
    </>
  );
};

const WaveformScrubber = ({ position = 0, duration = 0, isPlaying = false, onSeek }) => {
  const [animTime, setAnimTime] = useState(0);
  const [scrubPos, setScrubPos] = useState(null);

  useEffect(() => {
    setScrubPos(null);
  }, [position]);

  useEffect(() => {
    if (!isPlaying) return;
    let animId;
    const updateTime = () => {
      setAnimTime(prev => prev + 0.04);
      animId = requestAnimationFrame(updateTime);
    };
    animId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  const currentPos = scrubPos !== null ? scrubPos : position;
  const progress = duration > 0 ? Math.min(1, Math.max(0, currentPos / duration)) : 0;
  const width = 330;
  const height = 24;
  const centerY = 12;
  const barHeight = 6;
  const playedX = Math.max(0, Math.min(width, progress * width));

  const pointsCount = 35;
  const topPoints = [];

  for (let i = 0; i <= pointsCount; i++) {
    const t = i / pointsCount;
    const x = t * playedX;
    const envelope = Math.sin(t * Math.PI);
    const waveAmp = isPlaying
      ? Math.sin(t * 8 - animTime * 3) * 5 * envelope
      : Math.sin(t * 4 + animTime) * 1.5 * envelope;
    const y = (centerY - barHeight / 2) - Math.max(0, waveAmp + 4 * envelope);
    topPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  const bottomY = centerY + barHeight / 2;
  const filledPathD = topPoints.length > 0
    ? `M 0,${bottomY} L ` + topPoints.join(' L ') + ` L ${playedX.toFixed(1)},${bottomY} Z`
    : `M 0,${centerY - barHeight / 2} L ${playedX},${centerY - barHeight / 2} L ${playedX},${bottomY} L 0,${bottomY} Z`;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleScrubClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newRatio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSec = newRatio * duration;
    setScrubPos(targetSec);
    if (onSeek && duration > 0) {
      onSeek(targetSec);
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer', marginTop: 8 }} onClick={handleScrubClick}>
      <svg width="100%" height="24" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {/* Unplayed Track (Background Bar) */}
        <rect
          x="0"
          y={centerY - barHeight / 2}
          width={width}
          height={barHeight}
          rx={barHeight / 2}
          fill="rgba(255, 255, 255, 0.25)"
        />

        {/* Played Fluid Wave Mountain Ribbon Fill */}
        {playedX > 0 && (
          <path
            d={filledPathD}
            fill="rgba(240, 240, 240, 0.88)"
          />
        )}

        {/* Slider Handle Knob (Thumb) */}
        <circle
          cx={playedX}
          cy={centerY}
          r="8"
          fill="#ffffff"
          style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}
        />
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.55)', fontFamily: 'OpenRunde, sans-serif' }}>
        <span>{formatTime(currentPos)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};


const AppleSwitch = ({ checked, onChange, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      if (!disabled && onChange) onChange(!checked);
    }}
    style={{
      width: 38,
      height: 22,
      borderRadius: 11,
      background: checked ? '#34c759' : 'rgba(255, 255, 255, 0.16)',
      border: 'none',
      padding: 2,
      display: 'inline-flex',
      alignItems: 'center',
      cursor: disabled ? 'not-allowed' : 'pointer',
      position: 'relative',
      transition: 'background 0.2s ease',
      boxShadow: checked ? '0 0 10px rgba(52, 199, 89, 0.35)' : 'none',
      flexShrink: 0
    }}
  >
    <motion.div
      animate={{ x: checked ? 16 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        background: '#ffffff',
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.35)'
      }}
    />
  </button>
);

const AppleSegmented = ({ value, options, onChange }) => (
  <div style={{
    display: 'inline-flex',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 2,
    border: '1px solid rgba(255, 255, 255, 0.08)'
  }}>
    {options.map((opt) => {
      const isSelected = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(opt.value);
          }}
          style={{
            background: isSelected ? 'rgba(255, 255, 255, 0.22)' : 'transparent',
            border: 'none',
            color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
            borderRadius: 6,
            padding: '3px 9px',
            fontSize: 11,
            fontWeight: isSelected ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: isSelected ? '0 1px 4px rgba(0,0,0,0.2)' : 'none'
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

// Curated Daily Wisdom & Inspiration Quotes with famous author portraits
const DAILY_QUOTES = [
  {
    quote: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
    title: "Co-founder of Apple",
    image: "https://upload.wikimedia.org/wikipedia/commons/d/dc/Steve_Jobs_Headshot_2010-CROP_%28cropped_2%29.jpg",
    initials: "SJ",
    gradient: "linear-gradient(135deg, #0070f3, #00c6ff)"
  },
  {
    quote: "Imagination is more important than knowledge. Knowledge is limited.",
    author: "Albert Einstein",
    title: "Theoretical Physicist",
    image: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Einstein_1921_by_F_Schmutzer_-_restoration.jpg",
    initials: "AE",
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)"
  },
  {
    quote: "You have power over your mind — not outside events. Realize this, and you will find strength.",
    author: "Marcus Aurelius",
    title: "Roman Emperor & Stoic",
    image: "https://upload.wikimedia.org/wikipedia/commons/7/70/Marcus_Aurelius_Glyptothek_Munich.jpg",
    initials: "MA",
    gradient: "linear-gradient(135deg, #8b5cf6, #6366f1)"
  },
  {
    quote: "Simplicity is the ultimate sophistication.",
    author: "Leonardo da Vinci",
    title: "Polymath & Artist",
    image: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Leonardo_self.jpg",
    initials: "LV",
    gradient: "linear-gradient(135deg, #10b981, #059669)"
  },
  {
    quote: "Sometimes it is the people no one imagines anything of who do the things no one can imagine.",
    author: "Alan Turing",
    title: "Father of Modern Computing",
    image: "https://upload.wikimedia.org/wikipedia/commons/a/a1/Alan_Turing_Aged_16.jpg",
    initials: "AT",
    gradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)"
  },
  {
    quote: "The present is theirs; the future, for which I really worked, is mine.",
    author: "Nikola Tesla",
    title: "Inventor & Electrical Pioneer",
    image: "https://upload.wikimedia.org/wikipedia/commons/7/79/Tesla_circa_1890.jpeg",
    initials: "NT",
    gradient: "linear-gradient(135deg, #ec4899, #be185d)"
  },
  {
    quote: "Be yourself; everyone else is already taken.",
    author: "Oscar Wilde",
    title: "Author & Playwright",
    image: "https://upload.wikimedia.org/wikipedia/commons/a/a7/Oscar_Wilde_Sarony.jpg",
    initials: "OW",
    gradient: "linear-gradient(135deg, #f43f5e, #e11d48)"
  },
  {
    quote: "Nothing in life is to be feared, it is only to be understood.",
    author: "Marie Curie",
    title: "Physicist & Chemist",
    image: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Marie_Curie_c._1920s.jpg",
    initials: "MC",
    gradient: "linear-gradient(135deg, #06b6d4, #0891b2)"
  },
  {
    quote: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Aristotle",
    title: "Greek Philosopher",
    image: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Aristotle_Altemps_Inv8575.jpg",
    initials: "AR",
    gradient: "linear-gradient(135deg, #eab308, #ca8a04)"
  },
  {
    quote: "Somewhere, something incredible is waiting to be known.",
    author: "Carl Sagan",
    title: "Astronomer & Author",
    image: "https://upload.wikimedia.org/wikipedia/commons/b/be/Carl_Sagan_Planetary_Society.JPG",
    initials: "CS",
    gradient: "linear-gradient(135deg, #a855f7, #7c3aed)"
  },
  {
    quote: "He who has a why to live can bear almost any how.",
    author: "Friedrich Nietzsche",
    title: "Philosopher & Poet",
    image: "https://upload.wikimedia.org/wikipedia/commons/1/1b/Nietzsche187a.jpg",
    initials: "FN",
    gradient: "linear-gradient(135deg, #64748b, #475569)"
  },
  {
    quote: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
    title: "Author & Humorist",
    image: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Mark_Twain_by_AF_Bradley.jpg",
    initials: "MT",
    gradient: "linear-gradient(135deg, #14b8a6, #0d9488)"
  },
  {
    quote: "Do not go where the path may lead, go instead where there is no path and leave a trail.",
    author: "Ralph Waldo Emerson",
    title: "Essayist & Philosopher",
    image: "https://upload.wikimedia.org/wikipedia/commons/d/d5/Ralph_Waldo_Emerson_ca1857_retouched.jpg",
    initials: "RE",
    gradient: "linear-gradient(135deg, #6366f1, #4f46e5)"
  },
  {
    quote: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius",
    title: "Teacher & Philosopher",
    image: "https://upload.wikimedia.org/wikipedia/commons/4/4f/Confucius_Tang_Dynasty.jpg",
    initials: "CF",
    gradient: "linear-gradient(135deg, #f97316, #ea580c)"
  },
  {
    quote: "Stay hungry, stay foolish.",
    author: "Stewart Brand",
    title: "Creator of Whole Earth",
    image: "https://upload.wikimedia.org/wikipedia/commons/8/87/Stewart_Brand_at_Flickr.jpg",
    initials: "SB",
    gradient: "linear-gradient(135deg, #10b981, #047857)"
  },
  {
    quote: "First principles thinking is boiling things down to their fundamental truths.",
    author: "Elon Musk",
    title: "Tech Entrepreneur",
    image: "https://upload.wikimedia.org/wikipedia/commons/3/34/Elon_Musk_Royal_Society_%28crop2%29.jpg",
    initials: "EM",
    gradient: "linear-gradient(135deg, #0ea5e9, #0284c7)"
  },
  {
    quote: "Success is the courage to continue after failure.",
    author: "Winston Churchill",
    title: "British Statesman",
    image: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Sir_Winston_Churchill_-_1940%2C_by_Yousuf_Karsh.jpg",
    initials: "WC",
    gradient: "linear-gradient(135deg, #78716c, #57534e)"
  },
  {
    quote: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
    title: "Human Rights Leader",
    image: "https://upload.wikimedia.org/wikipedia/commons/2/22/Eleanor_Roosevelt_portrait_1933.jpg",
    initials: "ER",
    gradient: "linear-gradient(135deg, #ec4899, #db2777)"
  },
  {
    quote: "It always seems impossible until it's done.",
    author: "Nelson Mandela",
    title: "Revolutionary & Leader",
    image: "https://upload.wikimedia.org/wikipedia/commons/0/02/Nelson_Mandela_1994.jpg",
    initials: "NM",
    gradient: "linear-gradient(135deg, #22c55e, #16a34a)"
  },
  {
    quote: "The mind is everything. What you think you become.",
    author: "Buddha",
    title: "Spiritual Teacher",
    image: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Buddha_in_Sarnath_Museum_%28Dhammajak_Mutra%29.jpg",
    initials: "BD",
    gradient: "linear-gradient(135deg, #eab308, #f59e0b)"
  }
];

// Quoteman's Pic Avatar with Fallback Badge
const QuotemanAvatar = ({ quote, size = 50 }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [quote.image]);

  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: 13,
        overflow: 'hidden',
        position: 'relative',
        border: '1.5px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.45)',
        background: quote.gradient || 'linear-gradient(135deg, #0070f3, #00c6ff)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      {!imgError && quote.image ? (
        <img
          src={quote.image}
          alt={quote.author}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
        />
      ) : (
        <span
          style={{
            color: '#ffffff',
            fontSize: size * 0.38,
            fontWeight: 800,
            fontFamily: 'OpenRunde, system-ui, sans-serif',
            letterSpacing: '0.5px'
          }}
        >
          {quote.initials}
        </span>
      )}
      <div
        style={{
          position: 'absolute',
          bottom: 2,
          right: 2,
          width: 15,
          height: 15,
          borderRadius: '50%',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
        <Quote size={8} color="#ff9500" />
      </div>
    </div>
  );
};

// Apple Dynamic Island Liquid Wave Battery Capsule (Horizontal Fill: Left-to-Right / Fluid Flow: Right-to-Left)
const AppleBatteryCapsule = ({ percent = 100, charging = false, width = 168, height = 66 }) => {
  const safePercent = typeof percent === "number" && !isNaN(percent) ? Math.min(100, Math.max(0, percent)) : 85;
  const canvasRef = useRef(null);
  const fillXRef = useRef((safePercent / 100) * (width - 10));

  // Apple System Palette for Liquid & Meniscus Waves
  const frontColor = charging
    ? '#30D158'
    : (safePercent <= 10 ? '#FF453A' : (safePercent <= 20 ? '#FFD60A' : '#30D158'));
  const frontTopColor = charging
    ? '#34E065'
    : (safePercent <= 10 ? '#FF6961' : (safePercent <= 20 ? '#FFE043' : '#34E065'));
  const frontBottomColor = charging
    ? '#24B046'
    : (safePercent <= 10 ? '#D32F2F' : (safePercent <= 20 ? '#D4A000' : '#24B046'));
  const backColor = charging
    ? '#15803D'
    : (safePercent <= 10 ? '#991B1B' : (safePercent <= 20 ? '#B45309' : '#15803D'));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    const startTime = performance.now();

    // High-DPI Canvas scaling for Retina / crisp rendering
    const dpr = window.devicePixelRatio || 2;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || (width - 10);
    const h = rect.height || (height - 10);

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);

    // Initial fill target
    const targetFillX = (safePercent / 100) * w;
    if (fillXRef.current === undefined) fillXRef.current = targetFillX;

    // Organic rising micro-bubbles inside the liquid
    const bubbleCount = charging ? 8 : 5;
    const bubbles = Array.from({ length: bubbleCount }, (_, i) => ({
      xRatio: 0.08 + (i / bubbleCount) * 0.84,
      y: Math.random() * (h - 12) + 8,
      radius: 1.4 + Math.random() * 2.0,
      speedY: 0.45 + Math.random() * 0.65,
      wobbleSpeed: 1.8 + Math.random() * 1.6,
      wobbleAmp: 1.4 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.35 + Math.random() * 0.35
    }));

    const render = (now) => {
      const elapsed = (now - startTime) / 1000;

      // Smoothly interpolate current fillX towards targetFillX
      fillXRef.current += (targetFillX - fillXRef.current) * 0.08;
      const currentFillX = Math.max(0, Math.min(w, fillXRef.current));

      // Clear Canvas
      ctx.clearRect(0, 0, w, h);

      // Clip canvas to rounded capsule interior
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(0, 0, w, h, 13);
      } else {
        ctx.rect(0, 0, w, h);
      }
      ctx.clip();

      const isNearlyFull = currentFillX >= w - 2.5;

      // --- 1. BACK WAVE LAYER (Darker emerald / amber / red depth) ---
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, 0);

      if (isNearlyFull) {
        // When nearly 100% full, liquid reaches right wall with subtle wave sloshing along top
        for (let x = 0; x <= w; x += 3) {
          const topY = Math.max(0, Math.sin(x * 0.05 + elapsed * 2.2) * 2.4 + 2);
          ctx.lineTo(x, topY);
        }
        ctx.lineTo(w, h);
      } else {
        // Meniscus wave along right liquid edge
        ctx.lineTo(Math.max(0, currentFillX - 3), 0);
        for (let y = 0; y <= h; y += 2) {
          const wave1 = Math.sin(y * 0.08 + elapsed * 2.2) * 3.4;
          const wave2 = Math.cos(y * 0.16 - elapsed * 1.5) * 1.8;
          const wx = Math.max(0, Math.min(w, currentFillX - 3 + wave1 + wave2));
          ctx.lineTo(wx, y);
        }
        ctx.lineTo(0, h);
      }
      ctx.closePath();
      ctx.fillStyle = backColor;
      ctx.globalAlpha = 0.75;
      ctx.fill();
      ctx.restore();

      // --- 2. FRONT WAVE LAYER (Vibrant Apple green / yellow / red gradient) ---
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, 0);

      if (isNearlyFull) {
        // Wave along top moving continuously from RIGHT TO LEFT (+ elapsed * 2.8)
        for (let x = 0; x <= w; x += 3) {
          const topY = Math.max(0, Math.sin(x * 0.045 + elapsed * 2.8 + 0.9) * 2.8 + 2.2);
          ctx.lineTo(x, topY);
        }
        // Down the right wall with gentle surge against glass
        for (let y = 0; y <= h; y += 3) {
          const rightX = w - Math.max(0, Math.sin(y * 0.09 + elapsed * 2.5) * 1.8);
          ctx.lineTo(rightX, y);
        }
        ctx.lineTo(0, h);
      } else {
        // Meniscus wave along right liquid edge
        ctx.lineTo(Math.max(0, currentFillX), 0);
        for (let y = 0; y <= h; y += 2) {
          const wave1 = Math.sin(y * 0.07 + elapsed * 2.7) * 4.2;
          const wave2 = Math.cos(y * 0.14 - elapsed * 1.9 + 1.0) * 2.4;
          const wx = Math.max(0, Math.min(w, currentFillX + wave1 + wave2));
          ctx.lineTo(wx, y);
        }
        ctx.lineTo(0, h);
      }
      ctx.closePath();

      const frontGrad = ctx.createLinearGradient(0, 0, 0, h);
      frontGrad.addColorStop(0, frontTopColor);
      frontGrad.addColorStop(1, frontBottomColor);
      ctx.fillStyle = frontGrad;
      ctx.globalAlpha = 0.96;
      ctx.fill();

      // Luminous surface-tension meniscus crest highlight
      if (!isNearlyFull && currentFillX > 5) {
        ctx.beginPath();
        for (let y = 0; y <= h; y += 2) {
          const wave1 = Math.sin(y * 0.07 + elapsed * 2.7) * 4.2;
          const wave2 = Math.cos(y * 0.14 - elapsed * 1.9 + 1.0) * 2.4;
          const wx = Math.max(0, Math.min(w, currentFillX + wave1 + wave2));
          if (y === 0) ctx.moveTo(wx, y);
          else ctx.lineTo(wx, y);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.85;
        ctx.stroke();
      }
      ctx.restore();

      // --- 3. INTERNAL FLUID SHIMMER / LIGHT WAVE (Travels RIGHT TO LEFT) ---
      const activeLiquidWidth = Math.min(w, currentFillX + 4);
      if (activeLiquidWidth > 12) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, activeLiquidWidth, h);
        ctx.clip();

        // Shimmer ribbon 1 sweeps continuously from right to left
        const shimmerOffset1 = (elapsed * 38) % (w + 100);
        const shimmerX1 = (w + 50) - shimmerOffset1;
        const shimmerGrad1 = ctx.createLinearGradient(shimmerX1 - 35, 0, shimmerX1 + 35, 0);
        shimmerGrad1.addColorStop(0, 'rgba(255, 255, 255, 0)');
        shimmerGrad1.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
        shimmerGrad1.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = shimmerGrad1;
        ctx.fillRect(0, 0, activeLiquidWidth, h);

        // Shimmer ribbon 2 sweeps at secondary cadence
        const shimmerOffset2 = (elapsed * 24 + 60) % (w + 100);
        const shimmerX2 = (w + 50) - shimmerOffset2;
        const shimmerGrad2 = ctx.createLinearGradient(shimmerX2 - 25, 0, shimmerX2 + 25, 0);
        shimmerGrad2.addColorStop(0, 'rgba(255, 255, 255, 0)');
        shimmerGrad2.addColorStop(0.5, 'rgba(255, 255, 255, 0.09)');
        shimmerGrad2.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = shimmerGrad2;
        ctx.fillRect(0, 0, activeLiquidWidth, h);

        ctx.restore();
      }

      // --- 4. RISING MICRO-BUBBLES (Buoyant, swaying, zero seam) ---
      if (activeLiquidWidth > 15) {
        for (let i = 0; i < bubbles.length; i++) {
          const b = bubbles[i];
          b.y -= b.speedY;
          if (b.y < 5) {
            b.y = h + Math.random() * 8;
            b.xRatio = 0.08 + Math.random() * 0.84;
            b.radius = 1.4 + Math.random() * 2.0;
            b.speedY = 0.45 + Math.random() * 0.65;
          }

          const currentBx = b.xRatio * activeLiquidWidth + Math.sin(elapsed * b.wobbleSpeed + b.phase) * b.wobbleAmp;

          if (currentBx > 5 && currentBx < activeLiquidWidth - 4 && b.y <= h && b.y >= 4) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(currentBx, b.y, b.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha})`;
            ctx.fill();

            // Specular shine point
            ctx.beginPath();
            ctx.arc(currentBx - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fill();
            ctx.restore();
          }
        }
      }

      ctx.restore(); // Restore outer clip

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [safePercent, charging, frontColor, frontTopColor, frontBottomColor, backColor, width, height]);

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        userSelect: 'none',
        paddingRight: 5
      }}
    >
      {/* Outer Apple Battery Chassis */}
      <div
        style={{
          position: 'relative',
          width,
          height,
          borderRadius: 18,
          background: 'rgba(255, 255, 255, 0.05)',
          border: '2px solid rgba(255, 255, 255, 0.22)',
          boxSizing: 'border-box',
          padding: 3,
          overflow: 'hidden'
        }}
      >
        {/* Liquid Wave Tank Cavity */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: 13,
            overflow: 'hidden',
            background: 'rgba(0, 0, 0, 0.42)'
          }}
        >
          {/* Smooth 60fps Liquid Physics Canvas */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              display: 'block'
            }}
          />

          {/* Glass Wall Reflection Pill (Apple Dynamic Island style) */}
          <div
            style={{
              position: 'absolute',
              left: 6,
              top: 12,
              width: 4.5,
              height: 36,
              borderRadius: 2.5,
              backgroundColor: 'rgba(255, 255, 255, 0.22)',
              pointerEvents: 'none',
              zIndex: 6
            }}
          />

          {/* Top Curved Sheen Glare */}
          <div
            style={{
              position: 'absolute',
              top: 1,
              left: 4,
              right: 4,
              height: '35%',
              background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.01) 100%)',
              borderRadius: '12px 12px 4px 4px',
              pointerEvents: 'none',
              zIndex: 7
            }}
          />

          {/* Center Typography & Charging Bolt */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              zIndex: 10,
              pointerEvents: 'none'
            }}
          >
            {charging && (
              <motion.div
                animate={{ opacity: [0.85, 1, 0.85], scale: [0.96, 1.06, 0.96] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <Zap size={18} color="#ffffff" fill="#ffffff" />
              </motion.div>
            )}
            <span
              style={{
                fontFamily: 'OpenRunde, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                fontSize: 27,
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.5px',
                textShadow: '0 1px 4px rgba(0, 0, 0, 0.85), 0 2px 8px rgba(0, 0, 0, 0.7)'
              }}
            >
              {safePercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Apple Terminal Bump */}
      <div
        style={{
          width: 5,
          height: 22,
          borderRadius: '0 4px 4px 0',
          backgroundColor: 'rgba(255, 255, 255, 0.22)',
          marginLeft: -1,
          flexShrink: 0
        }}
      />
    </div>
  );
};
const BigAnimatedBattery = AppleBatteryCapsule;

const FlipCard = ({ digit, width = 72, height = 64, fontSize = 38 }) => {
  const [currentDigit, setCurrentDigit] = useState(digit);
  const [previousDigit, setPreviousDigit] = useState(digit);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (digit !== currentDigit) {
      setPreviousDigit(currentDigit);
      setCurrentDigit(digit);
      setIsFlipping(true);
      const timer = setTimeout(() => setIsFlipping(false), 450);
      return () => clearTimeout(timer);
    }
  }, [digit, currentDigit]);

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        background: '#18181c',
        borderRadius: 12,
        padding: 3,
        boxSizing: 'border-box',
        boxShadow: '0 8px 20px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.14)',
        border: '1.5px solid #2b2b32',
        perspective: 1000
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(to bottom, #ececec 0%, #d6d6d6 49%, #c6c6c6 51%, #e2e2e2 100%)',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: 'inset 0 1.5px 2px rgba(255,255,255,0.9), inset 0 -1.5px 3px rgba(0,0,0,0.35)'
        }}
      >
        {/* TOP HALF (New digit) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            background: 'linear-gradient(to bottom, #ececec 0%, #d8d8d8 100%)'
          }}
        >
          <span
            style={{
              fontSize,
              fontWeight: 800,
              color: '#0070f3',
              fontFamily: 'OpenRunde, system-ui, sans-serif',
              letterSpacing: '-1.5px',
              userSelect: 'none',
              marginTop: 1
            }}
          >
            {currentDigit}
          </span>
        </div>

        {/* BOTTOM HALF (Old digit while flipping, new digit when done) */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            background: 'linear-gradient(to bottom, #c6c6c6 0%, #e2e2e2 100%)'
          }}
        >
          <span
            style={{
              fontSize,
              fontWeight: 800,
              color: '#0070f3',
              fontFamily: 'OpenRunde, system-ui, sans-serif',
              letterSpacing: '-1.5px',
              userSelect: 'none',
              marginBottom: 1
            }}
          >
            {isFlipping ? previousDigit : currentDigit}
          </span>
        </div>

        {/* ANIMATED FLIP FLAP (Top flap folding downward) */}
        {isFlipping && (
          <motion.div
            initial={{ rotateX: 0 }}
            animate={{ rotateX: -180 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              background: 'linear-gradient(to bottom, #ececec 0%, #d8d8d8 100%)',
              transformOrigin: 'bottom center',
              backfaceVisibility: 'hidden',
              zIndex: 20,
              boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
            }}
          >
            <span
              style={{
                fontSize,
                fontWeight: 800,
                color: '#0070f3',
                fontFamily: 'OpenRunde, system-ui, sans-serif',
                letterSpacing: '-1.5px',
                userSelect: 'none',
                marginTop: 1
              }}
            >
              {previousDigit}
            </span>
          </motion.div>
        )}

        {/* Middle split line */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 2,
            background: '#18181c',
            marginTop: -1,
            zIndex: 30,
            boxShadow: '0 1px 1px rgba(255,255,255,0.45)'
          }}
        />

        {/* Left hinge pin */}
        <div
          style={{
            position: 'absolute',
            left: -1,
            top: '50%',
            marginTop: -4.5,
            width: 5,
            height: 9,
            background: '#1c1c20',
            borderRadius: '0 2px 2px 0',
            zIndex: 31
          }}
        />

        {/* Right hinge pin */}
        <div
          style={{
            position: 'absolute',
            right: -1,
            top: '50%',
            marginTop: -4.5,
            width: 5,
            height: 9,
            background: '#1c1c20',
            borderRadius: '2px 0 0 2px',
            zIndex: 31
          }}
        />
      </div>
    </div>
  );
};

const ScrollingTitle = ({ text = "", fontSize = 16 }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [scrollDistance, setScrollDistance] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const textWidth = textRef.current.getBoundingClientRect().width;
        const containerWidth = containerRef.current.getBoundingClientRect().width;
        if (textWidth > containerWidth - 5) {
          setScrollDistance(textWidth - containerWidth + 35);
        } else {
          setScrollDistance(0);
        }
      }
    };

    checkOverflow();
    const timer = setTimeout(checkOverflow, 150);
    return () => clearTimeout(timer);
  }, [text, fontSize]);

  return (
    <div
      ref={containerRef}
      style={{
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        width: '100%',
        maxWidth: '290px',
        position: 'relative',
        textShadow: '0 2px 8px rgba(0,0,0,0.9)',
      }}
    >
      {scrollDistance > 0 ? (
        <motion.div
          key={`scrolling-${text}`}
          animate={{ x: [0, -scrollDistance, 0] }}
          transition={{
            duration: Math.max(6, scrollDistance / 20),
            repeat: Infinity,
            repeatType: 'reverse',
            repeatDelay: 1.2,
            ease: 'easeInOut'
          }}
          style={{
            display: 'inline-block',
            fontSize,
            fontWeight: 700,
            color: '#ffffff',
            fontFamily: 'OpenRunde, system-ui, sans-serif'
          }}
        >
          <span ref={textRef}>{text}</span>
        </motion.div>
      ) : (
        <h2
          style={{
            margin: 0,
            fontSize,
            fontWeight: 700,
            color: '#ffffff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: '-0.2px',
            fontFamily: 'OpenRunde, system-ui, sans-serif'
          }}
        >
          <span ref={textRef}>{text}</span>
        </h2>
      )}
    </div>
  );
};

export default function Island() {
  const [time, setTime] = useState(() => {
    const date = new Date();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const is12Hr = (localStorage.getItem("hour-format") || "12-hr") === "12-hr";
    if (is12Hr) {
      hours = hours % 12;
      hours = hours ? hours : 12;
    }
    return `${hours}:${minutes}`;
  });
  const [mode, setMode] = useState("still");
  const prevModeRef = useRef(mode);
  const [isCollapsing, setIsCollapsing] = useState(false);

  useEffect(() => {
    if (prevModeRef.current === "large" && mode !== "large") {
      setIsCollapsing(true);
      const timer = setTimeout(() => {
        setIsCollapsing(false);
      }, 320);
      return () => clearTimeout(timer);
    }
    prevModeRef.current = mode;
  }, [mode]);

  const [tabOrder, setTabOrder] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tab-order") || "null");
      if (Array.isArray(saved)) {
        if (!saved.includes(11)) {
          const idx2 = saved.indexOf(2);
          if (idx2 !== -1) saved.splice(idx2 + 1, 0, 11);
          else saved.push(11);
          localStorage.setItem("tab-order", JSON.stringify(saved));
        }
        if (!saved.includes(12)) {
          const idx11 = saved.indexOf(11);
          if (idx11 !== -1) saved.splice(idx11 + 1, 0, 12);
          else saved.push(12);
          localStorage.setItem("tab-order", JSON.stringify(saved));
        }
        if (!saved.includes(13)) {
          const idx12 = saved.indexOf(12);
          if (idx12 !== -1) saved.splice(idx12 + 1, 0, 13);
          else saved.push(13);
          localStorage.setItem("tab-order", JSON.stringify(saved));
        }
        if (!saved.includes(14)) {
          const idx13 = saved.indexOf(13);
          if (idx13 !== -1) saved.splice(idx13 + 1, 0, 14);
          else saved.push(14);
          localStorage.setItem("tab-order", JSON.stringify(saved));
        }
        if (!saved.includes(15)) {
          const idx14 = saved.indexOf(14);
          if (idx14 !== -1) saved.splice(idx14 + 1, 0, 15);
          else saved.push(15);
          localStorage.setItem("tab-order", JSON.stringify(saved));
        }
        return saved.filter(id => id !== 9);
      }
    } catch {}
    return [2, 11, 12, 13, 14, 15, 4, 5, 6, 7, 8, 10, 0, 1, 3];
  });
  const [hiddenTabs, setHiddenTabs] = useState(() => JSON.parse(localStorage.getItem("hidden-tabs") || "[6]"));
  const [defaultTabId, setDefaultTabId] = useState(() => Number(localStorage.getItem("default-tab") || 2));

  const moveTabOrder = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= tabOrder.length) return;
    setTabOrder((prev) => {
      const newOrder = [...prev];
      const [moved] = newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, moved);
      localStorage.setItem("tab-order", JSON.stringify(newOrder));
      return newOrder;
    });
  };

  const toggleTabVisibility = (id) => {
    setHiddenTabs(prev => {
      const newHidden = prev.includes(id)
        ? prev.filter(t => t !== id)
        : [...prev, id];

      if (newHidden.length >= TABS.length) return prev;

      localStorage.setItem("hidden-tabs", JSON.stringify(newHidden));
      return newHidden;
    });
  };

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [systemStats, setSystemStats] = useState({ cpu: 0, ram: 0 });
  const [notificationsList, setNotificationsList] = useState([]);
  const [notificationSnapshot, setNotificationSnapshot] = useState({
    active: [],
    standalone: [],
    groups: [],
    snoozed: [],
    history: [],
    recentDismissals: [],
    lowPrioritySummary: { count: 0, items: [] },
    incomingCall: null,
    settings: { hidePreviews: false, excludedApps: [] },
    stats: { totalActive: 0, unreviewedCount: 0, snoozedCount: 0, criticalCount: 0, historyCount: 0, hasUndo: false }
  });
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [expandedGroupIds, setExpandedGroupIds] = useState({});
  const [lowPriorityExpanded, setLowPriorityExpanded] = useState(false);
  const [replyInputs, setReplyInputs] = useState({});
  const [actionStatuses, setActionStatuses] = useState({});
  const [undoToast, setUndoToast] = useState(null);
  const [snoozeMenuOpenId, setSnoozeMenuOpenId] = useState(null);
  const [percent, setPercent] = useState(null);
  const [alert, setAlert] = useState(null);
  const [batteryAlertsEnabled, setBatteryAlertsEnabled] = useState(localStorage.getItem("battery-alerts") !== "false");
  const [alwaysOnTopEnabled, setAlwaysOnTopEnabled] = useState(localStorage.getItem("always-on-top") !== "false");
  const [islandBorderEnabled, setIslandBorderEnabled] = useState(localStorage.getItem("island-border") === "true");
  const [standbyBorderEnabled, setStandbyBorderEnabled] = useState(localStorage.getItem("standby-mode") === "true");
  const [largeStandbyEnabled, setLargeStandbyEnabled] = useState(localStorage.getItem("large-standby-mode") === "true");
  const [hideNotActiveIslandEnabled, sethideNotActiveIslandEnabled] = useState(localStorage.getItem("hide-island-notactive") === "true");
  const [showInfoWhenIdleEnabled, setShowInfoWhenIdleEnabled] = useState(
    localStorage.getItem("show-info-when-idle") !== "false"
  );
  const [hourFormat, setHourFormat] = useState((localStorage.getItem("hour-format") || "12-hr") === "12-hr");
  const [weather, setWeather] = useState({ temp: "", status: "", humidity: "", wind: "" });
  const [weatherUnit, setweatherUnit] = useState(localStorage.getItem("weather-unit") || "c");
  const [theme, setTheme] = useState("default");
  const [bgColor, setBgColor] = useState(localStorage.getItem("bg-color") || "#000000");
  const [textColor, setTextColor] = useState(localStorage.getItem("text-color") || "#FFFFFF");
  const [bgImage, setBgImage] = useState(localStorage.getItem("bg-image") || "none");
  const [settingsTab, setSettingsTab] = useState("general");
  const [tabShortcuts, setTabShortcuts] = useState(() => {
    try {
      const saved = localStorage.getItem("quick_pill_tab_shortcuts");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return { ...DEFAULT_TAB_SHORTCUTS, ...parsed };
        }
      }
    } catch (_) {}
    return { ...DEFAULT_TAB_SHORTCUTS };
  });
  const [recordingTabId, setRecordingTabId] = useState(null);
  const [recordingConflict, setRecordingConflict] = useState(null);
  const [browserSearch, setBrowserSearch] = useState("");
  const [clipboard, setClipboard] = useState([]);
  const [charging, setCharging] = useState(false);
  const [chargingAlert, setChargingAlert] = useState(false);
  const [batteryDischargingTime, setBatteryDischargingTime] = useState(null);
  const [batteryChargingTime, setBatteryChargingTime] = useState(null);
  const [batteryHistory, setBatteryHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("quick_pill_battery_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cutoff = Date.now() - 6 * 60 * 60 * 1000;
          return parsed.filter(s => s.timestamp > cutoff);
        }
      }
    } catch {}
    return [];
  });
  const [spotifyTrack, setSpotifyTrack] = useState(null);
  const [bluetooth, setBluetooth] = useState({ connected: false, devices: [] });
  const [bluetoothAlert, setBluetoothAlert] = useState(false);
  const [cameraInUse, setCameraInUse] = useState(false);
  const [cameraAlert, setCameraAlert] = useState(false);
  const [microphoneInUse, setMicrophoneInUse] = useState(false);
  const [microphoneAlert, setMicrophoneAlert] = useState(false);
  const captureAlertQueue = useRef([]);
  const captureAlertTimer = useRef(null);
  const captureAlertDisplayed = useRef({ camera: false, microphone: false });
  const [tasks, setTasks] = useState(JSON.parse(localStorage.getItem("tasks") || "[]"));
  const [taskText, setTaskText] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [copiedClipboardId, setCopiedClipboardId] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [albumHovered, setAlbumHovered] = useState(false);
  const [albumRotation, setAlbumRotation] = useState({ x: 0, y: 0 });

  // Timer State (Stopwatch removed per user request)
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerTotalDuration, setTimerTotalDuration] = useState(300);
  const [customTimerSetup, setCustomTimerSetup] = useState(300);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerEndTimeRef = useRef(null);
  const isTimerRunningRef = useRef(false);

  // Volume HUD State
  const [volumeLevel, setVolumeLevel] = useState(70);
  const [volumeAlert, setVolumeAlert] = useState(false);
  const volumeAlertTimeout = useRef(null);

  // Ctrl+Hover Click-Through State
  const [ctrlHeld, setCtrlHeld] = useState(false);
  const ctrlHeldRef = useRef(false);
  const lastIgnoreRef = useRef({ ignore: true, forward: true });

  const updateMouseIgnore = useCallback((ignore, forward = true) => {
    if (lastIgnoreRef.current?.ignore === ignore && lastIgnoreRef.current?.forward === forward) {
      return;
    }
    lastIgnoreRef.current = { ignore, forward };
    if (window.electronAPI?.setIgnoreMouseEvents) {
      window.electronAPI.setIgnoreMouseEvents(ignore, forward);
    }
  }, []);

  const setHoverState = useCallback((val) => {
    isHoveredRef.current = val;
    setIsHovered(val);
  }, []);

  const setCtrlState = useCallback((val) => {
    ctrlHeldRef.current = val;
    setCtrlHeld(val);
  }, []);

  // Key Lock Alert State
  const [keyLockAlert, setKeyLockAlert] = useState(null);
  const keyLockAlertTimeout = useRef(null);

  // USB Device Alert State
  const [usbAlert, setUSBAlert] = useState(null);
  const usbAlertTimeout = useRef(null);

  // Smart Obstruction Avoidance & System Tray Settings States
  const [isObstructed, setIsObstructed] = useState(false);
  const [forceReveal, setForceReveal] = useState(false);
  const [smartBrowserAvoidance, setSmartBrowserAvoidance] = useState(() => {
    return localStorage.getItem("smart-browser-avoidance") !== "false";
  });
  const [mascotMode, setMascotMode] = useState(() => {
    return localStorage.getItem("mascot-mode") !== "false";
  });
  const [minimalNotch, setMinimalNotch] = useState(() => {
    return localStorage.getItem("minimal-notch") === "true";
  });
  const [privacyDotsEnabled, setPrivacyDotsEnabled] = useState(() => {
    return localStorage.getItem("privacy-dots-enabled") === "true";
  });

  // System HUD Toast State (Caps Lock, Bluetooth, Battery, Volume)
  const [activeHudToast, setActiveHudToast] = useState(null);
  const hudToastTimer = useRef(null);

  const triggerHudToast = useCallback((toastData) => {
    if (!toastData || (!toastData.title && !toastData.type)) {
      setActiveHudToast(null);
      window.electronAPI?.invalidateWindow?.();
      return;
    }
    setActiveHudToast(toastData);
    window.electronAPI?.invalidateWindow?.();
    if (hudToastTimer.current) clearTimeout(hudToastTimer.current);
    hudToastTimer.current = setTimeout(() => {
      setActiveHudToast(null);
      window.electronAPI?.invalidateWindow?.();
    }, 1800);
  }, []);


  // Audio / Bluetooth Device Connected HUD
  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) return;
    const handleDeviceChange = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter(d => d.kind === "audiooutput");
        const defaultDev = outputs.find(d => d.deviceId === "default") || outputs[0];
        const name = defaultDev?.label || "Audio Output";
        triggerHudToast({
          type: "bluetooth",
          title: name,
          subtext: "Connected • 100%"
        });
      } catch (_) {}
    };
    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
  }, [triggerHudToast]);

  // Charger Plugged / Unplugged HUD
  const lastChargingRef = useRef(null);
  useEffect(() => {
    if (charging === null) return;
    if (lastChargingRef.current !== null && lastChargingRef.current !== charging) {
      triggerHudToast({
        type: "battery",
        title: charging ? "Charging" : "On Battery",
        subtext: `${percent !== null ? percent : 80}%`,
        state: charging ? "Charging" : "Unplugged"
      });
    }
    lastChargingRef.current = charging;
  }, [charging, percent, triggerHudToast]);

  // Curated Modules States
  // 1. Music & Synced Lyrics Toggle & LRCLIB fetching
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [syncedLyrics, setSyncedLyrics] = useState(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const lyricsCache = useRef(new Map());

  useEffect(() => {
    const title = spotifyTrack?.name;
    const artist = spotifyTrack?.artist;
    if (!title || !artist || title === "Unknown Title") {
      setSyncedLyrics(null);
      return;
    }

    const cacheKey = `${title}-${artist}`.toLowerCase();
    if (lyricsCache.current.has(cacheKey)) {
      setSyncedLyrics(lyricsCache.current.get(cacheKey));
      return;
    }

    let active = true;
    setLyricsLoading(true);

    const cleanTitle = title.replace(/\(.*?\)|\[.*?\]/g, '').trim();
    const cleanArtist = artist.split('•')[0].split(',')[0].trim();

    fetch(`https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!active) return;
        if (data?.syncedLyrics) {
          const parsed = parseLrc(data.syncedLyrics);
          lyricsCache.current.set(cacheKey, parsed);
          setSyncedLyrics(parsed);
        } else {
          return fetch(`https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`)
            .then(sRes => sRes.ok ? sRes.json() : null)
            .then(sData => {
              if (!active) return;
              const match = sData?.find?.(i => i.syncedLyrics);
              if (match?.syncedLyrics) {
                const parsed = parseLrc(match.syncedLyrics);
                lyricsCache.current.set(cacheKey, parsed);
                setSyncedLyrics(parsed);
              } else {
                setSyncedLyrics(null);
              }
            });
        }
      })
      .catch(() => {
        if (active) setSyncedLyrics(null);
      })
      .finally(() => {
        if (active) setLyricsLoading(false);
      });

    return () => { active = false; };
  }, [spotifyTrack?.name, spotifyTrack?.artist]);

  // Notifications List View Toggle
  const [notificationListView, setNotificationListView] = useState(false);

  // 2. Pomodoro Focus Timer State
  const [pomodoroState, setPomodoroState] = useState({
    isRunning: false,
    secondsLeft: 1500, // 25:00
    totalSeconds: 1500,
    mode: 'focus'
  });

  useEffect(() => {
    let timer;
    if (pomodoroState.isRunning) {
      timer = setInterval(() => {
        setPomodoroState(prev => {
          if (prev.secondsLeft <= 1) {
            playTimerAlarmSound();
            const nextMode = prev.mode === 'focus' ? 'break' : 'focus';
            const nextSecs = nextMode === 'focus' ? 1500 : 300;
            return {
              ...prev,
              isRunning: false,
              secondsLeft: nextSecs,
              totalSeconds: nextSecs,
              mode: nextMode
            };
          }
          return { ...prev, secondsLeft: prev.secondsLeft - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [pomodoroState.isRunning]);

  // 3. Water Reminder (Hydration Tracker) State with Hourly Bar Chart
  const [waterIntake, setWaterIntake] = useState(() => {
    const saved = localStorage.getItem("water-intake");
    if (saved === "1000" || saved === null) {
      localStorage.setItem("water-intake", "0");
      return 0;
    }
    return Number(saved) || 0;
  });

  const [hourlyWater, setHourlyWater] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("hourly-water") || "null");
      if (Array.isArray(saved) && saved.length === 5) {
        // Reset legacy dummy values (250, 300, 250, 200, 0) to 0
        if (saved[0]?.amount === 250 && saved[1]?.amount === 300) {
          const clean = [
            { hour: "9", amount: 0 },
            { hour: "12", amount: 0 },
            { hour: "15", amount: 0 },
            { hour: "18", amount: 0 },
            { hour: "21", amount: 0 }
          ];
          localStorage.setItem("hourly-water", JSON.stringify(clean));
          return clean;
        }
        return saved;
      }
    } catch (_) {}
    return [
      { hour: "9", amount: 0 },
      { hour: "12", amount: 0 },
      { hour: "15", amount: 0 },
      { hour: "18", amount: 0 },
      { hour: "21", amount: 0 }
    ];
  });

  const addWaterDrink = () => {
    setWaterIntake(prev => {
      const updated = Math.min(3000, prev + 250);
      localStorage.setItem("water-intake", String(updated));
      return updated;
    });
    setHourlyWater(prev => {
      const nowH = new Date().getHours();
      let slotIdx = 4;
      if (nowH < 11) slotIdx = 0;
      else if (nowH < 14) slotIdx = 1;
      else if (nowH < 17) slotIdx = 2;
      else if (nowH < 20) slotIdx = 3;
      const updated = prev.map((item, idx) => idx === slotIdx ? { ...item, amount: Math.min(600, item.amount + 250) } : item);
      localStorage.setItem("hourly-water", JSON.stringify(updated));
      return updated;
    });
  };

  const resetWaterDrink = () => {
    setWaterIntake(0);
    localStorage.setItem("water-intake", "0");
    const fresh = [
      { hour: "9", amount: 0 },
      { hour: "12", amount: 0 },
      { hour: "15", amount: 0 },
      { hour: "18", amount: 0 },
      { hour: "21", amount: 0 }
    ];
    setHourlyWater(fresh);
    localStorage.setItem("hourly-water", JSON.stringify(fresh));
  };

  // 4. File Shelf (Temporary Drag-and-Drop Stash) State - Starts completely empty
  const [shelfFiles, setShelfFiles] = useState(() => {
    try {
      const saved = localStorage.getItem("shelf-files");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out legacy dummy placeholder files
          const clean = parsed.filter(f => f.name !== "Project-Brief.pdf" && f.name !== "Screenshot-Design.png");
          if (clean.length !== parsed.length) {
            localStorage.setItem("shelf-files", JSON.stringify(clean));
          }
          return clean;
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  });
  const [isDragOverShelf, setIsDragOverShelf] = useState(false);
  const isOutboundDragging = useRef(false);

  const clearShelf = useCallback(() => {
    setShelfFiles([]);
    localStorage.removeItem("shelf-files");
  }, []);

  // Sync Obstruction, Mascot, and Minimal Notch from Preload/Main
  useEffect(() => {
    if (!window.electronAPI?.onObstructionStatus) return;
    const unsub = window.electronAPI.onObstructionStatus((data) => {
      const nextObstructed = Boolean(data?.isObstructed);
      setIsObstructed(nextObstructed);
      if (!nextObstructed) {
        setForceReveal(false);
      }
    });
    return () => unsub?.();
  }, []);

  useEffect(() => {
    if (window.electronAPI?.getSmartBrowserAvoidance) {
      window.electronAPI.getSmartBrowserAvoidance().then(val => {
        if (typeof val === "boolean") setSmartBrowserAvoidance(val);
      }).catch(() => {});
    }
    if (window.electronAPI?.onSmartBrowserAvoidanceChange) {
      const unsub = window.electronAPI.onSmartBrowserAvoidanceChange((val) => {
        setSmartBrowserAvoidance(val);
        localStorage.setItem("smart-browser-avoidance", String(val));
      });
      return () => unsub?.();
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI?.getMascotMode) {
      window.electronAPI.getMascotMode().then(val => {
        if (typeof val === "boolean") setMascotMode(val);
      }).catch(() => {});
    }
    if (window.electronAPI?.onMascotModeChange) {
      const unsub = window.electronAPI.onMascotModeChange((val) => {
        setMascotMode(val);
        localStorage.setItem("mascot-mode", String(val));
      });
      return () => unsub?.();
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI?.getMinimalNotch) {
      window.electronAPI.getMinimalNotch().then(val => {
        if (typeof val === "boolean") setMinimalNotch(val);
      }).catch(() => {});
    }
    if (window.electronAPI?.onMinimalNotchChange) {
      const unsub = window.electronAPI.onMinimalNotchChange((val) => {
        setMinimalNotch(val);
        localStorage.setItem("minimal-notch", String(val));
      });
      return () => unsub?.();
    }
  }, []);

  // Synchronize Hidden Tabs from Settings Window / Main Process
  useEffect(() => {
    if (window.electronAPI?.getHiddenTabs) {
      window.electronAPI.getHiddenTabs().then(val => {
        if (Array.isArray(val)) setHiddenTabs(val);
      }).catch(() => {});
    }
    if (window.electronAPI?.onHiddenTabsChange) {
      const unsub = window.electronAPI.onHiddenTabsChange((val) => {
        if (Array.isArray(val)) {
          setHiddenTabs(val);
          localStorage.setItem("hidden-tabs", JSON.stringify(val));
        }
      });
      return () => unsub?.();
    }
  }, []);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "hidden-tabs" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setHiddenTabs(parsed);
        } catch (_) {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Synchronize Privacy Dots preference
  useEffect(() => {
    if (window.electronAPI?.getPrivacyDots) {
      window.electronAPI.getPrivacyDots().then(val => {
        if (typeof val === "boolean") setPrivacyDotsEnabled(val);
      }).catch(() => {});
    }
    const unsubs = [];
    if (window.electronAPI?.onPrivacyDotsChange) {
      const unsub = window.electronAPI.onPrivacyDotsChange((val) => {
        setPrivacyDotsEnabled(Boolean(val));
        localStorage.setItem("privacy-dots-enabled", String(val));
      });
      unsubs.push(unsub);
    }
    const handleStorage = (e) => {
      if (e.key === "privacy-dots-enabled") {
        setPrivacyDotsEnabled(e.newValue === "true");
      }
    };
    const handleCustom = () => {
      setPrivacyDotsEnabled(localStorage.getItem("privacy-dots-enabled") === "true");
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("privacy-dots-changed", handleCustom);
    return () => {
      unsubs.forEach(u => u?.());
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("privacy-dots-changed", handleCustom);
    };
  }, []);

  // Live Notification Alert State
  const [notificationAlert, setNotificationAlert] = useState(null);
  const notificationAlertTimeout = useRef(null);
  const seenNotificationIds = useRef(new Set());

  // Auto-Updater State & Handlers
  const [appVersion, setAppVersion] = useState("5.1.0");
  const [updateStatus, setUpdateStatus] = useState("idle"); // 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({ percent: 0, transferredBytes: 0, totalBytes: 0, speedBytesPerSec: 0 });
  const [updateErrorMessage, setUpdateErrorMessage] = useState("");
  const [autoUpdateCheckEnabled, setAutoUpdateCheckEnabled] = useState(localStorage.getItem("auto-update-check") !== "false");
  const [autoDownloadInstallEnabled, setAutoDownloadInstallEnabled] = useState(localStorage.getItem("auto-download-install") !== "false");

  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(v => {
        if (v) setAppVersion(v);
      }).catch(() => { });
    }

    if (window.electronAPI?.getAutoDownloadInstall) {
      window.electronAPI.getAutoDownloadInstall().then(val => {
        if (typeof val === "boolean") setAutoDownloadInstallEnabled(val);
      }).catch(() => {});
    }

    if (!window.electronAPI?.onUpdateEvent) return;

    const unsubscribe = window.electronAPI.onUpdateEvent(({ event, data }) => {
      if (event === "checking") {
        setUpdateStatus("checking");
      } else if (event === "available") {
        setUpdateStatus("available");
        setUpdateInfo(data);
      } else if (event === "not-available") {
        setUpdateStatus("not-available");
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
        setUpdateErrorMessage(typeof data === "string" ? data : "Update error");
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const handleManualCheckForUpdates = async () => {
    setUpdateStatus("checking");
    setUpdateErrorMessage("");
    try {
      if (window.electronAPI?.checkForUpdates) {
        const res = await window.electronAPI.checkForUpdates();
        if (res?.status === "available") {
          setUpdateStatus("available");
          setUpdateInfo(res.updateInfo);
        } else if (res?.status === "not-available") {
          setUpdateStatus("not-available");
        } else if (res?.status === "error") {
          setUpdateStatus("error");
          setUpdateErrorMessage(res.error || "Could not check for updates.");
        }
      }
    } catch (err) {
      setUpdateStatus("error");
      setUpdateErrorMessage(err.message || "Failed to check for updates.");
    }
  };

  const handleStartUpdateDownload = async () => {
    try {
      setUpdateStatus("downloading");
      if (window.electronAPI?.startUpdateDownload) {
        await window.electronAPI.startUpdateDownload();
      }
    } catch (err) {
      setUpdateStatus("error");
      setUpdateErrorMessage(err.message || "Failed to start download.");
    }
  };

  const handleCancelUpdateDownload = () => {
    if (window.electronAPI?.cancelUpdateDownload) {
      window.electronAPI.cancelUpdateDownload();
      setUpdateStatus("available");
    }
  };

  const handleInstallUpdate = () => {
    if (window.electronAPI?.installUpdate) {
      window.electronAPI.installUpdate();
    }
  };

  const handleAutoUpdateCheckToggle = (e) => {
    const val = e.target.value === "true";
    setAutoUpdateCheckEnabled(val);
    localStorage.setItem("auto-update-check", val ? "true" : "false");
  };

  const handleAutoDownloadInstallToggle = (checked) => {
    setAutoDownloadInstallEnabled(checked);
    localStorage.setItem("auto-download-install", checked ? "true" : "false");
    if (window.electronAPI?.setAutoDownloadInstall) {
      window.electronAPI.setAutoDownloadInstall(checked);
    }
  };

  const triggerVolumeAlert = (level) => {
    setVolumeLevel(level);
    setVolumeAlert(true);
    clearTimeout(volumeAlertTimeout.current);
    volumeAlertTimeout.current = setTimeout(() => {
      setVolumeAlert(false);
    }, 2000);
  };

  const syncTimer = useCallback(() => {
    if (!isTimerRunningRef.current) return;
    if (timerEndTimeRef.current === null) return;

    const remaining = Math.max(0, Math.round((timerEndTimeRef.current - Date.now()) / 1000));
    setTimerSeconds(remaining);

    if (remaining <= 0) {
      setIsTimerRunning(false);
      isTimerRunningRef.current = false;
      timerEndTimeRef.current = null;
      playTimerAlarmSound();
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification("Timer Finished! 🔔", { body: "Your countdown timer has ended." });
        } catch (e) {
          console.log("Notification error:", e);
        }
      }
    }
  }, []);

  const startTimer = useCallback((sec) => {
    const s = Math.max(0, sec);
    timerEndTimeRef.current = Date.now() + s * 1000;
    setTimerSeconds(s);
    setIsTimerRunning(true);
    isTimerRunningRef.current = true;
  }, []);

  const toggleTimer = useCallback(() => {
    if (isTimerRunning) {
      if (timerEndTimeRef.current !== null) {
        const remaining = Math.max(0, Math.round((timerEndTimeRef.current - Date.now()) / 1000));
        setTimerSeconds(remaining);
      }
      timerEndTimeRef.current = null;
      setIsTimerRunning(false);
      isTimerRunningRef.current = false;
    } else {
      if (timerSeconds > 0) {
        timerEndTimeRef.current = Date.now() + timerSeconds * 1000;
        setIsTimerRunning(true);
        isTimerRunningRef.current = true;
      }
    }
  }, [isTimerRunning, timerSeconds]);

  const resetTimer = useCallback(() => {
    timerEndTimeRef.current = null;
    setIsTimerRunning(false);
    isTimerRunningRef.current = false;
    setTimerSeconds(0);
  }, []);

  useEffect(() => {
    isTimerRunningRef.current = isTimerRunning;
    let interval = null;
    if (isTimerRunning) {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      if (timerEndTimeRef.current === null && timerSeconds > 0) {
        timerEndTimeRef.current = Date.now() + timerSeconds * 1000;
      }
      syncTimer();
      interval = setInterval(() => {
        syncTimer();
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, syncTimer, timerSeconds]);

  // Synchronize timer immediately when waking from lock screen, sleep, or visibility change
  useEffect(() => {
    const onWake = () => {
      syncTimer();
    };

    window.addEventListener('focus', onWake);
    document.addEventListener('visibilitychange', onWake);

    let unsub = null;
    if (window.electronAPI?.onSystemResume) {
      unsub = window.electronAPI.onSystemResume(onWake);
    }

    return () => {
      window.removeEventListener('focus', onWake);
      document.removeEventListener('visibilitychange', onWake);
      if (unsub) unsub();
    };
  }, [syncTimer]);

  // Tab calculations
  const isMusicActive = !!spotifyTrack;
  const visibleTabs = useMemo(() => {
    return tabOrder.filter(id => {
      if (hiddenTabs.includes(id)) return false;
      if (id === 3 && !isMusicActive) return false;
      return true;
    });
  }, [tabOrder, hiddenTabs, isMusicActive]);

  const [[currentTabId, direction], setTabState] = useState(() => {
    const id = visibleTabs.includes(defaultTabId) ? defaultTabId : (visibleTabs[0] ?? 0);
    return [id, 0];
  });

  const currentTab = currentTabId;
  const totalTabs = visibleTabs.length;

  // Auto-Expand Notch on Dragging Files Near Top Screen & webUtils Path Resolution
  useEffect(() => {
    const handleDragEnter = (e) => {
      if (isOutboundDragging.current) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      setIsDragOverShelf(true);
      updateMouseIgnore(false, true);
    };

    const handleDragOver = (e) => {
      if (isOutboundDragging.current) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      setIsDragOverShelf(true);
      updateMouseIgnore(false, true);
      if (e.clientY < 90) {
        if (mode !== "large") {
          setMode("large");
          setTabState([13, 13 > currentTabId ? 1 : -1]); // Auto-navigate to Shelf tab
        }
      }
    };

    const handleDragLeave = (e) => {
      if (e.clientY >= 120 || e.clientX <= 0 || e.clientX >= window.innerWidth) {
        setIsDragOverShelf(false);
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      isOutboundDragging.current = false;
      setIsDragOverShelf(false);
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const newFiles = Array.from(e.dataTransfer.files).map(f => {
          const resolvedPath = window.electronAPI?.getFilePath?.(f) || f.path || "";
          return {
            name: f.name,
            size: formatBytes(f.size),
            path: resolvedPath,
            type: f.name.split('.').pop()?.toLowerCase() || 'file'
          };
        });

        // Pre-cache 32x32 drag icons for native startDrag
        newFiles.forEach(f => {
          if (f.path && window.electronAPI?.cacheFileIcon) {
            window.electronAPI.cacheFileIcon(f.path).catch(() => {});
          }
        });

        setShelfFiles(prev => {
          const updated = [...newFiles, ...prev];
          localStorage.setItem("shelf-files", JSON.stringify(updated.slice(0, 20)));
          return updated.slice(0, 20);
        });
      }
    };

    const resetDragState = () => {
      isOutboundDragging.current = false;
      setIsDragOverShelf(false);
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    window.addEventListener("dragend", resetDragState);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("dragend", resetDragState);
    };
  }, [mode, currentTabId, updateMouseIgnore]);

  // Load tab shortcuts from main process & synchronize
  useEffect(() => {
    if (window.electronAPI?.shortcuts?.getTabShortcuts) {
      window.electronAPI.shortcuts.getTabShortcuts().then((saved) => {
        if (saved && typeof saved === "object") {
          setTabShortcuts((prev) => ({ ...prev, ...saved }));
        }
      }).catch(() => {});
    }
  }, []);

  // Instant Tab Navigation from Global Shortcuts
  useEffect(() => {
    if (!window.electronAPI?.shortcuts?.onOpenTabInstant) return;
    const unsub = window.electronAPI.shortcuts.onOpenTabInstant((targetId) => {
      const tabNum = Number(targetId);
      setForceReveal(true);
      setMode("large");
      setTabState([tabNum, tabNum > currentTabId ? 1 : -1]);
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [currentTabId]);

  // Synchronize dynamic shortcuts updates from Main/Settings
  useEffect(() => {
    if (!window.electronAPI?.shortcuts?.onShortcutsUpdated) return;
    const unsub = window.electronAPI.shortcuts.onShortcutsUpdated((updated) => {
      if (updated && typeof updated === "object") {
        setTabShortcuts((prev) => ({ ...prev, ...updated }));
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // Interactive Tab Shortcut Keydown Recorder
  useEffect(() => {
    if (recordingTabId === null) return;
    const handleRecordKey = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Escape cancels recording
      if (e.key === "Escape") {
        setRecordingTabId(null);
        setRecordingConflict(null);
        return;
      }

      // Prohibit Ctrl / Meta entirely (Click-Through feature integrity)
      if (e.ctrlKey || e.key === "Control" || e.metaKey || e.key === "Meta") {
        setRecordingConflict("Ctrl is reserved for Click-Through feature. Use Alt + key.");
        return;
      }

      // Ignore bare Alt / Shift
      if (e.key === "Alt" || e.key === "Shift") {
        return;
      }

      let keyChar = e.key.toUpperCase();
      // Allow letters, numbers, and F-keys
      if (keyChar.length === 1 || (keyChar.startsWith("F") && !isNaN(keyChar.slice(1)))) {
        const combo = `Alt+${keyChar}`;
        const updated = { ...tabShortcuts };
        let conflictTabName = null;

        for (const [idStr, existing] of Object.entries(updated)) {
          if (parseInt(idStr, 10) !== recordingTabId && existing && existing.toUpperCase() === combo) {
            const conflictDef = TABS.find((t) => t.id === parseInt(idStr, 10));
            conflictTabName = conflictDef ? conflictDef.name : `Tab ${idStr}`;
            updated[idStr] = "";
          }
        }

        updated[recordingTabId] = combo;
        setTabShortcuts(updated);
        try {
          localStorage.setItem("quick_pill_tab_shortcuts", JSON.stringify(updated));
        } catch (_) {}

        setRecordingTabId(null);
        setRecordingConflict(conflictTabName ? `Assigned ${combo} (cleared from ${conflictTabName})` : null);
        setTimeout(() => setRecordingConflict(null), 3500);

        if (window.electronAPI?.shortcuts?.setTabShortcuts) {
          window.electronAPI.shortcuts.setTabShortcuts(updated).catch(() => {});
        }
      } else {
        setRecordingConflict("Press a letter (A-Z) or number (0-9)");
      }
    };

    window.addEventListener("keydown", handleRecordKey, true);
    return () => {
      window.removeEventListener("keydown", handleRecordKey, true);
    };
  }, [recordingTabId, tabShortcuts]);

  const handleResetShortcuts = useCallback(async () => {
    setTabShortcuts(DEFAULT_TAB_SHORTCUTS);
    setRecordingTabId(null);
    setRecordingConflict("Reset all shortcuts to defaults");
    try {
      localStorage.setItem("quick_pill_tab_shortcuts", JSON.stringify(DEFAULT_TAB_SHORTCUTS));
    } catch (_) {}
    setTimeout(() => setRecordingConflict(null), 3000);
    if (window.electronAPI?.shortcuts?.resetTabShortcuts) {
      try {
        await window.electronAPI.shortcuts.resetTabShortcuts();
      } catch (_) {}
    }
  }, []);

  // --- Audio Mixer State & Handlers ---
  const [audioDevices, setAudioDevices] = useState([]);
  const [activeAudioDeviceId, setActiveAudioDeviceId] = useState(() => localStorage.getItem("audio-mixer-device-id") || "");
  const [audioSessions, setAudioSessions] = useState([]);
  const [masterAudioVolume, setMasterAudioVolume] = useState(1);
  const [masterAudioMuted, setMasterAudioMuted] = useState(false);
  const [audioSearch, setAudioSearch] = useState("");
  const [audioLoading, setAudioLoading] = useState(false);
  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);
  const isDraggingAudioVolumeRef = useRef({});
  const audioVolumeThrottleTimerRef = useRef({});

  const fetchAudioDevices = useCallback(async () => {
    if (!window.electronAPI?.audioMixer?.getDevices) return;
    try {
      const data = await window.electronAPI.audioMixer.getDevices();
      if (data && Array.isArray(data.devices)) {
        setAudioDevices(data.devices);
        if (!activeAudioDeviceId && data.defaultDeviceId) {
          setActiveAudioDeviceId(data.defaultDeviceId);
        }
      }
    } catch (_) {}
  }, [activeAudioDeviceId]);

  const fetchAudioSessions = useCallback(async (deviceId = activeAudioDeviceId, showLoading = false) => {
    if (!window.electronAPI?.audioMixer?.getSessions) return;
    if (showLoading) setAudioLoading(true);
    try {
      const data = await window.electronAPI.audioMixer.getSessions(deviceId || undefined);
      if (data) {
        if (typeof data.masterVolume === 'number') setMasterAudioVolume(data.masterVolume);
        if (typeof data.isMuted === 'boolean') setMasterAudioMuted(data.isMuted);
        if (Array.isArray(data.sessions)) {
          setAudioSessions(prev => {
            return data.sessions.map(newSession => {
              if (isDraggingAudioVolumeRef.current[newSession.id]) {
                const existing = prev.find(p => p.id === newSession.id);
                if (existing) {
                  return { ...newSession, volume: existing.volume, isMuted: existing.isMuted };
                }
              }
              return newSession;
            });
          });
        }
      }
    } catch (_) {}
    finally {
      if (showLoading) setAudioLoading(false);
    }
  }, [activeAudioDeviceId]);

  useEffect(() => {
    if (mode !== "large" || currentTab !== 12) return;
    fetchAudioDevices();
    fetchAudioSessions(activeAudioDeviceId, true);

    const interval = setInterval(() => {
      fetchAudioSessions(activeAudioDeviceId, false);
    }, 600);

    return () => clearInterval(interval);
  }, [mode, currentTab, activeAudioDeviceId, fetchAudioDevices, fetchAudioSessions]);

  const handleSetAppVolume = useCallback((session, newVol) => {
    const clamped = Math.min(1, Math.max(0, newVol));
    isDraggingAudioVolumeRef.current[session.id] = true;

    setAudioSessions(prev => prev.map(s => {
      if (s.id === session.id) {
        return { ...s, volume: clamped, isMuted: false };
      }
      return s;
    }));

    if (audioVolumeThrottleTimerRef.current[session.id]) {
      clearTimeout(audioVolumeThrottleTimerRef.current[session.id]);
    }

    audioVolumeThrottleTimerRef.current[session.id] = setTimeout(() => {
      window.electronAPI?.audioMixer?.setVolume({
        processId: session.processId,
        sessionId: session.id,
        volume: clamped,
        deviceId: activeAudioDeviceId || undefined,
        isSystemSounds: session.isSystemSounds
      });
      setTimeout(() => {
        isDraggingAudioVolumeRef.current[session.id] = false;
      }, 350);
    }, 30);
  }, [activeAudioDeviceId]);

  const handleToggleAppMute = useCallback((session) => {
    const newMute = !session.isMuted;
    setAudioSessions(prev => prev.map(s => {
      if (s.id === session.id) {
        return { ...s, isMuted: newMute };
      }
      return s;
    }));

    window.electronAPI?.audioMixer?.setMute({
      processId: session.processId,
      sessionId: session.id,
      isMuted: newMute,
      deviceId: activeAudioDeviceId || undefined,
      isSystemSounds: session.isSystemSounds
    });
  }, [activeAudioDeviceId]);

  const handleSetMasterVolume = useCallback((newVol) => {
    const clamped = Math.min(1, Math.max(0, newVol));
    setMasterAudioVolume(clamped);
    setMasterAudioMuted(false);

    if (audioVolumeThrottleTimerRef.current['__master__']) {
      clearTimeout(audioVolumeThrottleTimerRef.current['__master__']);
    }

    audioVolumeThrottleTimerRef.current['__master__'] = setTimeout(() => {
      window.electronAPI?.audioMixer?.setMasterVolume({
        volume: clamped,
        deviceId: activeAudioDeviceId || undefined
      });
    }, 30);
  }, [activeAudioDeviceId]);

  const handleToggleMasterMute = useCallback(() => {
    const newMute = !masterAudioMuted;
    setMasterAudioMuted(newMute);

    window.electronAPI?.audioMixer?.setMasterMute({
      isMuted: newMute,
      deviceId: activeAudioDeviceId || undefined
    });
  }, [masterAudioMuted, activeAudioDeviceId]);

  // --- Universal Progress Island State & Handlers ---
  const [progressSnapshot, setProgressSnapshot] = useState({
    active: [],
    history: [],
    summary: {
      activeCount: 0,
      runningCount: 0,
      pausedCount: 0,
      failedCount: 0,
      completedCount: 0,
      totalBytesPerSecond: 0,
      overallPercentage: null,
      hasIndeterminate: false
    },
    compactDisplay: null
  });
  const [progressFilter, setProgressFilter] = useState("all"); // 'all' | 'active' | 'history'
  const [isStartingProgressTest, setIsStartingProgressTest] = useState(false);

  useEffect(() => {
    if (window.electronAPI?.progress?.getSnapshot) {
      window.electronAPI.progress.getSnapshot().then(snap => {
        if (snap) setProgressSnapshot(snap);
      }).catch(() => {});
    }

    if (window.electronAPI?.progress?.onUpdate) {
      const unsub = window.electronAPI.progress.onUpdate((snap) => {
        if (snap) setProgressSnapshot(snap);
      });
      return unsub;
    }
  }, []);

  const handleProgressAction = useCallback(async (operationId, action, params = {}) => {
    if (window.electronAPI?.progress?.executeAction) {
      try {
        await window.electronAPI.progress.executeAction(operationId, action, params);
      } catch (err) {
        console.error("Progress action error:", err);
      }
    }
  }, []);

  const handleClearProgressHistory = useCallback(async () => {
    if (window.electronAPI?.progress?.clearHistory) {
      try {
        await window.electronAPI.progress.clearHistory();
      } catch (err) {
        console.error("Clear progress history error:", err);
      }
    }
  }, []);

  const handleStartFileHashTest = useCallback(async () => {
    if (isStartingProgressTest) return;
    setIsStartingProgressTest(true);
    try {
      if (window.electronAPI?.progress?.selectFile && window.electronAPI?.progress?.startHashOperation) {
        const filePath = await window.electronAPI.progress.selectFile();
        if (filePath) {
          await window.electronAPI.progress.startHashOperation({ sourcePath: filePath });
        }
      }
    } catch (err) {
      console.error("Failed to start file hash test:", err);
    } finally {
      setIsStartingProgressTest(false);
    }
  }, [isStartingProgressTest]);

  // Daily Quote feature state & handlers
  const [dailyQuoteIndex, setDailyQuoteIndex] = useState(() => {
    try {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 0);
      const diff = now - startOfYear;
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);
      const defaultIndex = dayOfYear % DAILY_QUOTES.length;

      const saved = localStorage.getItem("quick_pill_quote_index");
      const savedDate = localStorage.getItem("quick_pill_quote_date");
      const todayStr = now.toDateString();
      if (saved !== null && savedDate === todayStr) {
        return parseInt(saved, 10) % DAILY_QUOTES.length;
      }
      return defaultIndex;
    } catch {
      return 0;
    }
  });
  const [quoteCopied, setQuoteCopied] = useState(false);

  const handleNextQuote = (e) => {
    e?.stopPropagation?.();
    setDailyQuoteIndex(prev => {
      const next = (prev + 1) % DAILY_QUOTES.length;
      try {
        localStorage.setItem("quick_pill_quote_index", String(next));
        localStorage.setItem("quick_pill_quote_date", new Date().toDateString());
      } catch (err) {}
      return next;
    });
  };

  const handleCopyQuote = (e, q) => {
    e?.stopPropagation?.();
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(`"${q.quote}" — ${q.author}`);
      }
      setQuoteCopied(true);
      setTimeout(() => setQuoteCopied(false), 2000);
    } catch (err) {}
  };

  const [showPausedQuickView, setShowPausedQuickView] = useState(false);
  const pausedTimeout = useRef(null);

  useEffect(() => {
    if (spotifyTrack?.state === 'paused') {
      setShowPausedQuickView(true);
      if (pausedTimeout.current) clearTimeout(pausedTimeout.current);
      pausedTimeout.current = setTimeout(() => {
        setShowPausedQuickView(false);
      }, 3000);
    } else {
      setShowPausedQuickView(false);
      if (pausedTimeout.current) clearTimeout(pausedTimeout.current);
    }
  }, [spotifyTrack?.state]);

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.includes(currentTabId)) {
      setTabState([visibleTabs[0], 0]);
    }
  }, [visibleTabs, currentTabId]);
  const albumRef = useRef(null);
  const isDraggingRef = useRef(false);
  const mouseLeaveTimer = useRef(null);
  const hoverIntentTimer = useRef(null);

  const updateDragging = (val) => {
    isDraggingRef.current = val;
    setIsDragging(val);
  };
  const [displays, setDisplays] = useState([]);
  const [currentDisplayId, setCurrentDisplayId] = useState(localStorage.getItem("display-id") || "2287529652");
  const [weatherLocation, setWeatherLocation] = useState(localStorage.getItem("location") || "Chattogram");
  const [autoLaunchEnabled, setAutoLaunchEnabled] = useState(localStorage.getItem("auto-launch") !== "false");
  const [positionMode, setPositionMode] = useState(localStorage.getItem("position-mode") || localStorage.getItem("side-mode") || "top-center");

  const [islandX, setIslandX] = useState(() => {
    const saved = localStorage.getItem("island-x");
    const num = Number(saved);
    return (saved !== null && !isNaN(num)) ? Math.max(0, Math.min(100, num)) : 50;
  });

  const [islandY, setIslandY] = useState(() => {
    const saved = localStorage.getItem("island-y");
    const num = Number(saved);
    if (saved !== null && !isNaN(num)) {
      if (num === 20 || num === 6) return 0;
      return Math.max(0, Math.min(1000, num));
    }
    return 0;
  });

  const tabVariants = {
    enter: () => ({
      opacity: 0,
      scale: 0.92,
      filter: "blur(8px)",
      x: "-50%",
      transition: {
        duration: 0.26,
        ease: [0.22, 1, 0.36, 1]
      }
    }),
    center: {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      x: "-50%",
      transition: {
        duration: 0.26,
        ease: [0.22, 1, 0.36, 1]
      }
    },
    exit: () => ({
      opacity: 0,
      scale: 0.9,
      filter: "blur(6px)",
      x: "-50%",
      transition: {
        duration: 0.14,
        ease: "easeOut"
      }
    })
  };

  const wheelSwipeThreshold = 60;
  const wheelLockout = useRef(false);
  const wheelAccumulator = useRef(0);
  const wheelResetTimeout = useRef(null);
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const swipeMoved = useRef(false);
  const suppressClick = useRef(false);
  const swipeThreshold = 40;
  const moveTab = (direction) => {
    const currentIndex = visibleTabs.indexOf(currentTabId);
    if (currentIndex === -1 && visibleTabs.length > 0) {
      setTabState([visibleTabs[0], 1]);
      return;
    }
    if (direction > 0) {
      const nextIndex = (currentIndex + 1) % visibleTabs.length;
      setTabState([visibleTabs[nextIndex], 1]);
    } else if (direction < 0) {
      const prevIndex = (currentIndex - 1 + visibleTabs.length) % visibleTabs.length;
      setTabState([visibleTabs[prevIndex], -1]);
    }
  };

  const settingsContainerRef = useRef(null);
  const isDragScrolling = useRef(false);
  const dragScrollStartY = useRef(0);
  const dragScrollStartTop = useRef(0);

  const handleSettingsMouseDown = (e) => {
    if (e.target.closest("button, select, input, [draggable='true']")) return;
    isDragScrolling.current = true;
    dragScrollStartY.current = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    if (settingsContainerRef.current) {
      dragScrollStartTop.current = settingsContainerRef.current.scrollTop;
    }
  };

  const handleSettingsMouseMove = (e) => {
    if (!isDragScrolling.current || !settingsContainerRef.current) return;
    const currentY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    const deltaY = currentY - dragScrollStartY.current;
    settingsContainerRef.current.scrollTop = dragScrollStartTop.current - deltaY;
  };

  const handleSettingsMouseUp = () => {
    isDragScrolling.current = false;
  };

  const handleWheelSwipe = (e) => {
    if (wheelLockout.current || isDragging) return;

    // Check if the gesture is a HORIZONTAL swipe (deltaX dominates deltaY)
    const isHorizontalSwipe = Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) >= 3;

    // For vertical wheel scrolling, check if pointer is inside a scrollable container
    if (!isHorizontalSwipe) {
      let scrollableElem = e.target.closest("#clipboard, .notifications-container, #task-list, .task-list-scrollable, #settings-sidebar, .settings-sidebar, .settings-sidebar-scrollable, #settings-content, .settings-content, .settings-content-scrollable, #settings-container, .calendar-container, .audio-mixer-scrollable, .progress-island-scrollable, .launcher-scrollable, .notes-scrollable, [data-scrollable='true']");
      if (scrollableElem && scrollableElem.scrollHeight <= scrollableElem.clientHeight + 2) {
        const innerScrollable = e.target.closest("#settings-sidebar, #settings-content, .settings-sidebar-scrollable, .settings-content-scrollable, [data-scrollable='true']");
        if (innerScrollable) {
          scrollableElem = innerScrollable;
        }
      }
      if (scrollableElem) {
        const isScrollable = scrollableElem.scrollHeight > scrollableElem.clientHeight + 2;
        if (isScrollable) {
          const atTop = scrollableElem.scrollTop <= 2;
          const atBottom = scrollableElem.scrollTop + scrollableElem.clientHeight >= scrollableElem.scrollHeight - 2;

          // If scrolling vertically inside content (down when not at bottom, or up when not at top), allow content to scroll naturally
          if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) {
            return;
          }
        }
      }
    }

    // Support both mouse wheel (deltaY) and touch/trackpad swipe (deltaX)
    let delta = isHorizontalSwipe ? e.deltaX : (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX);
    if (e.deltaMode === 1) delta *= 40;
    if (e.deltaMode === 2) delta *= 800;

    if (Math.abs(delta) < 2) return;

    wheelAccumulator.current += delta;
    if (wheelResetTimeout.current) clearTimeout(wheelResetTimeout.current);
    wheelResetTimeout.current = setTimeout(() => {
      wheelAccumulator.current = 0;
    }, 150);

    if (Math.abs(wheelAccumulator.current) >= 30) {
      const isNext = wheelAccumulator.current > 0;
      wheelLockout.current = true;
      wheelAccumulator.current = 0;

      moveTab(isNext ? 1 : -1);
      setTimeout(() => {
        wheelLockout.current = false;
      }, 250);
    }
  };

  const isInteractiveTarget = (target) => {
    const targetTag = target?.tagName;
    return (
      targetTag === "INPUT" ||
      targetTag === "TEXTAREA" ||
      targetTag === "SELECT" ||
      targetTag === "LABEL" ||
      target?.closest?.("button") ||
      target?.closest?.(".radio-label") ||
      target?.closest?.(".clipboard-row") ||
      target?.closest?.(".notification-card") ||
      target?.closest?.(".notification-item") ||
      target?.closest?.(".notification-summary") ||
      target?.closest?.("[data-no-toggle]")
    );
  };

  const handlePointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const target = e.target;
    if (mode !== "large" || isDragging || isInteractiveTarget(target) || target?.closest("#userinput") || target?.id === "userinput") {
      swipeStartX.current = null;
      return;
    }
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
    swipeMoved.current = false;
  };

  const handlePointerMove = (e) => {
    const isCtrl = !!(e?.ctrlKey || e?.metaKey);
    if (isCtrl && !ctrlHeldRef.current) {
      setCtrlState(true);
      updateMouseIgnore(true, true);
    } else if (!isCtrl && ctrlHeldRef.current) {
      setCtrlState(false);
      updateMouseIgnore(false, true);
    }

    if (swipeStartX.current === null || mode !== "large") return;
    const dx = Math.abs(e.clientX - swipeStartX.current);
    const dy = Math.abs(e.clientY - swipeStartY.current);
    if (dx > 8 || dy > 8) {
      swipeMoved.current = true;
      suppressClick.current = true;
    }
  };

  const handlePointerUp = (e) => {
    setTimeout(() => {
      suppressClick.current = false;
    }, 100);

    if (swipeStartX.current === null) return;
    const startX = swipeStartX.current;
    const startY = swipeStartY.current;
    swipeStartX.current = null;

    if (mode !== "large" || isDragging || wheelLockout.current) return;
    if (!swipeMoved.current) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) < swipeThreshold || Math.abs(dx) <= Math.abs(dy)) return;

    wheelLockout.current = true;
    moveTab(dx > 0 ? -1 : 1);
    setTimeout(() => {
      wheelLockout.current = false;
    }, 800);
  };

  const isPlaying = spotifyTrack?.state === 'playing';
  const isHudActive = Boolean(
    (activeHudToast && (activeHudToast.title || activeHudToast.type || activeHudToast.subtext)) ||
    (notificationAlert && mode !== "large" && (notificationAlert.title || notificationAlert.message || notificationAlert.appName || notificationAlert.body))
  );
  const effectiveObstructed = smartBrowserAvoidance && isObstructed;
  const isMicroMode = !isHovered && mode !== "large" && !isHudActive && !forceReveal && (effectiveObstructed || minimalNotch);

  const handleToggleMinimalNotchForce = useCallback(() => {
    if (isMicroMode) {
      setForceReveal(true);
      setMinimalNotch(false);
      localStorage.setItem("minimal-notch", "false");
      if (window.electronAPI?.setMinimalNotch) {
        window.electronAPI.setMinimalNotch(false).catch(() => {});
      }
    } else {
      setForceReveal(false);
      setMinimalNotch(true);
      localStorage.setItem("minimal-notch", "true");
      if (window.electronAPI?.setMinimalNotch) {
        window.electronAPI.setMinimalNotch(true).catch(() => {});
      }
    }
  }, [isMicroMode]);

  useEffect(() => {
    if (!window.electronAPI?.onToggleMinimalNotchHotkey) return;
    const unsub = window.electronAPI.onToggleMinimalNotchHotkey(() => {
      handleToggleMinimalNotchForce();
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [handleToggleMinimalNotchForce]);

  // Multi-Stage Spring Shell Dimensions (Nusa Motion Reference Engine)
  // 1. micro-strip: 96px x 5px (radius 6px)
  // 2. idle-clock: 154px x 32px (radius 16px)
  // 3. idle-mascot: 140px x 32px (radius 16px)
  // 4. toast-hud: 310px x 62px (radius 24px)
  // 5. expanded-standard: 430px x 150px (radius 28px)
  // 6. expanded-wide: 510px x 150px (radius 28px)
  const isLyricsWide = mode === "large" && currentTab === 3 && lyricsOpen;

  const pendingTasksCount = useMemo(() => {
    if (!Array.isArray(tasks)) return 0;
    return tasks.filter(t => (typeof t === "object" ? !(t.completed || t.done) : true)).length;
  }, [tasks]);

  const activeMascotMood = useMemo(() => {
    if (pomodoroState?.isRunning) return "focusing";
    if (isPlaying) return "vibing";
    if (charging) return "charging";
    if (percent !== null && percent < 25) return "low-battery";
    if (pendingTasksCount > 0 || (Array.isArray(shelfFiles) && shelfFiles.length > 0)) return "busy-tasks";
    if (waterIntake > 0 && waterIntake < 1500) return "thirsty";
    return "chill";
  }, [waterIntake, pomodoroState?.isRunning, isPlaying, charging, percent, pendingTasksCount, shelfFiles]);

  const isIdleMascot = mode !== "large" && !isHudActive && !isMicroMode && Boolean(mascotMode && timerSeconds === 0);

  const width = isHudActive
    ? 310
    : mode === "large"
      ? (isLyricsWide ? 510 : 430)
      : isMicroMode
        ? 96
        : (isIdleMascot ? 140 : 154);

  const height = isHudActive
    ? 62
    : mode === "large"
      ? 150
      : isMicroMode
        ? 5
        : 32;

  const cornerRadius = isMicroMode
    ? 6
    : isHudActive
      ? 24
      : mode === "large"
        ? 28
        : 16;

  useEffect(() => {
    if (window.electronAPI?.platform === 'win32') {
      window.electronAPI?.buildAppCache?.();
    }
  }, []);

  useEffect(() => {
    const savedDisplayId = localStorage.getItem("display-id");
    if (savedDisplayId && window.electronAPI?.setDisplay) {
      window.electronAPI.setDisplay(savedDisplayId);
    }

    if (window.electronAPI?.updateWindowPosition) {
      window.electronAPI.updateWindowPosition(islandX, islandY);
    }

    if (window.electronAPI?.setAutoLaunch) {
      window.electronAPI.setAutoLaunch(autoLaunchEnabled);
    }

    if (!localStorage.getItem('newuser')) {
      localStorage.setItem('newuser', 'true');
    }

    if (localStorage.getItem('newuser') === 'true') {
      const timer = setTimeout(() => {
        window.electronAPI?.openExternal ? window.electronAPI.openExternal("quickpill.neosparkx.com") : window.open("quickpill.neosparkx.com", "_blank");
        localStorage.setItem('newuser', 'false');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  // localStorage defaults
  useEffect(() => {
    const defaults = {
      "auto-download-install": "true",
      "always-on-top": "true",
      "battery-alerts": "true",
      "default-tab": "2",
      "island-border": "false",
      "hide-island-notactive": "false",
      "standby-mode": "false",
      "large-standby-mode": "false",
      "show-info-when-idle": "true",
      "hour-format": "12-hr",
      "island-x": "50",
      "island-y": "6",
      "bg-color": "#000000",
      "text-color": "#FFFFFF",
      "weather-unit": "c",
      "auto-launch": "true",
      "position-mode": "top-center",
      "location": "Chattogram",
      "display-id": "2287529652",
      "tab-order": "[2,4,5,6,7,8,10,0,1,3,9]",
      "hidden-tabs": "[6]"
    };
    for (const [key, val] of Object.entries(defaults)) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, val);
      }
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI?.getAlwaysOnTop) {
      window.electronAPI.getAlwaysOnTop().then((enabled) => {
        if (typeof enabled === "boolean") {
          setAlwaysOnTopEnabled(enabled);
        }
      }).catch(() => {});
    }
    if (window.electronAPI?.onAlwaysOnTopChange) {
      const unsub = window.electronAPI.onAlwaysOnTopChange((enabled) => {
        setAlwaysOnTopEnabled(enabled);
        localStorage.setItem("always-on-top", String(enabled));
      });
      return unsub;
    }
  }, []);

  const handleAlwaysOnTopChange = (e) => {
    const value = e.target.value === "true";
    setAlwaysOnTopEnabled(value);
    localStorage.setItem("always-on-top", value ? "true" : "false");
    if (window.electronAPI?.setAlwaysOnTop) {
      window.electronAPI.setAlwaysOnTop(value);
    }
  };

  const handleBatteryAlertsChange = (e) => {
    const value = e.target.value === "true";
    setBatteryAlertsEnabled(value);
    localStorage.setItem("battery-alerts", value ? "true" : "false");
  };

  const handleIslandBorderChange = (e) => {
    const value = e.target.value === "true";
    setIslandBorderEnabled(value);
    localStorage.setItem("island-border", value ? "true" : "false");
  };

  const handleStandbyChange = (e) => {
    const value = e.target.value === "true";
    setStandbyBorderEnabled(value);
    localStorage.setItem("standby-mode", value ? "true" : "false");
  };

  const handleLargeStandbyChange = (e) => {
    const value = e.target.value === "true";
    setLargeStandbyEnabled(value);
    localStorage.setItem("large-standby-mode", value ? "true" : "false");
  };

  const handleHourFormatChange = (e) => {
    const value = e.target.value;
    setHourFormat(value === "12-hr");
    localStorage.setItem("hour-format", value);
  };

  const handleAutoLaunchChange = (e) => {
    const value = e.target.value === "true";
    setAutoLaunchEnabled(value);
    localStorage.setItem("auto-launch", value ? "true" : "false");
    window.electronAPI?.setAutoLaunch(value);
  };

  const handlehideNotActiveIslandChange = (e) => {
    const value = e.target.value === "true";
    sethideNotActiveIslandEnabled(value);
    localStorage.setItem("hide-island-notactive", value ? "true" : "false");
  };

  const handleShowInfoWhenIdleChange = (e) => {
    const value = e.target.value === "true";
    setShowInfoWhenIdleEnabled(value);
    localStorage.setItem("show-info-when-idle", value ? "true" : "false");
  };

  const handleWeatherUnitChange = (e) => {
    const value = e.target.value === "c" ? "c" : "f";
    setweatherUnit(value);
    localStorage.setItem("weather-unit", value);
  };

  const handleBgColorChange = (e) => {
    const value = e.target.value;
    setBgColor(value);
    localStorage.setItem("bg-color", value);
  };

  const handleTextColorChange = (e) => {
    const value = e.target.value;
    setTextColor(value);
    localStorage.setItem("text-color", value);
  };

  const handleDisplayChange = (e) => {
    const displayId = e.target.value;
    setCurrentDisplayId(displayId);
    localStorage.setItem("display-id", displayId);
    if (window.electronAPI?.setDisplay) {
      window.electronAPI.setDisplay(displayId);
    }
  };

  const handleIslandXChange = (e) => {
    const value = Number(e.target.value);
    setIslandX(value);
    window.electronAPI?.updateWindowPosition?.(value, islandY);
  };

  const handleIslandYChange = (e) => {
    const value = Number(e.target.value);
    setIslandY(value);
    window.electronAPI?.updateWindowPosition?.(islandX, value);
  };

  const savePosition = () => {
    localStorage.setItem("island-x", islandX);
    localStorage.setItem("island-y", islandY);
  };

  useEffect(() => {
    if (currentTab === 9 && window.electronAPI?.getDisplays) {
      window.electronAPI.getDisplays().then(setDisplays);
    }
  }, [currentTab]);

  const handleBgImageChange = (e) => {
    const value = e.target.value;
    setBgImage(value);
    localStorage.setItem("bg-image", value);
  };

  // Get battery info
  useEffect(() => {
    let battery, handler;
    (async () => {
      if (!("getBattery" in navigator)) return setPercent(null);
      try {
        battery = await navigator.getBattery();
        const update = () => {
          setPercent(Math.round(battery.level * 100));
          setCharging(battery.charging);
          setBatteryDischargingTime(battery.dischargingTime);
          setBatteryChargingTime(battery.chargingTime);
        };
        handler = update;
        update();
        battery.addEventListener("chargingchange", handler);
        battery.addEventListener("levelchange", handler);
        battery.addEventListener("chargingtimechange", handler);
        battery.addEventListener("dischargingtimechange", handler);
      } catch {
        setPercent(null);
      }
    })();

    return () => {
      if (battery && handler) {
        battery.removeEventListener("levelchange", handler);
        battery.removeEventListener("chargingchange", handler);
        battery.removeEventListener("chargingtimechange", handler);
        battery.removeEventListener("dischargingtimechange", handler);
      }
    };
  }, []);

  // Continuous Battery Drain & Charge Telemetry Collector (Sampled every 30s + on state change)
  useEffect(() => {
    if (percent === null) return;

    const recordSample = () => {
      const now = Date.now();
      setBatteryHistory(prev => {
        const lastSample = prev[prev.length - 1];
        if (
          lastSample &&
          (now - lastSample.timestamp < 15000) &&
          lastSample.percent === percent &&
          lastSample.charging === charging
        ) {
          return prev;
        }
        const cutoff = now - 6 * 60 * 60 * 1000; // 6-hour sliding retention window
        const updated = [...prev.filter(s => s.timestamp > cutoff), { timestamp: now, percent, charging }];
        try {
          localStorage.setItem("quick_pill_battery_history", JSON.stringify(updated));
        } catch {}
        return updated;
      });
    };

    recordSample();
    const interval = setInterval(recordSample, 30000);
    return () => clearInterval(interval);
  }, [percent, charging]);

  // Intelligent Battery Runtime, Drain Velocity & Power Profile Analytics Engine (Apple HIG)
  const batteryAnalytics = useMemo(() => {
    const currentPercent = percent !== null ? Math.min(100, Math.max(0, percent)) : 85;
    const isCharging = charging;
    const now = Date.now();

    // 1. Analyze historical sliding window drain / charge velocity
    let measuredDrainRate = null; // % per hour
    let measuredChargeRate = null; // % per hour

    if (batteryHistory.length >= 2) {
      const matchingSamples = batteryHistory.filter(s => s.charging === isCharging);
      if (matchingSamples.length >= 2) {
        const oldest = matchingSamples[0];
        const newest = matchingSamples[matchingSamples.length - 1];
        const timeDiffHours = (newest.timestamp - oldest.timestamp) / (1000 * 60 * 60);

        if (timeDiffHours >= 0.02) {
          const pctDiff = newest.percent - oldest.percent;
          if (!isCharging && pctDiff < 0) {
            measuredDrainRate = Math.abs(pctDiff) / timeDiffHours;
          } else if (isCharging && pctDiff > 0) {
            measuredChargeRate = pctDiff / timeDiffHours;
          }
        }
      }
    }

    // 2. Hardware CPU-modulated baseline drain rate
    const cpuLoad = (systemStats && typeof systemStats.cpu === "number") ? systemStats.cpu : 15;
    const baselineDrainRate = 8.0 + (cpuLoad / 100) * 16.0;

    let effectiveDrainRate = baselineDrainRate;
    if (measuredDrainRate && measuredDrainRate >= 3 && measuredDrainRate <= 50) {
      effectiveDrainRate = measuredDrainRate * 0.7 + baselineDrainRate * 0.3;
    }

    let effectiveChargeRate = 42.0;
    if (measuredChargeRate && measuredChargeRate >= 10 && measuredChargeRate <= 90) {
      effectiveChargeRate = measuredChargeRate * 0.75 + 42.0 * 0.25;
    }

    let minutesRemaining = 0;
    let timeRemainingStr = "";
    let endTargetTimeStr = "";
    let rateText = "";
    let powerModeTag = "Normal Power";

    if (isCharging) {
      powerModeTag = "AC Power";
      if (currentPercent >= 100) {
        timeRemainingStr = "Fully Charged";
        endTargetTimeStr = "Power Adapter Connected";
        rateText = "100%";
      } else {
        if (batteryChargingTime && isFinite(batteryChargingTime) && batteryChargingTime > 0 && batteryChargingTime < 86400) {
          minutesRemaining = Math.max(1, Math.round(batteryChargingTime / 60));
        } else {
          const needed = 100 - currentPercent;
          const hours = needed / effectiveChargeRate;
          minutesRemaining = Math.max(1, Math.round(hours * 60));
        }

        const hrs = Math.floor(minutesRemaining / 60);
        const mins = minutesRemaining % 60;
        timeRemainingStr = hrs > 0 ? (mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`) : `${mins} min`;

        const targetDate = new Date(now + minutesRemaining * 60 * 1000);
        let targetHours = targetDate.getHours();
        const targetMins = targetDate.getMinutes().toString().padStart(2, '0');
        if (hourFormat) {
          const ampm = targetHours >= 12 ? 'PM' : 'AM';
          targetHours = targetHours % 12 || 12;
          endTargetTimeStr = `Full by ~${targetHours}:${targetMins} ${ampm}`;
        } else {
          endTargetTimeStr = `Full by ~${targetHours.toString().padStart(2, '0')}:${targetMins}`;
        }

        rateText = `+${Math.round(effectiveChargeRate)}% / hr`;
      }
    } else {
      // Discharging (Battery Mode)
      if (currentPercent <= 20) {
        powerModeTag = "Low Power";
      } else if (effectiveDrainRate > 17) {
        powerModeTag = "High Usage";
      } else {
        powerModeTag = "Normal Power";
      }

      if (batteryDischargingTime && isFinite(batteryDischargingTime) && batteryDischargingTime > 60 && batteryDischargingTime < 86400) {
        minutesRemaining = Math.max(1, Math.round(batteryDischargingTime / 60));
      } else {
        const hours = currentPercent / effectiveDrainRate;
        minutesRemaining = Math.max(1, Math.min(1080, Math.round(hours * 60)));
      }

      const hrs = Math.floor(minutesRemaining / 60);
      const mins = minutesRemaining % 60;
      timeRemainingStr = hrs > 0 ? (mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`) : `${mins} min`;

      const targetDate = new Date(now + minutesRemaining * 60 * 1000);
      let targetHours = targetDate.getHours();
      const targetMins = targetDate.getMinutes().toString().padStart(2, '0');
      if (hourFormat) {
        const ampm = targetHours >= 12 ? 'PM' : 'AM';
        targetHours = targetHours % 12 || 12;
        endTargetTimeStr = `Depletes at ~${targetHours}:${targetMins} ${ampm}`;
      } else {
        endTargetTimeStr = `Depletes at ~${targetHours.toString().padStart(2, '0')}:${targetMins}`;
      }

      rateText = `~${effectiveDrainRate.toFixed(1)}% / hr`;
    }

    // Generate 8-bar Apple Activity graph
    const activityBars = [];
    const barCount = 8;
    if (batteryHistory.length >= barCount) {
      const step = Math.floor(batteryHistory.length / barCount);
      for (let i = 0; i < barCount; i++) {
        const idx = Math.min(batteryHistory.length - 1, i * step);
        const lvl = batteryHistory[idx].percent;
        activityBars.push({
          height: Math.max(20, Math.min(100, lvl)),
          isCurrent: i === barCount - 1
        });
      }
    } else {
      for (let i = 0; i < barCount; i++) {
        const offset = (barCount - 1 - i) * (isCharging ? -1.5 : 1.2);
        const val = Math.max(20, Math.min(100, currentPercent + offset));
        activityBars.push({
          height: val,
          isCurrent: i === barCount - 1
        });
      }
    }

    return {
      currentPercent,
      isCharging,
      timeRemainingStr,
      endTargetTimeStr,
      rateText,
      powerModeTag,
      activityBars
    };
  }, [percent, charging, batteryDischargingTime, batteryChargingTime, batteryHistory, systemStats, hourFormat]);

  // Battery alerts
  useEffect(() => {
    if (
      typeof percent === "number" &&
      (percent === 20 || percent === 15 || percent === 10 || percent === 5 || percent === 3) &&
      localStorage.getItem("battery-alerts") === "true"
    ) {
      setMode("quick");
      setAlert(true);
      const timerId = setTimeout(() => {
        setMode("still");
        setAlert(null);
      }, 3000);
      return () => {
        clearTimeout(timerId);
      };
    }
  }, [percent]);

  useEffect(() => {
    if (
      (charging === true) &&
      localStorage.getItem("battery-alerts") === "true"
    ) {
      setMode("quick");
      setChargingAlert(true);
      const timerId = setTimeout(() => {
        setMode("still");
        setChargingAlert(false);
      }, 1500);
      return () => {
        clearTimeout(timerId);
      };
    }
  }, [charging]);


  // Get time
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, "0");
      if (hourFormat) {
        hours = hours % 12;
        hours = hours ? hours : 12;
      }
      setTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [hourFormat]);

  //Standby Mode 
  useEffect(() => {
    if (standbyBorderEnabled && mode === 'still') {
      setMode('quick');
    } else if (largeStandbyEnabled && mode === 'still') {
      setMode('large');
    }
  }, [standbyBorderEnabled, largeStandbyEnabled]);

  // Get Weather
  useEffect(() => {
    let isCancelled = false;
    const getWeather = async () => {
      const loc = localStorage.getItem("location") || weatherLocation;
      const unit = localStorage.getItem("weather-unit") || weatherUnit || "f";
      const q = loc && loc.trim() ? encodeURIComponent(loc.trim()) : "auto:ip";

      try {
        const response = await fetch(
          `https://api.weatherapi.com/v1/current.json?key=0b18c67c443543e0a6045401250911&q=${q}&aqi=no`
        );
        if (response.ok) {
          const data = await response.json();
          if (data?.current && !isCancelled) {
            const key = unit === "c" ? "temp_c" : "temp_f";
            const tempVal = Math.round(data.current[key]);
            if (!isNaN(tempVal)) {
              setWeather({
                temp: tempVal,
                status: data.current.condition?.text || "",
                humidity: data.current.humidity ? `${data.current.humidity}%` : "",
                wind: data.current.wind_mph ? `${Math.round(data.current.wind_mph)} mph` : ""
              });
              return;
            }
          }
        }
      } catch (e) {
        console.error("WeatherAPI fetch failed, attempting fallback...", e);
      }

      // Fallback: wttr.in open weather API
      try {
        const fallbackQuery = loc && loc.trim() ? encodeURIComponent(loc.trim()) : "";
        const fallbackRes = await fetch(`https://wttr.in/${fallbackQuery}?format=j1`);
        if (fallbackRes.ok && !isCancelled) {
          const data = await fallbackRes.json();
          const current = data?.current_condition?.[0];
          if (current) {
            const rawTemp = unit === "c" ? parseFloat(current.temp_C) : parseFloat(current.temp_F);
            const tempVal = Math.round(rawTemp);
            if (!isNaN(tempVal)) {
              setWeather({
                temp: tempVal,
                status: current.weatherDesc?.[0]?.value || "",
                humidity: current.humidity ? `${current.humidity}%` : "",
                wind: current.windspeedMiles ? `${current.windspeedMiles} mph` : ""
              });
            }
          }
        }
      } catch (err) {
        console.error("Weather fallback fetch failed", err);
      }
    };

    getWeather();
    const interval = setInterval(getWeather, 600000); // 10 mins
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [weatherLocation, weatherUnit]);

  // Set theme
  useEffect(() => {
    if (theme === "sleek-black") {
      localStorage.setItem("bg-color", "#000000");
      localStorage.setItem("text-color", "#FFFFFF");
      setBgColor("#000000");
      setTextColor("#FFFFFF");
    } else if (theme === "win95") {
      localStorage.setItem("bg-color", "rgba(195, 195, 195)");
      localStorage.setItem("text-color", "rgba(0, 0, 0)");
      setBgColor("rgba(195, 195, 195)");
      setTextColor("rgba(0, 0, 0)");
    } else if (theme === "invisible") {
      localStorage.setItem("bg-image", "none");
      setBgImage("none");
      localStorage.setItem("bg-color", "rgba(255, 255, 255, 0)");
      localStorage.setItem("text-color", "rgba(0, 0, 0, 0)");
      setBgColor("rgba(255, 255, 255, 0)");
      setTextColor("rgba(0, 0, 0, 0)");
    } else if (theme === "none") {
      const defaultBg = "#000000";
      const defaultText = "#FFFFFF";
      localStorage.setItem("bg-color", defaultBg);
      localStorage.setItem("text-color", defaultText);
      setBgColor(defaultBg);
      setTextColor(defaultText);
    }
  }, [theme]);

  // Browser Search Feature
  function searchBrowser() {
    const trimmedSearch = browserSearch.trim();
    if (!trimmedSearch) return;
    if (trimmedSearch.includes(".")) {
      const hasProtocol = /^https?:\/\//i.test(trimmedSearch);
      const urlToOpen = hasProtocol ? trimmedSearch : `https://${trimmedSearch}`;
      window.electronAPI?.openExternal ? window.electronAPI.openExternal(urlToOpen) : window.open(urlToOpen, "_blank");
    } else {
      const encodedQuery = encodeURIComponent(trimmedSearch);
      window.electronAPI?.openExternal ? window.electronAPI.openExternal(`https://www.google.com/search?q=${encodedQuery}`) : window.open(`https://www.google.com/search?q=${encodedQuery}`, "_blank");
    }
  }

  // Clipboard
  function formatRelativeTime(timestamp) {
    if (!timestamp) return "Just now";
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 15) return "Just now";
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  const clearAllClipboard = () => {
    if (window.electronAPI?.clipboard?.clear) {
      window.electronAPI.clipboard.clear();
    } else if (window.electronAPI?.clearClipboard) {
      window.electronAPI.clearClipboard();
    }
    setClipboard([]);
  };

  const copyClipboardItem = (item, idOrIdx) => {
    const textToCopy = typeof item === "object" ? (item.text || "") : String(item || "");
    if (!textToCopy) return;

    if (window.electronAPI?.clipboard?.write) {
      window.electronAPI.clipboard.write(textToCopy);
    } else if (window.electronAPI?.writeClipboardText) {
      window.electronAPI.writeClipboardText(textToCopy);
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy);
    }

    setCopiedClipboardId(idOrIdx);
    setTimeout(() => {
      setCopiedClipboardId(prev => prev === idOrIdx ? null : prev);
    }, 1500);
  };

  useEffect(() => {
    // Initial fetch from main process active clipboard history
    if (window.electronAPI?.clipboard?.getHistory) {
      window.electronAPI.clipboard.getHistory().then(history => {
        if (Array.isArray(history) && history.length > 0) {
          setClipboard(history);
        }
      }).catch(() => {});
    }

    // Real-time listener for updates broadcasted by main process
    if (window.electronAPI?.clipboard?.onUpdate) {
      const unsub = window.electronAPI.clipboard.onUpdate((history) => {
        if (Array.isArray(history)) {
          setClipboard(history);
        }
      });
      return unsub;
    }

    // Fallback polling for web browser preview or older preload
    const fallbackPoll = async () => {
      let text = "";
      if (window.electronAPI?.getClipboardText) {
        text = await window.electronAPI.getClipboardText();
      } else if (navigator.clipboard?.readText) {
        text = await navigator.clipboard.readText().catch(() => "");
      }
      if (!text || !text.trim()) return;

      setClipboard(prev => {
        const first = prev[0];
        const firstText = typeof first === "object" ? first.text : first;
        if (firstText === text.trim()) return prev;
        const newItem = { id: Date.now(), text: text.trim(), timestamp: Date.now() };
        return [newItem, ...prev.filter(i => (typeof i === "object" ? i.text : i) !== text.trim())].slice(0, 15);
      });
    };

    fallbackPoll();
    const interval = setInterval(fallbackPoll, currentTab === 7 ? 600 : 1500);
    return () => clearInterval(interval);
  }, [currentTab]);

  // Get Bluetooth
  useEffect(() => {
    let inflightBluetooth = false;
    const fetchBluetooth = async () => {
      if (inflightBluetooth) return;
      if (window.electronAPI?.getBluetoothStatus) {
        inflightBluetooth = true;
        try {
          const result = await window.electronAPI.getBluetoothStatus();
          if (typeof result === 'boolean') {
            setBluetooth({ connected: result, devices: [] });
          } else {
            setBluetooth(result || { connected: false, devices: [] });
          }
        } catch (e) {
          console.error(e);
        } finally {
          inflightBluetooth = false;
        }
      }
    };

    fetchBluetooth();
    const interval = setInterval(fetchBluetooth, 8000); // Check every 8 seconds
    return () => clearInterval(interval);
  }, []);

  const prevBluetoothConnected = useRef(null);
  useEffect(() => {
    const wasConnected = prevBluetoothConnected.current;
    const isConnected = bluetooth.connected === true;
    prevBluetoothConnected.current = isConnected;

    // Only show alert on a genuine false → true transition (device just connected),
    // not on initial load or when the device was already connected before.
    if (isConnected && wasConnected === false) {
      setMode("quick");
      setBluetoothAlert(true);
      const timerId = setTimeout(() => {
        setMode("still");
        setBluetoothAlert(false);
      }, 3000);
      return () => {
        clearTimeout(timerId);
      };
    }
  }, [bluetooth.connected]);

  // Get Camera Status
  useEffect(() => {
    let inflightCamera = false;
    const fetchCamera = async () => {
      if (inflightCamera) return;
      if (window.electronAPI?.getCameraStatus) {
        inflightCamera = true;
        try {
          const inUse = await window.electronAPI.getCameraStatus();
          setCameraInUse(inUse);
        } catch (e) {
          console.error(e);
        } finally {
          inflightCamera = false;
        }
      }
    };

    fetchCamera();
    const interval = setInterval(fetchCamera, 4500); // Check every 4.5 seconds
    return () => clearInterval(interval);
  }, []);

  // Get Microphone Status
  useEffect(() => {
    let inflightMicrophone = false;
    const fetchMicrophone = async () => {
      if (inflightMicrophone) return;
      if (window.electronAPI?.getMicrophoneStatus) {
        inflightMicrophone = true;
        try {
          const inUse = await window.electronAPI.getMicrophoneStatus();
          setMicrophoneInUse(inUse);
        } catch (e) {
          console.error(e);
        } finally {
          inflightMicrophone = false;
        }
      }
    };

    fetchMicrophone();
    const interval = setInterval(fetchMicrophone, 4500); // Check every 4.5 seconds
    return () => clearInterval(interval);
  }, []);

  // Get System Metrics (CPU, RAM) - Only active when System Metrics tab (Tab 8) is visible
  useEffect(() => {
    if (mode !== 'large' || currentTab !== 6) return; // Stats tab is ID 6
    const fetchMetrics = async () => {
      if (window.electronAPI?.getSystemMetrics) {
        try {
          const stats = await window.electronAPI.getSystemMetrics();
          setSystemStats(stats);
        } catch (e) {
          console.error(e);
        }
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, [mode, currentTab]);

  // Key Lock Alert Listener (NumLock only, CapsLock completely disabled)
  useEffect(() => {
    if (!window.electronAPI?.onKeyLockChange) return;
    const cleanup = window.electronAPI.onKeyLockChange((data) => {
      if (!data || data.key === 'CapsLock') return;
      setKeyLockAlert(data);
      triggerHudToast({
        type: 'caps',
        title: 'Num Lock',
        state: data.state ? 'On' : 'Off',
        icon: '#'
      });
      clearTimeout(keyLockAlertTimeout.current);
      keyLockAlertTimeout.current = setTimeout(() => {
        setKeyLockAlert(null);
      }, 2000);
    });
    return () => {
      cleanup?.();
      clearTimeout(keyLockAlertTimeout.current);
    };
  }, [triggerHudToast]);

  // USB Device Alert Listener (push events from main process)
  useEffect(() => {
    if (!window.electronAPI?.onUSBChange) return;
    const cleanup = window.electronAPI.onUSBChange((data) => {
      setUSBAlert(data);
      setMode("quick");
      clearTimeout(usbAlertTimeout.current);
      usbAlertTimeout.current = setTimeout(() => {
        setUSBAlert(null);
        if (!isHovered) {
          if (standbyBorderEnabled) setMode("quick");
          else if (largeStandbyEnabled) setMode("large");
          else setMode("still");
        }
      }, 3000);
    });
    return () => {
      cleanup?.();
      clearTimeout(usbAlertTimeout.current);
    };
  }, [isHovered, standbyBorderEnabled, largeStandbyEnabled]);

  // Notification Center Polling & Smart Notification Actions
  useEffect(() => {
    if (window.electronAPI?.platform !== 'win32') return;
    let isFirstFetch = true;

    const handleSnapshot = (snapshot) => {
      if (!snapshot) return;
      setNotificationSnapshot(snapshot);
      const activeList = snapshot.active || [];
      const mapped = activeList.map(n => ({
        id: n.id || n.sourceNotificationId,
        sourceNotificationId: n.sourceNotificationId,
        appName: n.applicationName || '',
        appId: n.applicationId || '',
        title: n.title || '',
        body: n.body || '',
        timestamp: n.receivedAt ? new Date(n.receivedAt).toISOString() : '',
        icon: n.applicationIcon || '',
        priority: n.priority,
        isCall: n.isCall,
        callType: n.callType,
        capabilities: n.capabilities || []
      }));
      setNotificationsList(mapped);

      // Handle incoming voice or video call
      if (snapshot.incomingCall) {
        const callAlert = {
          id: snapshot.incomingCall.id,
          appName: snapshot.incomingCall.applicationName,
          appId: snapshot.incomingCall.applicationId,
          title: snapshot.incomingCall.title,
          body: snapshot.incomingCall.body,
          icon: snapshot.incomingCall.applicationIcon,
          isCall: true,
          callType: snapshot.incomingCall.callType
        };
        setNotificationAlert(callAlert);
        setMode("quick");
        window.electronAPI?.invalidateWindow?.();
        return;
      }

      // Check for new notifications
      if (isFirstFetch) {
        activeList.forEach(n => { if (n.id) seenNotificationIds.current.add(n.id); });
        isFirstFetch = false;
      } else {
        const newNotifs = activeList.filter(n => n.id && !seenNotificationIds.current.has(n.id));
        activeList.forEach(n => { if (n.id) seenNotificationIds.current.add(n.id); });
        if (newNotifs.length > 0) {
          const latest = newNotifs[newNotifs.length - 1];
          setNotificationAlert({
            id: latest.id,
            sourceNotificationId: latest.sourceNotificationId,
            appName: latest.applicationName,
            appId: latest.applicationId,
            title: latest.title,
            body: latest.body,
            icon: latest.applicationIcon,
            priority: latest.priority,
            isCall: latest.isCall,
            callType: latest.callType
          });
          setMode("quick");
          window.electronAPI?.invalidateWindow?.();
          clearTimeout(notificationAlertTimeout.current);
          notificationAlertTimeout.current = setTimeout(() => {
            setNotificationAlert(null);
            setMode("still");
            window.electronAPI?.invalidateWindow?.();
          }, 4500);
        }
      }
    };

    // Subscribe to push updates
    let unsub = null;
    if (window.electronAPI?.notifications?.onUpdate) {
      unsub = window.electronAPI.notifications.onUpdate(handleSnapshot);
    }

    const fetchNotifications = async () => {
      try {
        if (window.electronAPI?.notifications?.syncNow) {
          const snap = await window.electronAPI.notifications.syncNow();
          handleSnapshot(snap);
        } else if (window.electronAPI?.getNotifications) {
          await window.electronAPI.getNotifications();
        }
      } catch (e) {
        console.error("Failed to fetch notifications:", e);
      }
    };

    const initialDelay = setTimeout(() => {
      fetchNotifications();
    }, 1500);

    const interval = setInterval(fetchNotifications, 5000);

    return () => {
      if (typeof unsub === "function") unsub();
      clearTimeout(initialDelay);
      clearInterval(interval);
      clearTimeout(notificationAlertTimeout.current);
    };
  }, []);

  // Smart Notification Action Handlers
  const handleExecuteAction = useCallback(async (notificationId, actionType, params = {}) => {
    if (!notificationId) return;
    setActionStatuses(prev => ({
      ...prev,
      [notificationId]: { status: 'pending', message: 'Processing…' }
    }));

    try {
      let res = null;
      if (window.electronAPI?.notifications?.executeAction) {
        res = await window.electronAPI.notifications.executeAction(notificationId, actionType, params);
      } else if (actionType === 'dismiss' && window.electronAPI?.dismissNotification) {
        const ok = await window.electronAPI.dismissNotification(notificationId);
        res = { success: ok, actionType };
      } else if (actionType === 'open' && window.electronAPI?.focusNotificationApp) {
        const ok = await window.electronAPI.focusNotificationApp(params.appId || '', params.appName || '');
        res = { success: ok, actionType };
      }

      const isSuccess = Boolean(res?.success);
      setActionStatuses(prev => ({
        ...prev,
        [notificationId]: {
          status: isSuccess ? 'success' : 'failed',
          message: res?.message || (isSuccess ? 'Done' : 'Action failed')
        }
      }));

      if (actionType === 'dismiss' && isSuccess) {
        setUndoToast({
          visible: true,
          message: "Notification dismissed",
          targetId: notificationId
        });
        setTimeout(() => setUndoToast(null), 5000);
      }

      setTimeout(() => {
        setActionStatuses(prev => {
          const next = { ...prev };
          delete next[notificationId];
          return next;
        });
      }, 3500);
    } catch (err) {
      setActionStatuses(prev => ({
        ...prev,
        [notificationId]: { status: 'failed', message: err.message || 'Action failed' }
      }));
    }
  }, []);

  const handleSnooze = useCallback(async (notificationId, minutes) => {
    if (!window.electronAPI?.notifications?.snooze) return;
    setSnoozeMenuOpenId(null);
    await window.electronAPI.notifications.snooze(notificationId, minutes * 60000);
  }, []);

  const handleCancelSnooze = useCallback(async (notificationId) => {
    if (!window.electronAPI?.notifications?.cancelSnooze) return;
    await window.electronAPI.notifications.cancelSnooze(notificationId);
  }, []);

  const handleUndoDismiss = useCallback(async () => {
    if (!window.electronAPI?.notifications?.undoDismiss) return;
    const targetId = undoToast?.targetId;
    await window.electronAPI.notifications.undoDismiss(targetId);
    setUndoToast(null);
  }, [undoToast]);

  const handleSendReply = useCallback(async (notificationId) => {
    const text = replyInputs[notificationId]?.trim();
    if (!text) return;
    await handleExecuteAction(notificationId, 'reply', { text });
    setReplyInputs(prev => ({ ...prev, [notificationId]: '' }));
  }, [replyInputs, handleExecuteAction]);

  const handleTogglePrivacy = useCallback(async () => {
    const nextVal = !notificationSnapshot?.settings?.hidePreviews;
    if (window.electronAPI?.notifications?.setHidePreviews) {
      await window.electronAPI.notifications.setHidePreviews(nextVal);
    }
  }, [notificationSnapshot]);

  const handleClearAll = useCallback(async () => {
    setNotificationSnapshot(prev => ({
      ...prev,
      active: [],
      standalone: [],
      groups: [],
      stats: {
        ...prev.stats,
        totalActive: 0,
        unreviewedCount: 0
      }
    }));
    if (window.electronAPI?.notifications?.clearAll) {
      await window.electronAPI.notifications.clearAll();
      setUndoToast({
        visible: true,
        message: "All notifications dismissed",
      });
      setTimeout(() => setUndoToast(null), 5000);
    }
  }, []);

  const handleDismissGroup = useCallback(async (groupId) => {
    if (window.electronAPI?.notifications?.dismissGroup) {
      await window.electronAPI.notifications.dismissGroup(groupId);
    }
  }, []);


  useEffect(() => {
    const processCaptureQueue = () => {
      if (captureAlertTimer.current || captureAlertQueue.current.length === 0) return;
      const nextAlert = captureAlertQueue.current.shift();
      if (!nextAlert) return;

      setMode("quick");
      if (nextAlert === "camera") {
        setCameraAlert(true);
      } else {
        setMicrophoneAlert(true);
      }

      captureAlertTimer.current = setTimeout(() => {
        if (nextAlert === "camera") {
          setCameraAlert(false);
        } else {
          setMicrophoneAlert(false);
        }
        captureAlertTimer.current = null;
        if (captureAlertQueue.current.length > 0) {
          processCaptureQueue();
        } else {
          setMode("still");
        }
      }, 3000);
    };

    if (privacyDotsEnabled && cameraInUse && !captureAlertDisplayed.current.camera) {
      captureAlertQueue.current.push("camera");
      captureAlertDisplayed.current.camera = true;
    }
    if (!cameraInUse || !privacyDotsEnabled) {
      captureAlertDisplayed.current.camera = false;
    }

    if (privacyDotsEnabled && microphoneInUse && !captureAlertDisplayed.current.microphone) {
      captureAlertQueue.current.push("microphone");
      captureAlertDisplayed.current.microphone = true;
    }
    if (!microphoneInUse || !privacyDotsEnabled) {
      captureAlertDisplayed.current.microphone = false;
    }

    captureAlertQueue.current = captureAlertQueue.current.filter((item) => {
      if (item === "camera" && (!cameraInUse || !privacyDotsEnabled)) return false;
      if (item === "microphone" && (!microphoneInUse || !privacyDotsEnabled)) return false;
      return true;
    });

    processCaptureQueue();

    return () => {
      if ((!cameraInUse && !microphoneInUse) || !privacyDotsEnabled) {
        if (captureAlertTimer.current) {
          clearTimeout(captureAlertTimer.current);
          captureAlertTimer.current = null;
        }
        captureAlertQueue.current = [];
      }
    };
  }, [cameraInUse, microphoneInUse, privacyDotsEnabled]);

  // Mouse Safety & Renderer Error Logging Effect
  useEffect(() => {
    const handleGlobalError = (event) => {
      if (window.electronAPI?.logMessage) {
        window.electronAPI.logMessage('error', 'Unhandled Renderer Exception', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          error: event.error?.stack || String(event.error)
        });
      }
    };

    const handleUnhandledRejection = (event) => {
      if (window.electronAPI?.logMessage) {
        window.electronAPI.logMessage('error', 'Unhandled Renderer Rejection', {
          reason: event.reason?.stack || String(event.reason)
        });
      }
    };

    // Safety mouse position & modifier tracker:
    // Tracks whether mouse is inside island rect and whether Ctrl/Cmd is held
    let lastMoveTime = 0;
    const handleMouseMove = (e) => {
      const now = Date.now();
      if (now - lastMoveTime < 30) return;
      lastMoveTime = now;
      const islandElem = document.getElementById("Island");
      if (!islandElem) return;
      const rect = islandElem.getBoundingClientRect();
      const padding = 15;
      const isInside = (
        e.clientX >= rect.left - padding &&
        e.clientX <= rect.right + padding &&
        e.clientY >= rect.top - padding &&
        e.clientY <= rect.bottom + padding
      );

      const isCtrl = !!(e.ctrlKey || e.metaKey);

      if (isInside) {
        if (isCtrl) {
          if (!ctrlHeldRef.current) {
            setCtrlState(true);
          }
          updateMouseIgnore(true, true);
        } else {
          if (ctrlHeldRef.current) {
            setCtrlState(false);
          }
          if (isHoveredRef.current) {
            updateMouseIgnore(false, true);
          }
        }
      } else {
        if (ctrlHeldRef.current) {
          setCtrlState(false);
        }
        if (!isDraggingRef.current) {
          updateMouseIgnore(true, true);
        }
      }
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const [mediaPosition, setMediaPosition] = useState(0);
  const lastMediaActionRef = useRef(0);
  const lastTrackNameRef = useRef("");

  // Sync position from spotifyTrack when track info updates from backend
  useEffect(() => {
    if (!spotifyTrack) return;
    const trackChanged = spotifyTrack.name !== lastTrackNameRef.current;
    if (trackChanged) {
      lastTrackNameRef.current = spotifyTrack.name || "";
      setMediaPosition(Number(spotifyTrack.position) || 0);
    } else if (typeof spotifyTrack.position === "number" && spotifyTrack.position > 0) {
      setMediaPosition(prev => {
        if (Math.abs(prev - spotifyTrack.position) > 3) {
          return spotifyTrack.position;
        }
        return prev;
      });
    }
  }, [spotifyTrack?.name, spotifyTrack?.artist, spotifyTrack?.position]);

  // Continuously advance position every 500ms when playing
  useEffect(() => {
    if (spotifyTrack?.state !== 'playing') return;
    const timer = setInterval(() => {
      setMediaPosition(prev => {
        const dur = (spotifyTrack?.duration && spotifyTrack.duration > 0) ? spotifyTrack.duration : 210;
        return (dur > 0 && prev >= dur) ? 0 : prev + 0.5;
      });
    }, 500);
    return () => clearInterval(timer);
  }, [spotifyTrack?.state, spotifyTrack?.duration]);

  // Now Playing
  useEffect(() => {
    let inflightMedia = false;
    const fetchMedia = async () => {
      if (inflightMedia) return;
      if (window.electronAPI?.getSystemMedia) {
        inflightMedia = true;
        try {
          const track = await window.electronAPI.getSystemMedia();
          if (track && track.artwork_url && track.artwork_url.length > 512 * 1024) {
            // Cap oversized base64 artwork to prevent large state allocations
            track.artwork_url = null;
          }
          if (track) {
            // If user recently clicked play/pause (within 2.5s), preserve optimistic play/pause state
            if (Date.now() - lastMediaActionRef.current < 2500) {
              setSpotifyTrack(prev => prev ? { ...track, state: prev.state } : track);
            } else {
              setSpotifyTrack(track);
            }
          } else {
            setSpotifyTrack(null);
          }
        } catch (e) {
          console.error(e);
        } finally {
          inflightMedia = false;
        }
      }
    };

    fetchMedia();
    const interval = setInterval(fetchMedia, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => localStorage.setItem("tasks", JSON.stringify(tasks)), [tasks]);

  function copyToClipboard(text) {
    if (!text) return;
    if (window.electronAPI?.writeClipboardText) {
      return window.electronAPI.writeClipboardText(text);
    } else if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text);
    }
  }

  function addTask() {
    if (taskText.trim()) {
      setTasks((prev) => [...prev, taskText.trim()]);
      setTaskText("");
    }
  }

  function removeTask(index) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  // Keyboard Shortcuts and Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (recordingTabId !== null) return;
      if (e.key === "Escape") {
        if (hoverIntentTimer.current) {
          clearTimeout(hoverIntentTimer.current);
          hoverIntentTimer.current = null;
        }
        if (mouseLeaveTimer.current) {
          clearTimeout(mouseLeaveTimer.current);
          mouseLeaveTimer.current = null;
        }
        const activeTag = document.activeElement?.tagName;
        if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
          document.activeElement.blur();
        }
        setHoverState(false);
        setMode("still");
        updateMouseIgnore(true, true);
        return;
      }
      if (e.key === "ArrowRight") {
        moveTab(1);
      } else if (e.key === "ArrowLeft") {
        moveTab(-1);
      } else if (!e.ctrlKey && !e.metaKey && (() => {
        const minimalShortcut = (tabShortcuts && tabShortcuts["minimal-notch"]) || "Alt+Shift+M";
        const minParts = minimalShortcut.toUpperCase().split("+");
        const minKey = minParts[minParts.length - 1];
        const minHasAlt = minParts.includes("ALT");
        const minHasShift = minParts.includes("SHIFT");
        return (
          Boolean(e.altKey) === minHasAlt &&
          Boolean(e.shiftKey) === minHasShift &&
          e.key &&
          e.key.toUpperCase() === minKey
        );
      })()) {
        e.preventDefault();
        handleToggleMinimalNotchForce();
        return;
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && e.key && e.key !== "Alt" && e.key !== "Shift") {
        const keyChar = e.key.toUpperCase();
        const combo = `Alt+${keyChar}`;
        for (const [idStr, shortcut] of Object.entries(tabShortcuts)) {
          if (shortcut && shortcut.toUpperCase() === combo) {
            e.preventDefault();
            const targetId = parseInt(idStr, 10);
            setMode("large");
            setTabState([targetId, targetId > currentTabId ? 1 : -1]);
            break;
          }
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [moveTab, visibleTabs, currentTabId, tabShortcuts, recordingTabId, updateMouseIgnore, setHoverState, handleToggleMinimalNotchForce]);

  // Smart auto-collapse on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      const islandEl = document.getElementById("Island");
      if (islandEl && !islandEl.contains(e.target)) {
        if (hoverIntentTimer.current) {
          clearTimeout(hoverIntentTimer.current);
          hoverIntentTimer.current = null;
        }
        if (mouseLeaveTimer.current) {
          clearTimeout(mouseLeaveTimer.current);
          mouseLeaveTimer.current = null;
        }
        const activeTag = document.activeElement?.tagName;
        if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
          document.activeElement.blur();
        }
        setHoverState(false);
        setMode("still");
        updateMouseIgnore(true, true);
      }
    };
    window.addEventListener("pointerdown", handleOutsideClick);
    return () => {
      window.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [updateMouseIgnore, setHoverState]);

  // Ctrl+Hover Click-Through keyboard listeners
  useEffect(() => {
    const handleCtrlDown = (e) => {
      if ((e.key === 'Control' || e.key === 'Meta') && isHoveredRef.current) {
        setCtrlState(true);
        updateMouseIgnore(true, true);
      }
    };
    const handleCtrlUp = (e) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setCtrlState(false);
        if (isHoveredRef.current) {
          updateMouseIgnore(false, true);
        } else {
          updateMouseIgnore(true, true);
        }
      }
    };
    const handleBlur = () => {
      // Window lost focus while Ctrl+Hover was active — restore state
      if (ctrlHeldRef.current) {
        setCtrlState(false);
        if (!isHoveredRef.current) {
          updateMouseIgnore(true, true);
        }
      }
    };
    document.addEventListener('keydown', handleCtrlDown);
    document.addEventListener('keyup', handleCtrlUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('keydown', handleCtrlDown);
      document.removeEventListener('keyup', handleCtrlUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [updateMouseIgnore, setCtrlState]);

  // Ctrl+Hover safety timeout
  useEffect(() => {
    if (!ctrlHeld) return;
    const maxHold = setTimeout(() => {
      setCtrlState(false);
      if (isHoveredRef.current) {
        updateMouseIgnore(false, true);
      } else {
        updateMouseIgnore(true, true);
      }
    }, 5000);
    return () => clearTimeout(maxHold);
  }, [ctrlHeld, updateMouseIgnore, setCtrlState]);

  useEffect(() => {
    const handleFocusOut = () => {
      // Reset album hover state when window loses focus
      setAlbumHovered(false);
      setAlbumRotation({ x: 0, y: 0 });

      setTimeout(() => {
        if (!isHovered) {
          const activeTag = document.activeElement?.tagName;
          if (activeTag !== "INPUT" && activeTag !== "TEXTAREA" && activeTag !== "SELECT") {
            if (standbyBorderEnabled) {
              setMode("quick");
            } else if (largeStandbyEnabled) {
              setMode("large");
            } else {
              setMode("still");
            }
          }
        }
      }, 100);
    };

    window.addEventListener("focusout", handleFocusOut);
    return () => window.removeEventListener("focusout", handleFocusOut);
  }, [isHovered, standbyBorderEnabled, largeStandbyEnabled]);

  useEffect(() => {
    if (!isDragging && !isHovered) {
      const activeTag = document.activeElement?.tagName;
      if (activeTag !== "INPUT" && activeTag !== "TEXTAREA") {
        if (standbyBorderEnabled) {
          setMode("quick");
        } else if (largeStandbyEnabled) {
          setMode("large");
        } else {
          setMode("still");
        }
      }
    }
  }, [isDragging, isHovered, standbyBorderEnabled, largeStandbyEnabled]);

  const handleDragEndChecks = (e) => {
    updateDragging(false);
    suppressClick.current = false;
  };

  const isFree = positionMode === "free";
  const sideStyles = useMemo(() => {
    switch (positionMode) {
      case 'top-left': return { left: '15px', top: '0px', x: '0%' };
      case 'top-right': return { left: 'calc(100% - 15px)', top: '0px', x: '-100%' };
      case 'bottom-left': return { left: '15px', top: 'auto', bottom: '45px', x: '0%' };
      case 'bottom-right': return { left: 'calc(100% - 15px)', top: 'auto', bottom: '45px', x: '-100%' };
      case 'top-center': return { left: '50%', top: '0px', x: '-50%' };
      case 'bottom-center': return { left: '50%', top: 'auto', bottom: '45px', x: '-50%' };
      default: return { left: `${islandX}%`, top: '0px', x: '-50%' };
    }
  }, [positionMode, islandX]);

  const isAtTop = theme !== 'win95';
  const islandBorderStroke = theme === "win95"
    ? "none"
    : islandBorderEnabled
      ? ((privacyDotsEnabled && cameraInUse)
          ? "rgba(255, 215, 0, 0.8)"
          : (privacyDotsEnabled && microphoneInUse)
            ? "rgba(255, 154, 0, 0.8)"
            : (charging || chargingAlert)
              ? "rgba(111, 255, 123, 0.5)"
              : (percent <= 20 || alert)
                ? "rgba(255, 63, 63, 0.5)"
                : bluetoothAlert
                  ? "rgba(0, 150, 255, 0.34)"
                  : hideNotActiveIslandEnabled
                    ? "none"
                    : `color-mix(in srgb, ${textColor}, transparent 70%)`)
      : "none";

  return (
    <motion.div
      id="Island"
      className="notch-shell"
      onMouseEnter={(e) => {
        if (mouseLeaveTimer.current) {
          clearTimeout(mouseLeaveTimer.current);
          mouseLeaveTimer.current = null;
        }
        setHoverState(true);
        const isCtrl = !!(e?.ctrlKey || e?.metaKey || ctrlHeldRef.current);
        if (isCtrl) {
          setCtrlState(true);
          updateMouseIgnore(true, true);
        } else {
          setCtrlState(false);
          updateMouseIgnore(false, true);

          // If a temporary notification alert is currently active, keep banner visible
          if (notificationAlert) {
            if (notificationAlertTimeout.current) {
              clearTimeout(notificationAlertTimeout.current);
              notificationAlertTimeout.current = null;
            }
            return;
          }

          // Immediately expand on hover without intermediate blank delay state
          if (hoverIntentTimer.current) {
            clearTimeout(hoverIntentTimer.current);
            hoverIntentTimer.current = null;
          }
          setMode("large");
        }
      }}
      onMouseMove={(e) => {
        if (e.buttons === 0) {
          if (isDragOverShelf) setIsDragOverShelf(false);
          isOutboundDragging.current = false;
        }
        const isCtrl = !!(e?.ctrlKey || e?.metaKey);
        if (isCtrl && !ctrlHeldRef.current) {
          setCtrlState(true);
          updateMouseIgnore(true, true);
        } else if (!isCtrl && ctrlHeldRef.current) {
          setCtrlState(false);
          updateMouseIgnore(false, true);
        }
      }}
      onMouseLeave={(e) => {
        if (e.buttons === 0) {
          setIsDragOverShelf(false);
          isOutboundDragging.current = false;
        }
        suppressClick.current = false;
        if (ctrlHeldRef.current) {
          setCtrlState(false);
        }
        if (isDraggingRef.current) return;

        // Cancel pending hover intent if mouse leaves before delay
        if (hoverIntentTimer.current) {
          clearTimeout(hoverIntentTimer.current);
          hoverIntentTimer.current = null;
        }

        if (mouseLeaveTimer.current) clearTimeout(mouseLeaveTimer.current);
        mouseLeaveTimer.current = setTimeout(() => {
          mouseLeaveTimer.current = null;

          const activeTag = document.activeElement?.tagName;
          if (activeTag === "INPUT" || activeTag === "TEXTAREA" || isDragOverShelf) return;

          setHoverState(false);
          updateMouseIgnore(true, true);

          // If a notification alert is still active, resume the auto-dismiss countdown
          if (notificationAlert) {
            if (notificationAlertTimeout.current) clearTimeout(notificationAlertTimeout.current);
            notificationAlertTimeout.current = setTimeout(() => {
              setNotificationAlert(null);
              if (standbyBorderEnabled) {
                setMode("quick");
              } else if (largeStandbyEnabled) {
                setMode("large");
              } else {
                setMode("still");
              }
            }, 2000);
            return;
          }

          if (standbyBorderEnabled) {
            setMode("quick");
          } else if (largeStandbyEnabled) {
            setMode("large");
          } else {
            setMode("still");
          }
        }, 150);
      }}
      onClick={(e) => {
        if (ctrlHeldRef.current || e?.ctrlKey || e?.metaKey) {
          return;
        }
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        if (isInteractiveTarget(e.target)) return;

        // If a notification alert is showing, clicking the island outside interactive buttons shouldn't toggle mode
        if (notificationAlert) return;

        const activeTag = document.activeElement?.tagName;
        if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") {
          document.activeElement.blur();
        }

        // Direct click triggers immediate expand without waiting for hover delay
        if (hoverIntentTimer.current) {
          clearTimeout(hoverIntentTimer.current);
          hoverIntentTimer.current = null;
        }

        setMode(prev => prev === "large" ? "still" : "large");
        updateMouseIgnore(false, true);
      }}
      onWheel={handleWheelSwipe}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      initial={{
        x: sideStyles.x,
        left: sideStyles.left,
        top: sideStyles.top || '0px',
        bottom: sideStyles.bottom || 'auto',
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 22,
        borderBottomRightRadius: 22,
      }}
      animate={{
        width: `${width}px`,
        height: `${height}px`,
        left: sideStyles.left,
        top: sideStyles.top || '0px',
        bottom: sideStyles.bottom || 'auto',
        backgroundColor: bgColor || "#000000",
        color: textColor || "#FFFFFF",
        opacity: (ctrlHeld && isHovered) ? 0.15 : 1,
        x: sideStyles.x,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: cornerRadius,
        borderBottomRightRadius: cornerRadius,
        boxShadow: (mode === "large" || isHudActive)
          ? "inset 0 -12px 24px -10px rgba(100, 130, 255, 0.18), inset 0 -1px 0 rgba(255, 255, 255, 0.12), 0 8px 24px rgba(0, 0, 0, 0.6)"
          : "inset 0 -1px 0 rgba(255, 255, 255, 0.08), 0 8px 24px rgba(0, 0, 0, 0.6)",
      }}
      onAnimationStart={() => {
        setIsTransitioning(true);
      }}
      onAnimationComplete={() => {
        setIsTransitioning(false);
      }}
      transition={{
        width: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
        height: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
        borderBottomLeftRadius: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
        borderBottomRightRadius: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
        boxShadow: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
        x: { duration: 0.15 }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        backgroundImage: `url('${bgImage}')`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
        justifyContent: "center",
        overflow: "visible",
        fontFamily: theme === "win95" ? "w95" : "OpenRunde",
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        border: theme === "win95" ? "2px solid rgb(254, 254, 254)" : islandBorderEnabled ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
        borderTop: "none",
        borderColor:
          theme === "win95"
            ? "#FFFFFF #808080 #808080 #FFFFFF"
            : undefined,
        '--island-text-color': textColor,
        '--island-bg-color': bgColor,
        position: 'fixed',
        margin: 0,
        pointerEvents: isTransitioning ? 'auto' : (ctrlHeld && isHovered) ? 'none' : (mode === 'still' && !isHovered && (!showInfoWhenIdleEnabled || hideNotActiveIslandEnabled)) ? 'none' : 'auto'
      }}
    >

      {/* Depleting Orange Border Stroke & Synchronized Glow for Active Timer */}
      {(isTimerRunning || timerSeconds > 0) && (() => {
        const progress = timerTotalDuration > 0 ? Math.min(1, Math.max(0, timerSeconds / timerTotalDuration)) : 0;
        const cornerRadius = mode === 'large' ? 32 : 20;

        return (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              borderRadius: 'inherit',
              zIndex: 999,
              overflow: 'visible'
            }}
          >
            {/* Dim Track Stroke */}
            <rect
              x="1.5"
              y="1.5"
              width="calc(100% - 3px)"
              height="calc(100% - 3px)"
              rx={cornerRadius}
              fill="none"
              stroke="rgba(255, 149, 0, 0.15)"
              strokeWidth="2.5"
            />
            {/* Active Depleting Orange Stroke with Synchronized Local Glow */}
            <motion.rect
              x="1.5"
              y="1.5"
              width="calc(100% - 3px)"
              height="calc(100% - 3px)"
              rx={cornerRadius}
              fill="none"
              stroke="#ff9500"
              strokeWidth="2.5"
              pathLength={1}
              strokeDasharray="1 1"
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: 1 - progress }}
              transition={{ duration: 0.4, ease: "linear" }}
              style={{
                filter: `drop-shadow(0px 0px ${Math.max(2, Math.round(progress * 6))}px #ff9500) drop-shadow(0px 0px ${Math.max(4, Math.round(progress * 12))}px rgba(255, 149, 0, ${0.4 + progress * 0.4}))`
              }}
            />
          </svg>
        );
      })()}

      {/* Strict App Boundary Container — strictly clips all tabs, quickviews, and transitions within the pill */}
      <div
        id="island-boundary-container"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          borderRadius: 'inherit',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: (mode === "large" && currentTab === 3) ? "flex-start" : "center",
          pointerEvents: isTransitioning ? 'auto' : (ctrlHeld && isHovered) ? 'none' : (mode === 'still' && !isHovered && (!showInfoWhenIdleEnabled || hideNotActiveIslandEnabled)) ? 'none' : 'auto'
        }}
      >
        {/* Privacy Dots — persistent indicators for active camera/mic */}
        {privacyDotsEnabled && mode !== "large" && (cameraInUse || microphoneInUse) && (
          <div style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 998,
            display: 'flex',
            gap: 4,
            pointerEvents: 'none'
          }}>
            <AnimatePresence>
              {cameraInUse && (
                <motion.div
                  key="privacy-dot-camera"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#34c759',
                    boxShadow: '0 0 6px rgba(52, 199, 89, 0.7)'
                  }}
                />
              )}
              {microphoneInUse && (
                <motion.div
                  key="privacy-dot-mic"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#ff9500',
                    boxShadow: '0 0 6px rgba(255, 149, 0, 0.7)'
                  }}
                />
              )}
            </AnimatePresence>
          </div>
        )}

        {/* NON-LARGE SIZE STATES: Micro (96x5), HUD Toast (260x40), Normal Idle (128x26) */}
        {/* NON-LARGE SIZE STATES: Micro (96x5), HUD Toast (310x62), Mascot (140x32), Idle Clock (154x32) */}
        {mode !== "large" && !isCollapsing && (
          <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
            {isHudActive ? (() => {
              const toastTitle = activeHudToast?.title || notificationAlert?.title || notificationAlert?.appName || "System Alert";
              const toastSubtext = activeHudToast?.subtext || notificationAlert?.message || notificationAlert?.body || "";
              const toastType = activeHudToast?.type || (notificationAlert ? "notif" : "system");
              const isBluetoothToast = toastType === 'bluetooth' || toastTitle.toLowerCase().includes('buds') || toastTitle.toLowerCase().includes('headphone') || toastTitle.toLowerCase().includes('airbuds');
              const isChargingToast = toastType === 'battery' || toastTitle.toLowerCase().includes('charg') || activeHudToast?.state === 'Charging';
              const batteryPct = percent || 70;

              if (isBluetoothToast) {
                const devName = activeDevice?.name || toastTitle || "AirBuds Pro";
                const devSub = toastSubtext || `Connected • ${batteryPct}%`;
                return (
                  <div className="notch-stage notch-stage-toast optical-blur-in">
                    {/* Left: Glowing blue circular badge (#0ea5e9) with Bluetooth icon */}
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#0ea5e9',
                      boxShadow: '0 0 14px rgba(14, 165, 233, 0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      flexShrink: 0
                    }}>
                      <Headphones size={16} color="#ffffff" />
                    </div>

                    {/* Center: Bold white device name + grey subtitle */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '0 12px', lineHeight: 1.2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {devName}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {devSub}
                      </span>
                    </div>

                    {/* Right: Headphone icon inside a dark circle surrounded by 2 animated concentric pulsing blue ripple rings */}
                    <div className="ripple-circle-wrap">
                      <div className="ripple-ring ripple-ring-1" />
                      <div className="ripple-ring ripple-ring-2" />
                      <div style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2
                      }}>
                        <Headphones size={15} color="#0ea5e9" />
                      </div>
                    </div>
                  </div>
                );
              }

              if (isChargingToast) {
                const circ = 2 * Math.PI * 13;
                const offset = circ * (1 - batteryPct / 100);
                return (
                  <div className="notch-stage notch-stage-toast optical-blur-in">
                    {/* Left: Green lightning bolt inside an SVG circular progress ring (#22c55e) */}
                    <div style={{ position: 'relative', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width={34} height={34} style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx={17} cy={17} r={13} fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth={2.8} />
                        <circle
                          cx={17}
                          cy={17}
                          r={13}
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth={2.8}
                          strokeDasharray={circ}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 400ms ease' }}
                        />
                      </svg>
                      <div style={{ position: 'absolute' }}>
                        <Zap size={15} color="#22c55e" />
                      </div>
                    </div>

                    {/* Center: Bold white Charging + grey subtitle Charger connected */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '0 12px', lineHeight: 1.2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>Charging</span>
                      <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.6)' }}>Charger connected</span>
                    </div>

                    {/* Right: Large crisp percentage readout (70%, 22px light/regular white) */}
                    <div style={{ flexShrink: 0, paddingRight: 4 }}>
                      <span style={{ fontSize: 22, fontWeight: 400, color: '#ffffff', letterSpacing: '-0.5px' }}>
                        {batteryPct}%
                      </span>
                    </div>
                  </div>
                );
              }

              // General Toast / Caps Lock / App Notifications
              return (
                <div 
                  className="notch-stage notch-stage-toast optical-blur-in"
                  style={{ cursor: notificationAlert ? 'pointer' : 'default' }}
                  onClick={(e) => {
                    if (notificationAlert) {
                      e.stopPropagation();
                      const aId = notificationAlert.applicationId || notificationAlert.appId || '';
                      const aName = notificationAlert.applicationName || notificationAlert.appName || notificationAlert.title || '';
                      if (window.electronAPI?.focusNotificationApp) {
                        window.electronAPI.focusNotificationApp(aId, aName);
                      }
                      setNotificationAlert(null);
                      setMode("still");
                    }
                  }}
                >
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0
                  }}>
                    {toastType === 'caps' ? (
                      <ArrowUp size={16} color="#38bdf8" />
                    ) : (
                      <Bell size={16} color="#a855f7" />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '0 12px', lineHeight: 1.2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {toastTitle}
                    </span>
                    {toastSubtext && (
                      <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {toastSubtext}
                      </span>
                    )}
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    {activeHudToast?.state ? (
                      <div style={{
                        padding: '2px 8px',
                        borderRadius: 8,
                        fontSize: 10,
                        fontWeight: 700,
                        background: activeHudToast.state === 'On' ? 'rgba(56, 189, 248, 0.22)' : 'rgba(255, 255, 255, 0.12)',
                        color: activeHudToast.state === 'On' ? '#38bdf8' : 'rgba(255, 255, 255, 0.7)',
                        border: activeHudToast.state === 'On' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        {activeHudToast.state}
                      </div>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#38bdf8' }}>Active</span>
                    )}
                  </div>
                </div>
              );
            })() : isMicroMode ? (
              /* Micro-Strip State (96x5) */
              <div
                className="notch-stage notch-stage-micro optical-blur-in"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleMinimalNotchForce();
                }}
                style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Click to expand notch (or toggle with shortcut)"
              >
                <div style={{ width: 48, height: 2, borderRadius: 1, background: 'rgba(255, 255, 255, 0.4)' }} />
              </div>
            ) : isIdleMascot ? (
              /* Mascot Idle Mode (140x32): Glowing White Pill Eyes + Purple-Blue Glow */
              <div className="notch-stage notch-stage-idle-mascot optical-blur-in">
                <MascotEyes mood={activeMascotMood} isPlaying={isPlaying} charging={charging} percent={percent} />
              </div>
            ) : (
              /* Default Idle Clock (154x32): Animated Green Ring — Bold Time — 5-Bar Waveform */
              <div className="notch-stage notch-stage-idle-clock optical-blur-in">
                {/* Left: Animated Green Ring (14px) */}
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  {isTimerRunning || pomodoroState.isRunning ? (
                    <MiniProgressRing
                      progress={pomodoroState.isRunning ? pomodoroState.secondsLeft / pomodoroState.totalSeconds : (timerTotalDuration > 0 ? timerSeconds / timerTotalDuration : 1)}
                      color="#ef4444"
                      size={14}
                      strokeWidth={2.2}
                    />
                  ) : isPlaying ? (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                  ) : (
                    <MiniProgressRing progress={percent ? percent / 100 : 0.8} color="#22c55e" size={14} strokeWidth={2.2} />
                  )}
                </div>

                {/* Center: 16:57 (bold 13px white) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '0 4px' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums' }}>
                    {pomodoroState.isRunning ? formatTimerMMSS(pomodoroState.secondsLeft) : time}
                  </span>
                </div>

                {/* Right: 5-Bar Live Equalizer Waveform */}
                <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <MiniWaveform isPlaying={isPlaying} />
                </div>
              </div>
            )}
          </div>
        )}

      <AnimatePresence custom={direction} initial={false}>
        {mode === "large" && (
          <motion.div
            key="large-mode-shell"
            custom={direction}
            variants={tabVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className={`notch-stage ${isLyricsWide ? "notch-stage-expanded-wide" : "notch-stage-expanded"}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "absolute",
              overflow: "hidden",
              borderRadius: "inherit",
              boxSizing: "border-box"
            }}
          >
            {/* Left & Right Edge Navigation Arrows (Reveal on Edge Hover) */}
            <EdgeNavigation
              onPrev={() => moveTab(-1)}
              onNext={() => moveTab(1)}
            />

            {/* Module Body Container (Full-Bleed 100% Height, Center-Aligned) */}
            <div style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: isLyricsWide ? '8px 16px' : '6px 18px',
              boxSizing: 'border-box'
            }}>
              <AnimatePresence custom={direction} initial={false} mode="wait">
                <motion.div
                  key={currentTab}
                  custom={direction}
                  initial={{ opacity: 0, x: direction > 0 ? 16 : -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -16 : 16 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                {/* Tab 3: Music & Synced Lyrics (Standard View + Synced Lyrics Split View) */}
                {currentTab === 3 && (() => {
                  const isCurrentlyPlaying = spotifyTrack?.state === 'playing';
                  const title = spotifyTrack?.name || "Midnight City";
                  const artist = spotifyTrack?.artist || "M83 • Hurry Up, We're Dreaming";
                  const artwork = spotifyTrack?.artwork_url;
                  const duration = spotifyTrack?.duration || 244;
                  const pos = mediaPosition || 64;
                  const remaining = Math.max(0, duration - pos);

                  const DEMO_LYRICS = [
                    { time: 0, text: "Waiting in a car" },
                    { time: 10, text: "Waiting for a ride in the dark" },
                    { time: 25, text: "The night city grows, look and see" },
                    { time: 45, text: "The city is my church, it wraps me in the blinding light" },
                    { time: 64, text: "Midnight city, the city is my church" },
                    { time: 90, text: "Waiting in a car, waiting for a ride in the dark" },
                    { time: 120, text: "The stars shine like a thousand eyes above us" },
                    { time: 160, text: "Looking at the skyline, we are unstoppable" }
                  ];

                  const activeLyrics = (syncedLyrics && syncedLyrics.length > 0) ? syncedLyrics : DEMO_LYRICS;
                  const currentLyricIdx = activeLyrics.reduce((best, cur, idx) => {
                    return pos >= cur.time ? idx : best;
                  }, 0);

                  return (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', userSelect: 'none' }}>
                      {!lyricsOpen ? (
                        /* Standard View */
                        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px' }}>
                          {/* 48x48 Album Art */}
                          <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 10,
                            overflow: 'hidden',
                            flexShrink: 0,
                            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}>
                            {artwork ? (
                              <img src={artwork} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Music size={20} color="#38bdf8" />
                            )}
                          </div>

                          {/* Track Info & Scrubber & Controls */}
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {title}
                              </div>
                              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {artist}
                              </div>
                            </div>

                            {/* Scrubber row with elapsed / remaining */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', minWidth: 28 }}>
                                {formatTimerMMSS(pos)}
                              </span>
                              <div
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                                  const newSec = Math.floor(pct * duration);
                                  setMediaPosition(newSec);
                                  if (window.electronAPI?.controlSystemMedia) {
                                    window.electronAPI.controlSystemMedia('seek', newSec);
                                  }
                                }}
                                style={{
                                  flex: 1,
                                  height: 4,
                                  borderRadius: 2,
                                  background: 'rgba(255,255,255,0.15)',
                                  cursor: 'pointer',
                                  position: 'relative',
                                  overflow: 'hidden'
                                }}
                              >
                                <div style={{
                                  width: `${Math.min(100, (pos / (duration || 1)) * 100)}%`,
                                  height: '100%',
                                  background: 'linear-gradient(90deg, #22c55e, #38bdf8)',
                                  borderRadius: 2
                                }} />
                              </div>
                              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', minWidth: 28, textAlign: 'right' }}>
                                -{formatTimerMMSS(remaining)}
                              </span>
                            </div>

                            {/* Bottom playback controls */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLyricsOpen(prev => !prev);
                                }}
                                title="Toggle Synced Lyrics"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 2,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  color: lyricsOpen ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                                  transition: 'color 180ms ease'
                                }}
                              >
                                <MessageSquare size={13} />
                              </button>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <button
                                  onClick={() => {
                                    lastMediaActionRef.current = Date.now();
                                    window.electronAPI?.controlSystemMedia?.('previous');
                                  }}
                                  style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ffffff' }}
                                >
                                  <SkipBackIcon size={14} fill="#ffffff" />
                                </button>
                                <button
                                  onClick={() => {
                                    lastMediaActionRef.current = Date.now();
                                    window.electronAPI?.controlSystemMedia?.('playPause');
                                  }}
                                  style={{
                                    background: '#ffffff',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: 22,
                                    height: 22,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#000000'
                                  }}
                                >
                                  {isCurrentlyPlaying ? <Pause size={11} fill="#000000" /> : <Play size={11} fill="#000000" style={{ marginLeft: 1 }} />}
                                </button>
                                <button
                                  onClick={() => {
                                    lastMediaActionRef.current = Date.now();
                                    window.electronAPI?.controlSystemMedia?.('next');
                                  }}
                                  style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ffffff' }}
                                >
                                  <SkipForwardIcon size={14} fill="#ffffff" />
                                </button>
                              </div>
                              <div style={{ width: 14 }} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Synced Lyrics Split View (expanded-wide 510px) */
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', userSelect: 'none', boxSizing: 'border-box' }}>
                          {/* Left Column (45%): Album cover, track info, scrubber, playback buttons */}
                          <div style={{ width: '45%', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, boxSizing: 'border-box' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: 10,
                                overflow: 'hidden',
                                flexShrink: 0,
                                background: '#1e293b',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                border: '1px solid rgba(255,255,255,0.1)'
                              }}>
                                {artwork ? (
                                  <img src={artwork} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <Music size={18} color="#38bdf8" style={{ margin: 13 }} />
                                )}
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {title}
                                </div>
                                <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {artist}
                                </div>
                              </div>
                            </div>

                            {/* Scrubber row with elapsed / remaining */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', minWidth: 26 }}>
                                {formatTimerMMSS(pos)}
                              </span>
                              <div
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                                  const newSec = Math.floor(pct * duration);
                                  setMediaPosition(newSec);
                                  if (window.electronAPI?.controlSystemMedia) {
                                    window.electronAPI.controlSystemMedia('seek', newSec);
                                  }
                                }}
                                style={{
                                  flex: 1,
                                  height: 3,
                                  borderRadius: 2,
                                  background: 'rgba(255,255,255,0.15)',
                                  cursor: 'pointer',
                                  position: 'relative',
                                  overflow: 'hidden'
                                }}
                              >
                                <div style={{
                                  width: `${Math.min(100, (pos / (duration || 1)) * 100)}%`,
                                  height: '100%',
                                  background: 'linear-gradient(90deg, #22c55e, #38bdf8)',
                                  borderRadius: 2
                                }} />
                              </div>
                              <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', minWidth: 26, textAlign: 'right' }}>
                                -{formatTimerMMSS(remaining)}
                              </span>
                            </div>

                            {/* Compact controls with 💬 toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 1 }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLyricsOpen(false);
                                }}
                                title="Close Lyrics Split View"
                                style={{
                                  background: 'rgba(34, 197, 94, 0.22)',
                                  border: '1px solid rgba(34, 197, 94, 0.45)',
                                  borderRadius: 6,
                                  padding: '2px 7px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  color: '#22c55e',
                                  fontSize: 10,
                                  fontWeight: 600
                                }}
                              >
                                <MessageSquare size={11} />
                                <span>Lyrics</span>
                              </button>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button
                                  onClick={() => {
                                    lastMediaActionRef.current = Date.now();
                                    window.electronAPI?.controlSystemMedia?.('previous');
                                  }}
                                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 2, display: 'flex' }}
                                >
                                  <SkipBackIcon size={13} fill="#ffffff" />
                                </button>
                                <button
                                  onClick={() => {
                                    lastMediaActionRef.current = Date.now();
                                    window.electronAPI?.controlSystemMedia?.('playPause');
                                  }}
                                  style={{
                                    background: '#ffffff',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: 24,
                                    height: 24,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#000000'
                                  }}
                                >
                                  {isCurrentlyPlaying ? <Pause size={11} fill="#000000" /> : <Play size={11} fill="#000000" style={{ marginLeft: 1 }} />}
                                </button>
                                <button
                                  onClick={() => {
                                    lastMediaActionRef.current = Date.now();
                                    window.electronAPI?.controlSystemMedia?.('next');
                                  }}
                                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 2, display: 'flex' }}
                                >
                                  <SkipForwardIcon size={13} fill="#ffffff" />
                                </button>
                              </div>
                              <div style={{ width: 13 }} />
                            </div>
                          </div>

                          {/* Right Column (55%): Vertical Scrolling Synced Lyrics Stage or Clean Dimmed Empty State */}
                          <div
                            style={{
                              width: '55%',
                              height: 118,
                              position: 'relative',
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              boxSizing: 'border-box',
                              paddingLeft: 8
                            }}
                          >
                            {lyricsLoading ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.6 }}>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Loading lyrics…</span>
                              </div>
                            ) : syncedLyrics && syncedLyrics.length > 0 ? (
                              <div
                                style={{
                                  height: '100%',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)',
                                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)'
                                }}
                              >
                                <div
                                  style={{
                                    transform: `translateY(${-(currentLyricIdx * 28) + 44}px)`,
                                    transition: 'transform 350ms cubic-bezier(0.22, 1, 0.36, 1)',
                                    willChange: 'transform'
                                  }}
                                >
                                  {syncedLyrics.map((l, idx) => {
                                    const isActive = idx === currentLyricIdx;
                                    return (
                                      <div
                                        key={l.time + l.text + idx}
                                        style={{
                                          height: 28,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 6,
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.28)',
                                          fontSize: isActive ? 13 : 11,
                                          fontWeight: isActive ? 700 : 400,
                                          filter: isActive ? 'blur(0px)' : 'blur(0.5px)',
                                          transform: isActive ? 'scale(1)' : 'scale(0.96)',
                                          transformOrigin: 'left center',
                                          transition: 'all 300ms cubic-bezier(0.22, 1, 0.36, 1)'
                                        }}
                                      >
                                        {isActive && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />}
                                        <span>{l.text}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, height: '100%', opacity: 0.55 }}>
                                <Music size={18} color="rgba(255,255,255,0.4)" />
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                                  No synced lyrics available
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Tab 10: Nusa-Style Pomodoro Focus Timer */}
                {currentTab === 10 && (() => {
                  const isFocus = pomodoroState.mode === 'focus';
                  const progress = 1 - (pomodoroState.secondsLeft / pomodoroState.totalSeconds);

                  return (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', userSelect: 'none' }}>
                      {/* Left: Bold 52x52 Circular Progress Ring in Coral Red #ef4444 */}
                      <div style={{ position: 'relative', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width={52} height={52} style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx={26} cy={26} r={21} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={3.5} />
                          <circle
                            cx={26}
                            cy={26}
                            r={21}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth={3.5}
                            strokeDasharray={2 * Math.PI * 21}
                            strokeDashoffset={2 * Math.PI * 21 * (1 - progress)}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 300ms ease' }}
                          />
                        </svg>
                        <div style={{ position: 'absolute' }}>
                          <Timer size={19} color="#ef4444" />
                        </div>
                      </div>

                      {/* Right: Crisp 24px Countdown + Subtitle + 3 Pill Buttons */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingLeft: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <span style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', fontFamily: 'OpenRunde, system-ui, sans-serif', letterSpacing: '-0.5px', lineHeight: 1 }}>
                            {formatTimerMMSS(pomodoroState.secondsLeft)}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {isFocus ? 'Focus Time' : 'Short Break'}
                          </span>
                        </div>

                        {/* Row of 3 sleek pill buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <button
                            onClick={() => {
                              setPomodoroState({
                                isRunning: true,
                                secondsLeft: 300,
                                totalSeconds: 300,
                                mode: 'break'
                              });
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.14)',
                              borderRadius: 12,
                              padding: '3px 8px',
                              fontSize: 9.5,
                              fontWeight: 600,
                              color: 'rgba(255,255,255,0.85)',
                              cursor: 'pointer'
                            }}
                          >
                            ● Short Break
                          </button>
                          <button
                            onClick={() => {
                              setPomodoroState(prev => ({ ...prev, isRunning: !prev.isRunning }));
                            }}
                            style={{
                              background: '#ef4444',
                              border: 'none',
                              borderRadius: 12,
                              padding: '3px 12px',
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#ffffff',
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                            }}
                          >
                            {pomodoroState.isRunning ? '⏸ Pause' : '▶ Start'}
                          </button>
                          <button
                            onClick={() => {
                              setPomodoroState({
                                isRunning: false,
                                secondsLeft: 1500,
                                totalSeconds: 1500,
                                mode: 'focus'
                              });
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.14)',
                              borderRadius: 12,
                              padding: '3px 8px',
                              fontSize: 9.5,
                              fontWeight: 600,
                              color: 'rgba(255,255,255,0.85)',
                              cursor: 'pointer'
                            }}
                          >
                            ↻ Focus Time
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Tab 1: Nusa-Style Water Reminder with Hourly Bar Chart */}
                {currentTab === 1 && (() => {
                  const target = 1500;
                  const pct = Math.min(100, Math.round((waterIntake / target) * 100));
                  const liters = (waterIntake / 1000).toFixed(1);

                  return (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px', userSelect: 'none' }}>
                      {/* Left Column: Readout + Progress + Buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: 145, flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                          <span style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', fontFamily: 'OpenRunde, system-ui, sans-serif' }}>
                            {liters} <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>/ 1.5 L</span>
                          </span>
                        </div>
                        <div style={{ fontSize: 9.5, color: '#38bdf8', fontWeight: 600 }}>
                          Today: {pct}% • Next: 15:30
                        </div>

                        {/* Progress bar */}
                        <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #38bdf8)', borderRadius: 2, transition: 'width 200ms ease' }} />
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                          <button
                            onClick={addWaterDrink}
                            style={{
                              background: '#0284c7',
                              border: 'none',
                              borderRadius: 6,
                              padding: '3px 8px',
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#ffffff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)'
                            }}
                          >
                            <Droplet size={10} fill="#ffffff" />
                            <span>💧 Drink</span>
                          </button>
                          <button
                            onClick={resetWaterDrink}
                            style={{
                              background: 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              borderRadius: 6,
                              padding: '3px 6px',
                              fontSize: 9.5,
                              fontWeight: 600,
                              color: 'rgba(255,255,255,0.65)',
                              cursor: 'pointer'
                            }}
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      {/* Right Column: Mini Hourly Intake Bar Chart + Circular Gauge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {/* Mini Hourly Bar Chart */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 44, padding: '0 2px' }}>
                          {hourlyWater.map((item) => {
                            const barPct = Math.min(100, Math.round((item.amount / 600) * 100));
                            return (
                              <div key={item.hour} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <div style={{
                                  width: 6,
                                  height: 32,
                                  borderRadius: 3,
                                  background: 'rgba(255,255,255,0.1)',
                                  display: 'flex',
                                  alignItems: 'flex-end',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    width: '100%',
                                    height: `${barPct}%`,
                                    background: 'linear-gradient(to top, #0284c7, #38bdf8)',
                                    borderRadius: 3,
                                    transition: 'height 250ms ease'
                                  }} />
                                </div>
                                <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1 }}>{item.hour}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Circular Gauge */}
                        <div style={{ position: 'relative', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width={42} height={42} style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx={21} cy={21} r={17} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={3} />
                            <circle
                              cx={21}
                              cy={21}
                              r={17}
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth={3}
                              strokeDasharray={2 * Math.PI * 17}
                              strokeDashoffset={2 * Math.PI * 17 * (1 - pct / 100)}
                              strokeLinecap="round"
                              style={{ transition: 'stroke-dashoffset 300ms ease' }}
                            />
                          </svg>
                          <div style={{ position: 'absolute' }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#ffffff' }}>{pct}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Tab 13: Interactive Drag & Drop File Shelf */}
                {currentTab === 13 && (() => {
                  const removeShelfItem = (idx) => {
                    setShelfFiles(prev => {
                      const updated = prev.filter((_, i) => i !== idx);
                      localStorage.setItem("shelf-files", JSON.stringify(updated));
                      return updated;
                    });
                  };

                  const clearShelf = () => {
                    setShelfFiles([]);
                    localStorage.removeItem("shelf-files");
                  };

                  return (
                    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', userSelect: 'none' }}>
                      {/* Translucent Dashed Drop-Zone Overlay during Drag-Over */}
                      {isDragOverShelf && (
                        <div className="shelf-drag-overlay">
                          <Inbox size={26} color="#38bdf8" />
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', letterSpacing: '0.02em' }}>
                            Release to add
                          </span>
                        </div>
                      )}

                      {/* Shelf Content (dims and blurs when dragging over, preserving stashed items) */}
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          opacity: isDragOverShelf ? 0.25 : 1,
                          filter: isDragOverShelf ? 'blur(2px)' : 'none',
                          transition: 'opacity 220ms ease, filter 220ms ease'
                        }}
                      >
                        {shelfFiles.length === 0 ? (
                          /* Empty State */
                          <div className="shelf-dropzone" style={{
                            width: '100%',
                            height: 80,
                            borderRadius: 12,
                            border: '1.5px dashed rgba(255,255,255,0.2)',
                            background: 'rgba(255,255,255,0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            boxSizing: 'border-box'
                          }}>
                            <Inbox size={22} color="rgba(255,255,255,0.5)" />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff' }}>
                                Drop files here
                              </span>
                              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
                                Drop files anytime, click to open
                              </span>
                            </div>
                          </div>
                        ) : (
                          /* Populated State with Stashed Files */
                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {/* Top header row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                                {shelfFiles.length} file{shelfFiles.length > 1 ? 's' : ''} stashed
                              </span>
                              <button
                                onClick={clearShelf}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  fontSize: 9.5,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  padding: '1px 4px'
                                }}
                              >
                                Clear
                              </button>
                            </div>

                            {/* Horizontal scrollable row of file cards */}
                            <div style={{
                              display: 'flex',
                              gap: 8,
                              overflowX: 'auto',
                              paddingBottom: 2,
                              scrollbarWidth: 'none'
                            }}>
                              {shelfFiles.map((file, idx) => (
                                <div
                                  key={file.name + idx}
                                  draggable
                                  onDragStart={() => {
                                    isOutboundDragging.current = true;
                                    setIsDragOverShelf(false);
                                    if (file.path && window.electronAPI?.startDrag) {
                                      window.electronAPI.startDrag(file.path);
                                    }
                                    setTimeout(() => {
                                      isOutboundDragging.current = false;
                                      setIsDragOverShelf(false);
                                    }, 300);
                                  }}
                                  onDragEnd={() => {
                                    isOutboundDragging.current = false;
                                    setIsDragOverShelf(false);
                                  }}
                                  onClick={() => {
                                    if (file.path && window.electronAPI?.openExternal) {
                                      window.electronAPI.openExternal(file.path);
                                    }
                                  }}
                                  className={`shelf-item-card ${idx === 0 ? "shelf-popin-item" : ""}`}
                                  style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: 10,
                                    padding: '6px 10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    minWidth: 110,
                                    maxWidth: 140,
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    position: 'relative'
                                  }}
                                >
                                  <File size={16} color="#38bdf8" style={{ flexShrink: 0 }} />
                                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {file.name}
                                    </span>
                                    <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.5)' }}>
                                      {file.size}
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeShelfItem(idx);
                                    }}
                                    className="shelf-item-remove"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'rgba(255,255,255,0.4)',
                                      cursor: 'pointer',
                                      padding: 2,
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Tab 8: To-Do List (Nusa 2-Column Clean Style) */}
                {currentTab === 8 && (() => {
                  const completedCount = tasks.filter(t => (typeof t === 'object' ? (t.completed || t.done) : false)).length;
                  const totalCount = tasks.length;
                  const ratio = totalCount > 0 ? `${completedCount}/${totalCount}` : "0/0";

                  const toggleTaskIdx = (idx) => {
                    setTasks(prev => {
                      const updated = [...prev];
                      const item = updated[idx];
                      if (typeof item === 'object') {
                        updated[idx] = { ...item, completed: !item.completed };
                      } else {
                        updated[idx] = { title: String(item), completed: true };
                      }
                      localStorage.setItem("tasks", JSON.stringify(updated));
                      return updated;
                    });
                  };

                  const removeTaskIdx = (idx) => {
                    setTasks(prev => {
                      const updated = prev.filter((_, i) => i !== idx);
                      localStorage.setItem("tasks", JSON.stringify(updated));
                      return updated;
                    });
                  };

                  const addNewTask = () => {
                    if (!taskText.trim()) return;
                    const newTask = { title: taskText.trim(), completed: false, id: Date.now() };
                    setTasks(prev => {
                      const updated = [newTask, ...prev];
                      localStorage.setItem("tasks", JSON.stringify(updated));
                      return updated;
                    });
                    setTaskText("");
                  };

                  return (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '0 4px', userSelect: 'none', boxSizing: 'border-box' }}>
                      {/* Kolom Kiri (135px): Angka besar 24px bold, Task Done Today, kapsul + Add Task */}
                      <div style={{
                        width: 135,
                        flexShrink: 0,
                        height: 84,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{
                            fontSize: 24,
                            fontWeight: 800,
                            color: '#ffffff',
                            lineHeight: 1,
                            letterSpacing: '-0.5px',
                            fontFamily: 'OpenRunde, system-ui, sans-serif'
                          }}>
                            {ratio}
                          </div>
                          <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
                            Task Done Today
                          </div>
                        </div>

                        {/* Capsule + Add Task Button / Modern Inline Input Field */}
                        {isAddingTask ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.22)',
                            borderRadius: 14,
                            padding: '3px 8px'
                          }}>
                            <input
                              autoFocus
                              placeholder="New task..."
                              value={taskText}
                              onChange={(e) => setTaskText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addNewTask();
                                  setIsAddingTask(false);
                                } else if (e.key === 'Escape') {
                                  setIsAddingTask(false);
                                  setTaskText("");
                                }
                              }}
                              onBlur={() => {
                                if (taskText.trim()) {
                                  addNewTask();
                                }
                                setIsAddingTask(false);
                              }}
                              style={{
                                width: '100%',
                                background: 'none',
                                border: 'none',
                                outline: 'none',
                                fontSize: 10,
                                color: '#ffffff',
                                padding: 0
                              }}
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => setIsAddingTask(true)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                              background: 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.14)',
                              borderRadius: 14,
                              padding: '4px 10px',
                              color: '#ffffff',
                              fontSize: 10,
                              fontWeight: 600,
                              cursor: 'pointer',
                              width: 'fit-content',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span>+ Add Task</span>
                          </button>
                        )}
                      </div>

                      {/* Kolom Kanan (flex: 1): Daftar tugas scrollable dengan circular green checkbox dan hover delete */}
                      <div style={{
                        flex: 1,
                        height: 84,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        paddingRight: 2,
                        scrollbarWidth: 'none'
                      }}>
                        {tasks.length === 0 ? (
                          <div style={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            opacity: 0.45
                          }}>
                            <span style={{ fontSize: 10, color: '#ffffff' }}>No tasks yet</span>
                            <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.6)' }}>Click + Add Task to create</span>
                          </div>
                        ) : (
                          tasks.map((task, idx) => {
                            const isDone = typeof task === 'object' ? (task.completed || task.done) : false;
                            const title = typeof task === 'object' ? (task.title || task.text || "Task") : String(task);

                            return (
                              <div
                                key={idx}
                                className="todo-row"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: 'rgba(255,255,255,0.04)',
                                  borderRadius: 7,
                                  padding: '4px 8px',
                                  gap: 6
                                }}
                              >
                                <div
                                  onClick={() => toggleTaskIdx(idx)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', flex: 1, minWidth: 0 }}
                                >
                                  {isDone ? (
                                    <div style={{
                                      width: 14,
                                      height: 14,
                                      borderRadius: '50%',
                                      background: '#22c55e',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
                                    }}>
                                      <Check size={9} color="#ffffff" strokeWidth={3} />
                                    </div>
                                  ) : (
                                    <div style={{
                                      width: 14,
                                      height: 14,
                                      borderRadius: '50%',
                                      border: '1.5px solid rgba(255,255,255,0.3)',
                                      flexShrink: 0
                                    }} />
                                  )}
                                  <span style={{
                                    fontSize: 10.5,
                                    color: isDone ? 'rgba(255,255,255,0.35)' : '#ffffff',
                                    textDecoration: isDone ? 'line-through' : 'none',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {title}
                                  </span>
                                </div>
                                <button
                                  onClick={() => removeTaskIdx(idx)}
                                  className="todo-delete-btn"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.4)',
                                    cursor: 'pointer',
                                    padding: 2,
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Tab 0: Browser Search */}
                {currentTab === 0 && (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 8px', boxSizing: 'border-box' }}>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 310,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        borderRadius: 10,
                        padding: '6px 10px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <Search size={14} color="rgba(255, 255, 255, 0.5)" style={{ flexShrink: 0 }} />
                      <input
                        id="browser-searchbar"
                        placeholder="Search Google or type a URL..."
                        value={browserSearch}
                        onChange={(e) => setBrowserSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            searchBrowser();
                          }
                        }}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: textColor || '#ffffff',
                          fontSize: 12,
                          fontWeight: 500,
                          textAlign: 'left',
                          padding: 0,
                          caretColor: textColor || '#ffffff',
                          fontFamily: 'OpenRunde, system-ui, sans-serif'
                        }}
                        autoFocus
                      />
                      {browserSearch && (
                        <button
                          type="button"
                          onClick={() => setBrowserSearch("")}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            color: 'rgba(255, 255, 255, 0.45)'
                          }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 5, opacity: 0.45, fontSize: 9.5 }}>
                      <span>Press</span>
                      <kbd style={{ background: 'rgba(255,255,255,0.12)', padding: '1px 4px', borderRadius: 4, fontSize: 9 }}>Enter</kbd>
                      <span>to search or navigate</span>
                    </div>
                  </div>
                )}

                {/* Tab 14: Quick App Launcher & Workspace Switcher */}
                {currentTab === 14 && (
                  <ErrorBoundary tabName="App Launcher" onGoHome={() => setTabState([3, -1])}>
                    <AppLauncher
                      textColor={textColor}
                      accentColor="#38bdf8"
                      onClose={() => setMode("still")}
                    />
                  </ErrorBoundary>
                )}

                {/* Tab 15: Quick Notes & Contextual Capture */}
                {currentTab === 15 && (
                  <ErrorBoundary tabName="Quick Notes" onGoHome={() => setTabState([3, -1])}>
                    <QuickNotes
                      textColor={textColor}
                      accentColor="#10b981"
                      onTaskCreated={(task) => {
                        setTasks(prev => {
                          const updated = [task, ...prev];
                          localStorage.setItem("tasks", JSON.stringify(updated));
                          return updated;
                        });
                      }}
                    />
                  </ErrorBoundary>
                )}

                {/* Tab 12: Audio Mixer */}
                {currentTab === 12 && (() => {
                  const masterPercent = Math.round((masterAudioVolume || 0) * 100);
                  const activeDevice = audioDevices.find(d => d.id === activeAudioDeviceId);

                  return (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', userSelect: 'none' }}>
                      {/* Left: Master Volume Slider & Mute */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 140 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            {masterAudioMuted ? <VolumeX size={14} color="#ef4444" /> : <Volume2 size={14} color="#38bdf8" />}
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff' }}>Master</span>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{masterPercent}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={masterPercent}
                          onChange={(e) => handleSetMasterVolume(Number(e.target.value) / 100)}
                          style={{ width: '100%', accentColor: '#38bdf8', height: 4, cursor: 'pointer' }}
                        />
                        <button
                          onClick={handleToggleMasterMute}
                          style={{
                            background: masterAudioMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.08)',
                            border: `1px solid ${masterAudioMuted ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.12)'}`,
                            borderRadius: 6,
                            padding: '2px 8px',
                            fontSize: 9.5,
                            color: masterAudioMuted ? '#ef4444' : 'rgba(255,255,255,0.8)',
                            cursor: 'pointer',
                            alignSelf: 'flex-start'
                          }}
                        >
                          {masterAudioMuted ? 'Unmute' : 'Mute'}
                        </button>
                      </div>

                      {/* Right: Output Device Info */}
                      <div style={{ flex: 1, minWidth: 0, paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Output Device</span>
                        <div style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8,
                          padding: '6px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          <Headphones size={14} color="#38bdf8" style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {activeDevice?.name || "System Default Endpoint"}
                            </div>
                            <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)' }}>Windows Audio Device</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}


                {/* Tab 2: Overview / Interactive Mascot Standby Hub */}
                {currentTab === 2 && (
                  <MascotStandbyHub
                    time={time}
                    percent={percent}
                    charging={charging}
                    systemStats={systemStats}
                    spotifyTrack={spotifyTrack}
                    isPlaying={isPlaying}
                    pomodoroState={pomodoroState}
                    waterIntake={waterIntake}
                    waterGoal={1500}
                    onAddWater={addWaterDrink}
                    tasks={tasks}
                    shelfFiles={shelfFiles}
                    onSwitchTab={(targetId) => {
                      setTabState([targetId, targetId > currentTabId ? 1 : -1]);
                    }}
                    onToggleMedia={() => {
                      if (window.electronAPI?.controlSystemMedia) {
                        window.electronAPI.controlSystemMedia('playPause');
                      }
                    }}
                    onTogglePomodoro={() => {
                      setPomodoroState(prev => ({ ...prev, isRunning: !prev.isRunning }));
                    }}
                    onOpenLyrics={() => {
                      setLyricsOpen(true);
                      setTabState([3, 1]);
                    }}
                  />
                )}

                {/* Tab 11: Battery Hub */}
                {currentTab === 11 && (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {charging ? <BatteryCharging size={20} color="#22c55e" /> : <Battery size={20} color="#22c55e" />}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>{percent}%</span>
                        <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.5)' }}>{charging ? 'Charging plugged in' : 'On battery power'}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', padding: '3px 8px', borderRadius: 6 }}>
                      Healthy
                    </div>
                  </div>
                )}

                {/* Tab 4: Calendar (Authentic macOS Style) */}
                {currentTab === 4 && (
                  <CalendarModule />
                )}

                {/* Tab 5: Notifications (Summary View + Scrollable List View) */}
                {currentTab === 5 && (() => {
                  const rawList = Array.isArray(notificationSnapshot?.active) && notificationSnapshot.active.length > 0 
                    ? notificationSnapshot.active 
                    : (Array.isArray(notificationsList) ? notificationsList : []);
                  const activeList = rawList.filter(Boolean);
                  const activeCount = notificationSnapshot?.stats?.totalActive || activeList.length;

                  return (
                    <div 
                      className="notif-drawer-full"
                      data-no-toggle="true"
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        padding: '4px 10px 6px 10px', 
                        userSelect: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Edge-to-edge Header */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '2px 0 6px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        marginBottom: 6,
                        flexShrink: 0
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            background: 'rgba(168, 85, 247, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Bell size={12} color="#c084fc" />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.2px' }}>
                            Notifications
                          </span>
                          {activeCount > 0 && (
                            <span style={{
                              background: 'rgba(168, 85, 247, 0.25)',
                              color: '#c084fc',
                              border: '1px solid rgba(168, 85, 247, 0.4)',
                              borderRadius: 999,
                              fontSize: 9.5,
                              fontWeight: 700,
                              padding: '1px 7px',
                              lineHeight: '13px'
                            }}>
                              {activeCount}
                            </span>
                          )}
                        </div>

                        {activeCount > 0 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearAll();
                            }}
                            className="notif-clear-btn"
                            style={{
                              background: 'rgba(239, 68, 68, 0.14)',
                              border: '1px solid rgba(239, 68, 68, 0.28)',
                              color: '#f87171',
                              fontSize: 10,
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: '2px 10px',
                              borderRadius: 999,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            Clear All
                          </button>
                        ) : (
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                            Quiet
                          </span>
                        )}
                      </div>

                      {/* Notifications Body: Symmetrical Centered Empty State OR Full-Width Scrollable Items */}
                      {activeList.length === 0 ? (
                        <div style={{
                          flex: 1,
                          width: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '12px 0'
                        }}>
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Bell size={17} color="rgba(255,255,255,0.35)" />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                              No active notifications
                            </span>
                            <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)' }}>
                              You're all caught up
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="notif-scroll-area"
                          style={{
                            flex: 1,
                            overflowY: 'auto',
                            maxHeight: 108,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 5,
                            paddingRight: 3,
                            paddingBottom: 2
                          }}
                        >
                          {activeList.map((notif, idx) => {
                            const nId = notif.id || notif.sourceNotificationId || idx;
                            const notifIcon = notif.icon || notif.applicationIcon;
                            const appName = notif.applicationName || notif.appName || '';
                            const notifTitle = notif.title || appName || "Notification";
                            const notifBody = notif.body || notif.message || "";
                            const notifTime = notif.receivedAt || notif.timestamp;
                            const targetAppId = notif.applicationId || notif.appId || '';
                            const targetAppName = appName || notif.title || '';

                            return (
                              <div
                                key={nId}
                                className="notif-item-card"
                                data-no-toggle="true"
                                title={`Open ${targetAppName || "Application"}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.electronAPI?.focusNotificationApp) {
                                    window.electronAPI.focusNotificationApp(targetAppId, targetAppName);
                                  }
                                  setMode("still");
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  borderRadius: 8,
                                  padding: '6px 9px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                                  position: 'relative'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                                  <div style={{
                                    width: 25,
                                    height: 25,
                                    borderRadius: 6,
                                    background: notifIcon ? 'transparent' : 'rgba(168, 85, 247, 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    overflow: 'hidden'
                                  }}>
                                    {notifIcon ? (
                                      <img src={notifIcon} alt="" style={{ width: 22, height: 22, borderRadius: 5, objectFit: 'contain' }} />
                                    ) : (
                                      <Bell size={13} color="#c084fc" />
                                    )}
                                  </div>
                                  <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {notifTitle}
                                      </span>
                                      {appName && appName !== notifTitle && (
                                        <span style={{
                                          fontSize: 8.5,
                                          color: '#38bdf8',
                                          background: 'rgba(56, 189, 248, 0.12)',
                                          padding: '0.5px 5px',
                                          borderRadius: 4,
                                          fontWeight: 600,
                                          flexShrink: 0
                                        }}>
                                          {appName}
                                        </span>
                                      )}
                                    </div>
                                    {notifBody && (
                                      <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '12.5px' }}>
                                        {notifBody}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                                  <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                                    {formatRelativeTime(notifTime)}
                                  </span>
                                  <button
                                    title="Dismiss notification"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExecuteAction(nId, 'dismiss');
                                    }}
                                    className="notif-dismiss-btn"
                                    style={{
                                      background: 'rgba(255,255,255,0.06)',
                                      border: 'none',
                                      color: 'rgba(255,255,255,0.5)',
                                      cursor: 'pointer',
                                      padding: 3,
                                      borderRadius: 4,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'all 0.12s ease'
                                    }}
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Tab 6: Game / Stats */}
                {currentTab === 6 && (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 12px', userSelect: 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: 110 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: '#38bdf8' }}>
                        <span>CPU</span>
                        <span>{systemStats.cpu}%</span>
                      </div>
                      <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${systemStats.cpu}%`, height: '100%', background: '#38bdf8', borderRadius: 2 }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: 110 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: '#a855f7' }}>
                        <span>RAM</span>
                        <span>{systemStats.ram}%</span>
                      </div>
                      <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${systemStats.ram}%`, height: '100%', background: '#a855f7', borderRadius: 2 }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 7: Clipboard History */}
                {currentTab === 7 && (() => {
                  const items = Array.isArray(clipboard) ? clipboard : [];
                  return (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      padding: '2px 4px',
                      userSelect: 'none',
                      boxSizing: 'border-box'
                    }}>
                      {/* Header Row: Title & Item Count on Left, Clear button on Right */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 4px',
                        flexShrink: 0
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clipboard size={12} color="#38bdf8" />
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff' }}>Clipboard History</span>
                          <span style={{
                            fontSize: 9,
                            padding: '1px 6px',
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.6)',
                            fontWeight: 600
                          }}>
                            {items.length}
                          </span>
                        </div>
                        {items.length > 0 && (
                          <button
                            onClick={clearAllClipboard}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              fontSize: 9.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: '2px 6px',
                              borderRadius: 4
                            }}
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Scrollable list of compact cards (smooth scroll, fits within 150px shell) */}
                      <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        paddingRight: 2,
                        maxHeight: 88,
                        scrollbarWidth: 'none'
                      }}>
                        {items.length === 0 ? (
                          <div style={{
                            height: 60,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            opacity: 0.45
                          }}>
                            <Clipboard size={18} color="rgba(255,255,255,0.6)" />
                            <span style={{ fontSize: 10.5, color: '#ffffff' }}>Clipboard is empty</span>
                          </div>
                        ) : (
                          items.map((item, idx) => {
                            const itemText = typeof item === 'object' ? (item.text || "") : String(item || "");
                            const itemId = typeof item === 'object' ? (item.id || idx) : idx;
                            const timeAgo = typeof item === 'object' ? formatRelativeTime(item.timestamp) : "Just now";
                            const isCopied = copiedClipboardId === itemId;

                            return (
                              <div
                                key={itemId}
                                onClick={() => copyClipboardItem(item, itemId)}
                                className="clipboard-item-row"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 8,
                                  padding: '5px 8px',
                                  borderRadius: 7,
                                  background: isCopied ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255,255,255,0.06)',
                                  border: isCopied ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                                  cursor: 'pointer'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                                  <Copy size={11} color={isCopied ? '#22c55e' : 'rgba(255,255,255,0.4)'} style={{ flexShrink: 0 }} />
                                  <span style={{
                                    fontSize: 10.5,
                                    color: '#ffffff',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    lineHeight: 1.3
                                  }}>
                                    {itemText}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                  {isCopied ? (
                                    <span style={{
                                      fontSize: 8.5,
                                      fontWeight: 700,
                                      color: '#22c55e',
                                      background: 'rgba(34, 197, 94, 0.2)',
                                      padding: '1px 5px',
                                      borderRadius: 4
                                    }}>
                                      Copied!
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>
                                      {timeAgo}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Fallback if currentTab does not match any known tab */}
                {![0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15].includes(currentTab) && (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={16} color="#38bdf8" />
                      <span>{time}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
            </div>

            {/* Elastic Bottom Pagination Dots (hidden during lyrics wide mode to maximize focus) */}
            {!isLyricsWide && (
              <div className="elastic-pagination">
                {visibleTabs.map((tabId, idx) => {
                  const isActive = tabId === currentTab;
                  const tabInfo = TABS.find(t => t.id === tabId);
                  return (
                    <div
                      key={tabId}
                      className={`elastic-dot ${isActive ? "active" : "inactive"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTabState([tabId, tabId > currentTab ? 1 : -1]);
                      }}
                      title={tabInfo?.name || `Tab ${idx + 1}`}
                    />
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </motion.div>
  );
}
