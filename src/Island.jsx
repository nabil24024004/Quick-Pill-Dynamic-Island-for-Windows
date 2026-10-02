import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Mic, SkipBackIcon, Play, Pause, SkipForwardIcon, Music, Headphones, Zap, Settings, Sun, Cloud, Trash2, ChevronRight, ChevronLeft, Check, X, CloudRain, CloudSnow, CloudLightning, CloudSun, Moon, Eye, EyeOff, GripVertical, List, Search, Star, Calendar as CalendarIcon, Bell, BellOff, AlarmClock, Timer, Activity, Clock, Volume2, VolumeX, Wind, Usb, Download, RefreshCw, Sparkles, AlertCircle, CheckCircle2, SlidersHorizontal, Palette, Compass, Layers, Quote, Copy, Shuffle, BatteryCharging, Battery, ArrowDown, ArrowUp } from "lucide-react";
import "./App.css";

// Helper format file sizes (Bytes -> KB -> MB)
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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
  { id: 0, name: "Browser Search", icon: (color) => <Search size={16} color={color} /> },
  { id: 1, name: "Weather", icon: (color) => <CloudSun size={16} color={color} /> },
  { id: 2, name: "Overview", icon: (color) => <Sun size={16} color={color} /> },
  { id: 11, name: "Battery Hub", icon: (color) => <BatteryCharging size={16} color={color} /> },
  { id: 3, name: "Now Playing", icon: (color) => <Music size={16} color={color} /> },
  { id: 4, name: "Calendar", icon: (color) => <CalendarIcon size={16} color={color} /> },
  { id: 5, name: "Notifications", icon: (color) => <Bell size={16} color={color} /> },
  { id: 6, name: "Game / Stats", icon: (color) => <Activity size={16} color={color} /> },
  { id: 7, name: "Clipboard", icon: (color) => <List size={16} color={color} /> },
  { id: 8, name: "Tasks", icon: (color) => <Check size={16} color={color} /> },
  { id: 10, name: "Timer", icon: (color) => <Timer size={16} color={color} /> },
  { id: 9, name: "Settings", icon: (color) => <Settings size={16} color={color} /> },
];

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
        return saved;
      }
    } catch {}
    return [2, 11, 4, 5, 6, 7, 8, 10, 0, 1, 3, 9];
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
  const [percent, setPercent] = useState(null);
  const [alert, setAlert] = useState(null);
  const [batteryAlertsEnabled, setBatteryAlertsEnabled] = useState(localStorage.getItem("battery-alerts") !== "false");
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

  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(v => {
        if (v) setAppVersion(v);
      }).catch(() => { });
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

  const triggerVolumeAlert = (level) => {
    setVolumeLevel(level);
    setVolumeAlert(true);
    clearTimeout(volumeAlertTimeout.current);
    volumeAlertTimeout.current = setTimeout(() => {
      setVolumeAlert(false);
    }, 2000);
  };

  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            playTimerAlarmSound();
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification("Timer Finished! 🔔", { body: "Your countdown timer has ended." });
              } catch (e) {
                console.log("Notification error:", e);
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

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
    enter: (direction) => ({
      x: direction > 0 ? 300 : direction < 0 ? -300 : 0,
      opacity: 0,
      scale: 0.95,
      filter: "blur(10px)"
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      filter: "blur(0px)"
    },
    exit: (direction) => ({
      x: direction < 0 ? 300 : direction > 0 ? -300 : 0,
      opacity: 0,
      scale: 0.95,
      filter: "blur(10px)"
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
  const swipeThreshold = 60;
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

    // Allow natural wheel scrolling inside scrollable containers (Clipboard, Notifications, Tasks, Settings, Calendar)
    const scrollableElem = e.target.closest("#clipboard, .notifications-container, #task-list, #settings-container, .calendar-container");
    if (scrollableElem) {
      const isScrollable = scrollableElem.scrollHeight > scrollableElem.clientHeight;
      if (isScrollable) {
        const atTop = scrollableElem.scrollTop <= 2;
        const atBottom = scrollableElem.scrollTop + scrollableElem.clientHeight >= scrollableElem.scrollHeight - 2;
        const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;

        // If scrolling inside content (down when not at bottom, or up when not at top), allow content to scroll without switching tab
        if ((delta > 0 && !atBottom) || (delta < 0 && !atTop)) {
          return;
        }
      }
    }

    // Support both mouse wheel (deltaY) and touch/trackpad swipe (deltaX)
    let delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
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
      target?.closest?.(".task-row") ||
      target?.closest?.(".clipboard-row") ||
      target?.closest?.(".notification-card")
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
  const nowPlayingWidth = isHovered ? 135 : 110;
  const width = notificationAlert
    ? 300
    : mode === "large"
      ? (currentTab === 9 ? 620 : (currentTab === 2 || currentTab === 11 ? 560 : 540))
      : (mode === "quick" && isPlaying && !alert && !chargingAlert && !bluetoothAlert && !cameraAlert && !microphoneAlert && !volumeAlert && !keyLockAlert && !usbAlert && !notificationAlert)
        ? nowPlayingWidth
        : (mode === "quick" || alert || chargingAlert || bluetoothAlert || cameraAlert || microphoneAlert || volumeAlert || keyLockAlert || usbAlert || notificationAlert)
          ? 260
          : isPlaying
            ? nowPlayingWidth
            : 170;
  const height = notificationAlert
    ? 46
    : mode === "large"
      ? (currentTab === 9 ? 220 : 145)
      : 40;

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
  const clearAllClipboard = () => {
    if (window.electronAPI?.clearClipboard) {
      window.electronAPI.clearClipboard();
    } else if (window.electronAPI?.writeClipboardText) {
      window.electronAPI.writeClipboardText("");
    }
    setClipboard([]);
  };

  const removeClipboardItem = (indexToRemove) => {
    setClipboard((prev) => {
      const updated = prev.filter((_, i) => i !== indexToRemove);
      if (indexToRemove === 0) {
        if (window.electronAPI?.clearClipboard) {
          window.electronAPI.clearClipboard();
        } else if (window.electronAPI?.writeClipboardText) {
          window.electronAPI.writeClipboardText("");
        }
      }
      return updated;
    });
  };

  async function getClipboard() {
    try {
      let text = "";
      if (window.electronAPI?.getClipboardText) {
        text = await window.electronAPI.getClipboardText();
      } else if (navigator.clipboard && navigator.clipboard.readText) {
        text = await navigator.clipboard.readText();
      }
      if (!text || !text.trim()) return;

      setClipboard((prevClipboard) => {
        if (prevClipboard[0] === text) {
          return prevClipboard;
        }
        const filtered = prevClipboard.filter(item => item && item !== text && item.trim().length > 0);
        return [text, ...filtered].slice(0, 50);
      });
    } catch (error) {
      console.log(
        `Error reading clipboard: ${error.toString()}`,
      );
    }
  }

  useEffect(() => {
    let inflightClipboard = false;
    const pollGetClipboard = async () => {
      if (inflightClipboard) return;
      inflightClipboard = true;
      await getClipboard();
      inflightClipboard = false;
    };
    pollGetClipboard();
    const pollInterval = currentTab === 7 ? 2000 : 3500; // Poll faster when Clipboard tab (7) is active
    const interval = setInterval(pollGetClipboard, pollInterval);
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

  // Key Lock Alert Listener (push events from main process)
  useEffect(() => {
    if (!window.electronAPI?.onKeyLockChange) return;
    const cleanup = window.electronAPI.onKeyLockChange((data) => {
      setKeyLockAlert(data);
      setMode("quick");
      clearTimeout(keyLockAlertTimeout.current);
      keyLockAlertTimeout.current = setTimeout(() => {
        setKeyLockAlert(null);
        if (!isHovered) {
          if (standbyBorderEnabled) setMode("quick");
          else if (largeStandbyEnabled) setMode("large");
          else setMode("still");
        }
      }, 1500);
    });
    return () => {
      cleanup?.();
      clearTimeout(keyLockAlertTimeout.current);
    };
  }, [isHovered, standbyBorderEnabled, largeStandbyEnabled]);

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

  // Notification Center Polling
  useEffect(() => {
    if (window.electronAPI?.platform !== 'win32') return;
    let isFirstFetch = true;
    const fetchNotifications = async () => {
      if (window.electronAPI?.getNotifications) {
        try {
          const notifs = await window.electronAPI.getNotifications();
          const mapped = notifs.map(n => ({
            id: n.Id,
            appName: n.AppName || '',
            appId: n.AppId || '',
            title: n.Title || '',
            body: n.Body || '',
            timestamp: n.Timestamp || '',
            icon: n.Icon || ''   // base64 PNG from PowerShell Get-AppIconBase64
          }));
          if (isFirstFetch) {
            mapped.forEach(n => { if (n.id) seenNotificationIds.current.add(n.id); });
            isFirstFetch = false;
          } else {
            const newNotifs = mapped.filter(n => n.id && !seenNotificationIds.current.has(n.id));
            mapped.forEach(n => { if (n.id) seenNotificationIds.current.add(n.id); });
            if (newNotifs.length > 0) {
              const latest = newNotifs[newNotifs.length - 1];
              setNotificationAlert(latest);
              setMode("quick");
              clearTimeout(notificationAlertTimeout.current);
              notificationAlertTimeout.current = setTimeout(() => {
                setNotificationAlert(null);
                setMode("still");
              }, 4000);
            }
          }
          setNotificationsList(mapped);
        } catch (e) {
          console.error(e);
        }
      }
    };
    const initialDelay = setTimeout(() => {
      fetchNotifications();
    }, 2500);
    const interval = setInterval(fetchNotifications, 5000);
    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
      clearTimeout(notificationAlertTimeout.current);
    };
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

    if (cameraInUse && !captureAlertDisplayed.current.camera) {
      captureAlertQueue.current.push("camera");
      captureAlertDisplayed.current.camera = true;
    }
    if (!cameraInUse) {
      captureAlertDisplayed.current.camera = false;
    }

    if (microphoneInUse && !captureAlertDisplayed.current.microphone) {
      captureAlertQueue.current.push("microphone");
      captureAlertDisplayed.current.microphone = true;
    }
    if (!microphoneInUse) {
      captureAlertDisplayed.current.microphone = false;
    }

    captureAlertQueue.current = captureAlertQueue.current.filter((item) => {
      if (item === "camera" && !cameraInUse) return false;
      if (item === "microphone" && !microphoneInUse) return false;
      return true;
    });

    processCaptureQueue();

    return () => {
      if (!cameraInUse && !microphoneInUse) {
        if (captureAlertTimer.current) {
          clearTimeout(captureAlertTimer.current);
          captureAlertTimer.current = null;
        }
        captureAlertQueue.current = [];
      }
    };
  }, [cameraInUse, microphoneInUse]);

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

  // Sync position from spotifyTrack when track info updates from backend
  useEffect(() => {
    if (spotifyTrack && spotifyTrack.position !== undefined) {
      setMediaPosition(spotifyTrack.position);
    }
  }, [spotifyTrack?.name, spotifyTrack?.artist, spotifyTrack?.position]);

  // Continuously advance position every 500ms when playing
  useEffect(() => {
    if (spotifyTrack?.state !== 'playing') return;
    const timer = setInterval(() => {
      setMediaPosition(prev => {
        const dur = spotifyTrack?.duration || 0;
        return (dur > 0 && prev >= dur) ? dur : prev + 0.5;
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
      if (e.key === "ArrowRight") {
        moveTab(1);
      } else if (e.key === "ArrowLeft") {
        moveTab(-1);
      } else if (e.ctrlKey && e.key >= "1" && e.key <= "8") {
        const idx = parseInt(e.key) - 1;
        if (visibleTabs[idx] !== undefined) {
          const targetId = visibleTabs[idx];
          setMode("large");
          setTabState([targetId, targetId > currentTabId ? 1 : -1]);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [moveTab, visibleTabs, currentTabId]);

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
      case 'top-left': return { left: '15px', top: '6px', x: '0%' };
      case 'top-right': return { left: 'calc(100% - 15px)', top: '6px', x: '-100%' };
      case 'bottom-left': return { left: '15px', top: 'auto', bottom: '45px', x: '0%' };
      case 'bottom-right': return { left: 'calc(100% - 15px)', top: 'auto', bottom: '45px', x: '-100%' };
      case 'top-center': return { left: '49.8%', top: '0px', x: '-50%' };
      case 'bottom-center': return { left: '49.8%', top: 'auto', bottom: '45px', x: '-50%' };
      default: return { left: `${islandX}%`, top: `${islandY}px`, x: '-50%' };
    }
  }, [positionMode, islandX, islandY]);

  const isAtTop = (sideStyles.top === '0px' || (positionMode === 'free' && islandY === 0)) && theme !== 'win95';
  const islandBorderStroke = theme === "win95"
    ? "none"
    : islandBorderEnabled
      ? (cameraInUse
          ? "rgba(255, 215, 0, 0.8)"
          : microphoneInUse
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
          setMode("large");
          updateMouseIgnore(false, true);
        }
      }}
      onMouseMove={(e) => {
        const isCtrl = !!(e?.ctrlKey || e?.metaKey);
        if (isCtrl && !ctrlHeldRef.current) {
          setCtrlState(true);
          updateMouseIgnore(true, true);
        } else if (!isCtrl && ctrlHeldRef.current) {
          setCtrlState(false);
          updateMouseIgnore(false, true);
        }
      }}
      onMouseLeave={() => {
        suppressClick.current = false;
        if (ctrlHeldRef.current) {
          setCtrlState(false);
        }
        if (isDraggingRef.current) return;
        if (mouseLeaveTimer.current) clearTimeout(mouseLeaveTimer.current);
        mouseLeaveTimer.current = setTimeout(() => {
          mouseLeaveTimer.current = null;
          setHoverState(false);
          updateMouseIgnore(true, true);

          const activeTag = document.activeElement?.tagName;
          if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;

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

        const activeTag = document.activeElement?.tagName;
        if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") {
          document.activeElement.blur();
        }

        setMode(prev => prev === "large" ? "quick" : "large");
        updateMouseIgnore(false, true);
      }}
      onWheel={handleWheelSwipe}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      initial={{
        x: sideStyles.x,
        left: sideStyles.left,
        top: sideStyles.top || 'auto',
        bottom: sideStyles.bottom || 'auto',
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
      }}
      animate={{
        width: `${width}px`,
        height: `${height}px`,
        left: sideStyles.left,
        top: sideStyles.top || 'auto',
        bottom: sideStyles.bottom || 'auto',
        backgroundColor: bgColor || "#000000",
        color: textColor || "#FFFFFF",
        scale: 1,
        opacity: (ctrlHeld && isHovered)
          ? 0.15
          : (mode === "still" && !isHovered && (!showInfoWhenIdleEnabled || hideNotActiveIslandEnabled) && !isPlaying && !showPausedQuickView && !isTimerRunning && timerSeconds === 0 && !alert && !chargingAlert && !bluetoothAlert && !cameraAlert && !microphoneAlert && !keyLockAlert && !usbAlert && !notificationAlert)
            ? 0
            : 1,
        x: sideStyles.x,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius:
          mode === "large" && theme === "win95"
            ? 0
            : mode === "large"
              ? 26
              : theme === "win95"
                ? 0
                : 20,
        borderBottomRightRadius:
          mode === "large" && theme === "win95"
            ? 0
            : mode === "large"
              ? 26
              : theme === "win95"
                ? 0
                : 20,
        boxShadow: isHovered
          ? "0 16px 36px rgba(0, 0, 0, 0.35), 0 4px 12px rgba(0, 0, 0, 0.2)"
          : "0 8px 24px rgba(0, 0, 0, 0.28), 0 2px 8px rgba(0, 0, 0, 0.18)",
      }}
      onAnimationStart={() => {
        setIsTransitioning(true);
      }}
      onAnimationComplete={() => {
        setIsTransitioning(false);
      }}
      transition={{
        type: "spring",
        stiffness: 340,
        damping: 28,
        mass: 0.8,
        x: { duration: .15 }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        backgroundImage: `url('${bgImage}')`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
        justifyContent: (mode === "large" && currentTab === 3) ? "flex-start" : "center",
        overflow: "visible",
        fontFamily: theme === "win95" ? "w95" : "OpenRunde",
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        border: theme === "win95" ? "2px solid rgb(254, 254, 254)" : islandBorderStroke !== "none" ? `1px solid ${islandBorderStroke}` : "none",
        borderTop: (isAtTop || islandBorderStroke === "none") ? "none" : undefined,
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
      {/* Dynamic Island Notch Ear Fillets (Concave upper corners) */}
      {isAtTop && (
        <>
          {/* Left Notch Ear */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: -12,
              width: 13,
              height: 12,
              pointerEvents: 'none',
              zIndex: 999
            }}
            viewBox="0 0 13 12"
          >
            <path
              d="M 0,0 A 12,12 0 0,1 12,12 H 13 V 0 Z"
              fill={bgColor || "#000000"}
            />
            {islandBorderStroke !== "none" && (
              <path
                d="M 0,0 A 12,12 0 0,1 12,12"
                fill="none"
                stroke={islandBorderStroke}
                strokeWidth="1"
              />
            )}
          </svg>

          {/* Right Notch Ear */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              right: -12,
              width: 13,
              height: 12,
              pointerEvents: 'none',
              zIndex: 999
            }}
            viewBox="0 0 13 12"
          >
            <path
              d="M 0,0 V 12 H 1 A 12,12 0 0,1 13,0 Z"
              fill={bgColor || "#000000"}
            />
            {islandBorderStroke !== "none" && (
              <path
                d="M 1,12 A 12,12 0 0,1 13,0"
                fill="none"
                stroke={islandBorderStroke}
                strokeWidth="1"
              />
            )}
          </svg>
        </>
      )}

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

      {/* Privacy Dots — persistent indicators for active camera/mic */}
      {mode !== "large" && (cameraInUse || microphoneInUse) && (
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

      {/*Quickview*/}
      {mode !== "large" && (mode === "quick" || (mode === "still" && showInfoWhenIdleEnabled) || (mode === "still" && (isPlaying || showPausedQuickView || isTimerRunning || timerSeconds > 0)) || alert || chargingAlert || bluetoothAlert || cameraAlert || microphoneAlert || keyLockAlert || usbAlert || notificationAlert) ? (
        <AnimatePresence mode="wait">
          {notificationAlert && !keyLockAlert && !usbAlert ? (
            <motion.div
              key={`notif-alert-${notificationAlert.id}`}
              initial={{ opacity: 0, filter: 'blur(4px)', scale: 0.98 }}
              animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
              exit={{ opacity: 0, filter: 'blur(4px)', scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: '0 14px',
                gap: 8,
                boxSizing: 'border-box',
                overflow: 'hidden',
                cursor: 'pointer'
              }}
              onClick={() => {
                if (notificationAlert.appId && window.electronAPI?.focusNotificationApp) {
                  window.electronAPI.focusNotificationApp(notificationAlert.appId);
                }
                setNotificationAlert(null);
                clearTimeout(notificationAlertTimeout.current);
              }}
            >
              {notificationAlert.icon ? (
                <img
                  src={notificationAlert.icon}
                  alt=""
                  style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: notificationAlert.appName?.toLowerCase().includes('whatsapp')
                    ? 'linear-gradient(135deg, #25D366, #128C7E)'
                    : notificationAlert.appName?.toLowerCase().includes('spotify')
                      ? '#1db954'
                      : notificationAlert.appName?.toLowerCase().includes('discord')
                        ? '#5865F2'
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#ffffff',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                }}>
                  {notificationAlert.appName?.[0]?.toUpperCase() || <Bell size={12} color="#fff" />}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, gap: 1 }}>
                <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.04em', color: textColor, lineHeight: 1 }}>
                  {notificationAlert.appName}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                  {notificationAlert.title || notificationAlert.body}
                </span>
              </div>
            </motion.div>
          ) : (isPlaying || showPausedQuickView) && !alert && !chargingAlert && !bluetoothAlert && !cameraAlert && !microphoneAlert && !keyLockAlert && !usbAlert && !notificationAlert && !isTimerRunning && timerSeconds === 0 ? (
            <motion.div
              key={spotifyTrack?.name ? `playing-${spotifyTrack.name}-${spotifyTrack.artist}` : "playing"}
              initial={{ opacity: 0, filter: 'blur(4px)', scale: 0.98 }}
              animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
              exit={{ opacity: 0, filter: 'blur(4px)', scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1], filter: { duration: 0.05 } }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                minWidth: 0,
                boxSizing: 'border-box',
                opacity: showPausedQuickView ? 0.5 : (hideNotActiveIslandEnabled ? .6 : 1),
                filter: showPausedQuickView ? 'grayscale(1)' : 'none',
                padding: '0 9px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'visible', flex: 1, minWidth: 0, userSelect: 'none', perspective: '1200px' }}>
                {spotifyTrack?.artwork_url ? (
                  <div style={{ perspective: '1200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={spotifyTrack.artwork_url}
                      onClick={() => openMusicPlayer(spotifyTrack.source)}
                      onMouseEnter={() => setAlbumHovered(true)}
                      onMouseLeave={() => {
                        setAlbumHovered(false);
                        setAlbumRotation({ x: 0, y: 0 });
                      }}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const centerX = rect.left + rect.width / 2;
                        const centerY = rect.top + rect.height / 2;
                        const deltaX = e.clientX - centerX;
                        const deltaY = e.clientY - centerY;
                        const maxDistance = Math.sqrt(rect.width * rect.width + rect.height * rect.height) / 2;
                        const angleX = (deltaY / maxDistance) * 35;
                        const angleY = (deltaX / maxDistance) * -35;
                        setAlbumRotation({ x: angleX, y: angleY });
                      }}
                      style={{
                        width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, cursor: 'pointer',
                        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease-out',
                        transform: `rotateX(${albumRotation.x}deg) rotateY(${albumRotation.y}deg) scale(${albumHovered ? 1.25 : 1}) translateZ(0)`,
                        transformStyle: 'preserve-3d',
                        filter: albumHovered ? 'drop-shadow(0 10px 20px rgba(0,0,0,0.4))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                        willChange: 'transform'
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                    <Music size={14} color={textColor} />
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 3,
                  paddingRight: 6,
                  height: 18,
                  flex: 1
                }}>
                  {[0.4, 0.9, 0.55, 0.8].map((delay, i) => (
                    <motion.span
                      key={`waveform-bar-${i}`}
                      animate={{
                        scaleY: isPlaying ? [0.3, 1, 0.35, 0.95, 0.3] : 0.3
                      }}
                      transition={{
                        duration: 0.65,
                        repeat: Infinity,
                        repeatType: "reverse",
                        delay: i * 0.14,
                        ease: "easeInOut"
                      }}
                      style={{
                        width: 3,
                        height: 14,
                        backgroundColor: '#1DB954',
                        borderRadius: 2,
                        transformOrigin: 'bottom',
                        display: 'inline-block'
                      }}
                    />
                  ))}
                </div>
                <AnimatePresence>
                  {isHovered && (
                    <motion.button
                      key="play-pause-hover"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 30 }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        lastMediaActionRef.current = Date.now();
                        setSpotifyTrack((prev) => prev ? { ...prev, state: prev.state === 'playing' ? 'paused' : 'playing' } : null);
                        if (window.electronAPI?.controlSystemMedia) {
                          window.electronAPI.controlSystemMedia('playpause');
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (!ctrlHeldRef.current && !e.ctrlKey && !e.metaKey) {
                          updateMouseIgnore(false, true);
                        }
                      }}
                      style={{
                        height: 24,
                        borderRadius: 12,
                        border: 'none',
                        background: 'rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        overflow: 'hidden',
                        zIndex: 100,
                        willChange: 'opacity, width',
                        WebkitBackfaceVisibility: 'hidden',
                        backfaceVisibility: 'hidden',
                        transform: 'translateZ(0)'
                      }}
                    >
                      {spotifyTrack?.state === 'playing' ? <Pause size={15} color="#FFFFFF" fill="#FFFFFF" /> : <Play size={15} color="#FFFFFF" fill="#FFFFFF" />}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={keyLockAlert ? "keylock" : usbAlert ? "usb" : chargingAlert ? "charging" : alert ? "battery" : bluetoothAlert ? "bluetooth" : cameraAlert ? "camera" : microphoneAlert ? "microphone" : (isTimerRunning || timerSeconds > 0) ? "timer" : "time"}
              initial={{ opacity: 0, filter: 'blur(4px)', scale: 0.98 }}
              animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
              exit={{ opacity: 0, filter: 'blur(4px)', scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1], filter: { duration: 0.05 } }}
              style={{ width: '100%', height: '100%', position: 'relative' }}
            >
              <h1
                className="text"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "18px",
                  transform: "translateY(-50%)",
                  fontSize: 16,
                  fontWeight: 600,
                  margin: 0,
                  color: keyLockAlert ? "#4cc9f0ff" : usbAlert ? (usbAlert.action === "connected" ? "#34c759ff" : "#ff9500ff") : chargingAlert ? "#6fff7bff" : alert ? "#ff3f3fff" : cameraAlert ? "#ffff00ff" : microphoneAlert ? "#ff9a00ff" : (isTimerRunning || timerSeconds > 0) ? "#ff9500" : textColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  lineHeight: 1
                }}
              >
                {keyLockAlert ? (
                  <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'monospace' }}>{keyLockAlert.key === 'CapsLock' ? 'A' : '#'}</span>
                ) : usbAlert ? (
                  <Usb size={20} color={usbAlert.action === "connected" ? "#34c759" : "#ff9500"} />
                ) : chargingAlert ? (
                  <Zap size={20} color="#6fff7b" />
                ) : alert ? (
                  <Zap size={20} color="#ff3f3f" />
                ) : cameraAlert ? (
                  <Camera size={20} color="#ffff00" />
                ) : microphoneAlert ? (
                  <Mic size={20} color="#ff9a00" />
                ) : volumeAlert ? (
                  volumeLevel === 0 ? <VolumeX size={20} color="#ff4d4d" /> : <Volume2 size={20} color="#4cc9f0" />
                ) : bluetoothAlert ? <Headphones size={20} /> : (isTimerRunning || timerSeconds > 0) ? (
                  <TimerCircleProgress progress={timerTotalDuration > 0 ? (timerSeconds / timerTotalDuration) : 0} size={18} strokeWidth={2.5} />
                ) : time}
              </h1>
              <h1
                className="text"
                style={{
                  position: "absolute",
                  top: "50%",
                  right: "18px",
                  transform: "translateY(-50%)",
                  fontSize: 14,
                  fontWeight: 600,
                  margin: 0,
                  maxWidth: '175px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: keyLockAlert
                    ? "#4cc9f0ff"
                    : usbAlert
                      ? (usbAlert.action === "connected" ? "#34c759ff" : "#ff9500ff")
                      : chargingAlert
                        ? "#6fff7bff"
                        : alert
                          ? "#ff3f3fff"
                          : cameraAlert
                            ? "#ffff00ff"
                            : microphoneAlert
                              ? "#ff9a00ff"
                              : volumeAlert
                                ? "#4cc9f0ff"
                                : (isTimerRunning || timerSeconds > 0)
                                  ? "#ff9500"
                                  : `${textColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end'
                }}
              >
                {keyLockAlert ? `${keyLockAlert.key === 'CapsLock' ? 'Caps Lock' : 'Num Lock'} ${keyLockAlert.state ? 'ON' : 'OFF'}` : usbAlert ? `${usbAlert.name} ${usbAlert.action}` : alert === true ? (percent !== null ? `${percent}%` : '--') : chargingAlert === true ? (percent !== null ? `${percent}%` : '--') : standbyBorderEnabled ? (percent !== null ? `${percent}%` : '--') : cameraAlert ? "Camera" : microphoneAlert ? "Microphone" : volumeAlert ? `${volumeLevel}%` : bluetoothAlert ? cleanBluetoothDeviceName(bluetooth.devices?.[0]) : (isTimerRunning || timerSeconds > 0) ? (
                  <span>{formatTimerMMSS(timerSeconds)}</span>
                ) : (typeof weather.temp === "number" && !isNaN(weather.temp)) ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <WeatherIcon status={weather.status} size={14} color={textColor} />
                    <span>{weather.temp}º</span>
                  </div>
                ) : (percent !== null ? `${percent}%` : '--')}
              </h1>
            </motion.div>
          )
          }
        </AnimatePresence >
      ) : null}

      <AnimatePresence custom={direction} mode="popLayout">
        {mode === "large" && (
          <motion.div
            key={currentTabId}
            custom={direction}
            variants={tabVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 400, damping: 40 },
              opacity: { duration: 0.15 }
            }}
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "absolute",
              overflow: "hidden",
              borderBottomLeftRadius: mode === "large" ? 26 : 20,
              borderBottomRightRadius: mode === "large" ? 26 : 20
            }}
          >
            {/*Browser Search*/}
            {currentTab === 0 && (
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <input
                  id="browser-searchbar"
                  placeholder="Search google or enter URL"
                  value={browserSearch}
                  onChange={(e) => setBrowserSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      searchBrowser();
                    }
                  }}
                  style={{ color: textColor }}
                />
              </div>
            )}

            {/* Weather Dashboard (Redesigned per Image 2: 3D Animated Icons, Sky Glass Layout & 3-Day Forecast) */}
            {currentTab === 1 && (() => {
              const locName = localStorage.getItem("location") || weatherLocation || "CHATTOGRAM";
              const tempVal = typeof weather.temp === "number" && !isNaN(weather.temp) ? weather.temp : 28;
              const statusStr = weather.status || "Partly Sunny";
              const humidityVal = weather.humidity || "65%";
              const windVal = weather.wind || "12 km/h";
              const precipVal = "2 mm";

              return (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  boxSizing: 'border-box',
                  gap: 16,
                  userSelect: 'none'
                }}>
                  {/* Left Column: 3D Weather Icon + Location + Temp & Condition */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 175, flexShrink: 0 }}>
                    <Animated3DWeatherIcon status={statusStr} size={42} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'OpenRunde, system-ui, sans-serif' }}>
                        {locName}
                      </span>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', fontFamily: 'OpenRunde, system-ui, sans-serif', lineHeight: 1.1 }}>
                        {tempVal}°{weatherUnit === 'f' ? 'F' : 'C'}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255, 255, 255, 0.75)', fontFamily: 'OpenRunde, system-ui, sans-serif', marginTop: 2 }}>
                        {statusStr}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Stats Row + 3-Day Forecast Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0, height: '100%', justifyContent: 'center' }}>
                    {/* Middle Stats Row: Humidity | Precip | Wind */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, width: '100%' }}>
                      <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '3px 2px' }}>
                        <span style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>Hum</span>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', marginTop: 1 }}>{humidityVal}</div>
                      </div>
                      <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '3px 2px' }}>
                        <span style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>Precip</span>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', marginTop: 1 }}>{precipVal}</div>
                      </div>
                      <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '3px 2px' }}>
                        <span style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>Wind</span>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', marginTop: 1 }}>{windVal}</div>
                      </div>
                    </div>

                    {/* Bottom Row: 3-Day Forecast Glass Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, width: '100%' }}>
                      {[
                        { day: 'Today', icon: 'Partly Sunny', hi: `${tempVal}°`, lo: `${tempVal - 6}°`, rain: '5%' },
                        { day: 'Tomorrow', icon: 'Partly Cloudy', hi: `${tempVal - 2}°`, lo: `${tempVal - 8}°`, rain: '15%' },
                        { day: 'Wed', icon: 'Rain', hi: `${tempVal - 4}°`, lo: `${tempVal - 9}°`, rain: '80%' }
                      ].map((fc) => (
                        <motion.div
                          key={fc.day}
                          whileHover={{ y: -2, scale: 1.02 }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: 10,
                            padding: '4px 2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-around',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
                          }}
                        >
                          <span style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255, 255, 255, 0.75)' }}>{fc.day}</span>
                          <Animated3DWeatherIcon status={fc.icon} size={16} />
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: '#ffffff' }}>{fc.hi}</span>
                          <span style={{ fontSize: 9, fontWeight: 600, color: '#4fc3f7' }}>{fc.rain}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* Overview / StandBy Clock & Daily Quote Tab */}
            {currentTab === 2 && (() => {
              const d = new Date();
              let h = d.getHours();
              if (hourFormat) {
                h = h % 12;
                h = h ? h : 12;
              }
              const hStr = hourFormat ? String(h) : String(h).padStart(2, '0');
              const mStr = String(d.getMinutes()).padStart(2, '0');
              const dayAbbr = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
              const dayNum = d.getDate();
              const tempVal = typeof weather?.temp === "number" && !isNaN(weather.temp) ? weather.temp : 58;
              const currentQuote = DAILY_QUOTES[dailyQuoteIndex % DAILY_QUOTES.length];

              return (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  boxSizing: 'border-box',
                  gap: 16,
                  userSelect: 'none'
                }}>
                  {/* Left: iOS StandBy Style Clock (Scaled to 80% height) */}
                  <div style={{
                    height: '82%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexShrink: 0
                  }}>
                    {/* Big Bold Rounded Time Digits - 80% Notch Height */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontFamily: 'OpenRunde, -apple-system, system-ui, sans-serif',
                      fontSize: 96,
                      fontWeight: 800,
                      letterSpacing: '-4px',
                      lineHeight: 0.9,
                      color: '#6ea8fe',
                      userSelect: 'none'
                    }}>
                      <span>{hStr}</span>
                      {/* Round Colon Dots */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 14,
                        margin: '0 6px'
                      }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#6ea8fe' }} />
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#6ea8fe' }} />
                      </div>
                      <span>{mStr}</span>
                    </div>

                    {/* Day/Date & Temp Stack (e.g. TUE 6 / 58°) */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: 4,
                      fontFamily: 'OpenRunde, -apple-system, system-ui, sans-serif',
                      marginLeft: 2
                    }}>
                      <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.4px', lineHeight: 1.1 }}>
                        <span style={{ color: '#6ea8fe' }}>{dayAbbr} </span>
                        <span style={{ color: '#ffffff' }}>{dayNum}</span>
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.4px', lineHeight: 1.1, marginTop: 1 }}>
                        {tempVal}°
                      </div>
                    </div>
                  </div>

                  {/* Vertical Subtle Separator */}
                  <div style={{
                    width: 1,
                    height: '65%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    flexShrink: 0
                  }} />

                  {/* Right: Realigned Minimalist Quote & Quoteman's Pic (No headers/buttons) */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleNextQuote}
                    title="Click to cycle quote"
                    style={{
                      flex: 1,
                      height: '100%',
                      minWidth: 0,
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.09)',
                      borderRadius: 14,
                      padding: '10px 14px',
                      boxSizing: 'border-box',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      position: 'relative',
                      backdropFilter: 'blur(16px)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                      cursor: 'pointer',
                      overflow: 'hidden'
                    }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentQuote.author + currentQuote.quote}
                        initial={{ opacity: 0, x: 6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          width: '100%',
                          height: '100%'
                        }}
                      >
                        {/* Quoteman's Pic Avatar */}
                        <QuotemanAvatar quote={currentQuote} size={50} />

                        {/* Quote & Author Details */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          flex: 1,
                          minWidth: 0
                        }}>
                          <p style={{
                            margin: 0,
                            fontSize: 11.5,
                            lineHeight: 1.35,
                            color: 'rgba(255, 255, 255, 0.95)',
                            fontStyle: 'italic',
                            fontWeight: 500,
                            fontFamily: 'OpenRunde, system-ui, sans-serif',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            “{currentQuote.quote}”
                          </p>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            marginTop: 5,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#6ea8fe',
                              fontFamily: 'OpenRunde, system-ui, sans-serif'
                            }}>
                              — {currentQuote.author}
                            </span>
                            <span style={{
                              fontSize: 9.5,
                              fontWeight: 500,
                              color: 'rgba(255, 255, 255, 0.45)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              • {currentQuote.title}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                </div>
              );
            })()}

            {/* Battery Hub Screen (Apple Dynamic Island Design) */}
            {currentTab === 11 && (() => {
              const statusColor = batteryAnalytics.currentPercent <= 10
                ? '#FF453A'
                : (batteryAnalytics.currentPercent <= 20 ? '#FFD60A' : '#30D158');

              return (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 22px',
                  boxSizing: 'border-box',
                  gap: 18,
                  userSelect: 'none'
                }}>
                  {/* Left Column: Apple Battery Graphic & Clean Status Caption */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: 190,
                    flexShrink: 0
                  }}>
                    <AppleBatteryCapsule
                      percent={batteryAnalytics.currentPercent}
                      charging={batteryAnalytics.isCharging}
                      width={168}
                      height={66}
                    />

                    {/* Apple Status Caption */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'rgba(235, 235, 245, 0.65)',
                      fontFamily: 'OpenRunde, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
                    }}>
                      {batteryAnalytics.isCharging ? (
                        <>
                          <Zap size={12} color="#30D158" fill="#30D158" />
                          <span>Charging • AC Power</span>
                        </>
                      ) : (
                        <>
                          <div style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: statusColor
                          }} />
                          <span>{batteryAnalytics.currentPercent <= 20 ? 'Low Power Mode' : 'On Battery Power'}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Vertical Hairline Divider */}
                  <div style={{
                    width: 1,
                    height: '70%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    flexShrink: 0
                  }} />

                  {/* Right Column: Apple-style Estimated Runtime & Usage */}
                  <div style={{
                    flex: 1,
                    height: '100%',
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '3px 0'
                  }}>
                    {/* Header Row: Label & Power Mode */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        color: 'rgba(235, 235, 245, 0.5)',
                        textTransform: 'uppercase',
                        fontFamily: 'OpenRunde, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
                      }}>
                        {batteryAnalytics.isCharging ? 'Time Until Full' : 'Estimated Remaining'}
                      </span>

                      <span style={{
                        fontSize: 10.5,
                        fontWeight: 500,
                        color: 'rgba(235, 235, 245, 0.6)',
                        background: 'rgba(255, 255, 255, 0.08)',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontFamily: 'OpenRunde, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
                      }}>
                        {batteryAnalytics.powerModeTag}
                      </span>
                    </div>

                    {/* Hero Runtime Display */}
                    <div style={{ marginTop: 1 }}>
                      <div style={{
                        fontFamily: 'OpenRunde, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                        fontSize: 32,
                        fontWeight: 700,
                        color: '#ffffff',
                        letterSpacing: '-0.8px',
                        lineHeight: 1
                      }}>
                        {batteryAnalytics.timeRemainingStr}
                      </div>
                      <div style={{
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: batteryAnalytics.isCharging ? '#30D158' : 'rgba(235, 235, 245, 0.65)',
                        fontFamily: 'OpenRunde, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                        marginTop: 4
                      }}>
                        {batteryAnalytics.endTargetTimeStr}
                      </div>
                    </div>

                    {/* Apple-style Activity Level & Pace Card */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 10,
                      padding: '6px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }}>
                      {/* Recent Activity Bar Graph */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 16 }}>
                          {batteryAnalytics.activityBars.map((bar, i) => (
                            <div
                              key={i}
                              style={{
                                width: 3.5,
                                height: `${bar.height}%`,
                                minHeight: 4,
                                borderRadius: 2,
                                backgroundColor: bar.isCurrent
                                  ? (batteryAnalytics.currentPercent <= 10
                                      ? '#FF453A'
                                      : (batteryAnalytics.currentPercent <= 20 ? '#FFD60A' : '#30D158'))
                                  : 'rgba(255, 255, 255, 0.22)',
                                transition: 'height 0.3s ease'
                              }}
                            />
                          ))}
                        </div>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: 'rgba(235, 235, 245, 0.6)',
                          fontFamily: 'OpenRunde, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
                        }}>
                          Recent Activity
                        </span>
                      </div>

                      {/* Average Pace */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: 'rgba(235, 235, 245, 0.5)',
                          fontFamily: 'OpenRunde, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
                        }}>
                          {batteryAnalytics.isCharging ? 'Charge Pace' : 'Discharge'}
                        </span>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: batteryAnalytics.isCharging ? '#30D158' : '#ffffff',
                          fontFamily: 'OpenRunde, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
                        }}>
                          {batteryAnalytics.rateText}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Now Playing*/}
            {currentTab === 3 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                height: '100%',
                userSelect: 'none'
              }}>
                <AnimatePresence mode="wait">
                  {spotifyTrack ? (
                    <motion.div
                      key={spotifyTrack.name + spotifyTrack.artist}
                      initial={{ opacity: 0, filter: 'blur(10px)', scale: 0.95 }}
                      animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                      exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.95 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        borderRadius: 24
                      }}
                    >
                      {/* Full-bleed background album art */}
                      {spotifyTrack.artwork_url && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                            backgroundImage: `url("${spotifyTrack.artwork_url}")`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            filter: 'brightness(0.65)',
                            borderRadius: 'inherit',
                            zIndex: 0
                          }}
                        />
                      )}

                      {/* Vignette gradient dark overlay */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.25) 100%), linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 70%)',
                          borderRadius: 'inherit',
                          zIndex: 1
                        }}
                      />

                      {/* Content Layer */}
                      <div style={{
                        position: 'relative',
                        zIndex: 2,
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        height: '100%',
                        width: '100%',
                        gap: 16,
                        padding: '4px 8px',
                        boxSizing: 'border-box'
                      }}>
                        {/* Left: Album Artwork Card Thumbnail */}
                        {spotifyTrack.artwork_url && (
                          <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: 14,
                            overflow: 'hidden',
                            flexShrink: 0,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                            position: 'relative'
                          }}>
                            <img
                              src={spotifyTrack.artwork_url}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {/* App badge at bottom-right corner */}
                            <div style={{
                              position: 'absolute',
                              bottom: 4,
                              right: 4,
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              backgroundColor: 'rgba(0,0,0,0.7)',
                              backdropFilter: 'blur(4px)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Music size={11} color="#ffffff" />
                            </div>
                          </div>
                        )}

                        {/* Right: Metadata + Controls Column */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          flex: 1,
                          minWidth: 0,
                          height: 80
                        }}>
                          {/* Title & Artist */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>
                              <Music size={12} color="rgba(255,255,255,0.75)" />
                              <span>{cleanAppName(spotifyTrack?.source)}</span>
                            </div>
                            <ScrollingTitle text={spotifyTrack.name || "Unknown Title"} fontSize={14} />
                            <p
                              style={{
                                margin: 0,
                                fontSize: 12,
                                fontWeight: 400,
                                color: 'rgba(255,255,255,0.65)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '360px',
                                fontFamily: 'OpenRunde, system-ui, sans-serif'
                              }}
                            >
                              {spotifyTrack.artist || "Unknown Artist"}
                            </p>
                          </div>

                          {/* Row: Scrubber + Controls */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <WaveformScrubber
                                position={mediaPosition}
                                duration={spotifyTrack.duration || 0}
                                isPlaying={spotifyTrack.state === 'playing'}
                                onSeek={(sec) => {
                                  setMediaPosition(sec);
                                  if (window.electronAPI?.controlSystemMedia) {
                                    window.electronAPI.controlSystemMedia('seek', sec);
                                  }
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              <button
                                className="media-btn"
                                onClick={() => {
                                  lastMediaActionRef.current = Date.now();
                                  if (window.electronAPI?.controlSystemMedia) {
                                    window.electronAPI.controlSystemMedia('previous');
                                  }
                                }}
                                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.9, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Previous Track"
                                aria-label="Previous Track"
                              >
                                <SkipBackIcon size={18} color="#ffffff" fill="#ffffff" />
                              </button>
                              <button
                                className="media-btn"
                                onClick={() => {
                                  lastMediaActionRef.current = Date.now();
                                  setSpotifyTrack((prev) => prev ? { ...prev, state: prev.state === 'playing' ? 'paused' : 'playing' } : null);
                                  if (window.electronAPI?.controlSystemMedia) {
                                    window.electronAPI.controlSystemMedia('playpause');
                                  }
                                }}
                                style={{
                                  background: 'rgba(255,255,255,0.2)',
                                  backdropFilter: 'blur(8px)',
                                  border: '1px solid rgba(255,255,255,0.25)',
                                  borderRadius: '50%',
                                  width: 32,
                                  height: 32,
                                  color: '#ffffff',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 2px 10px rgba(0,0,0,0.35)'
                                }}
                                title={spotifyTrack.state === 'playing' ? "Pause" : "Play"}
                                aria-label={spotifyTrack.state === 'playing' ? "Pause" : "Play"}
                              >
                                {spotifyTrack.state === 'playing' ? <Pause size={16} color="#ffffff" fill="#ffffff" /> : <Play size={16} color="#ffffff" fill="#ffffff" />}
                              </button>
                              <button
                                className="media-btn"
                                onClick={() => {
                                  lastMediaActionRef.current = Date.now();
                                  if (window.electronAPI?.controlSystemMedia) {
                                    window.electronAPI.controlSystemMedia('next');
                                  }
                                }}
                                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.9, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Next Track"
                                aria-label="Next Track"
                              >
                                <SkipForwardIcon size={18} color="#ffffff" fill="#ffffff" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="nothing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        color: textColor,
                        fontFamily: theme === "win95" ? "w95" : "OpenRunde"
                      }}
                    >
                      <h3 style={{ margin: 0, fontSize: 16 }}>Nothing Playing</h3>
                      <p style={{ margin: '5px 0 0 0', opacity: 0.7, fontSize: 13 }}>Play music on Spotify or Apple Music</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Calendar Tab */}
            {currentTab === 4 && (() => {
              const today = new Date();
              const selectedYear = calendarDate.getFullYear();
              const selectedMonth = calendarDate.getMonth();
              const monthNameUpper = calendarDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
              const todayWeekdayFull = today.toLocaleDateString('en-US', { weekday: 'long' });
              const days = getCalendarDays(selectedYear, selectedMonth);

              return (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 16px',
                    boxSizing: 'border-box',
                    gap: 16,
                    userSelect: 'none'
                  }}
                >
                  {/* Left Column: Hero Date Card */}
                  <div
                    style={{
                      width: 105,
                      height: '100%',
                      background: '#1b1b1f',
                      borderRadius: 14,
                      border: '1.5px solid #2c2c34',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                      padding: '6px 8px',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexShrink: 0
                    }}
                  >
                    {/* Month & Year */}
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: '#ff3b30',
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          fontFamily: 'OpenRunde, system-ui, sans-serif'
                        }}
                      >
                        {monthNameUpper}
                      </div>
                      <div
                        style={{
                          fontSize: 9.5,
                          fontWeight: 600,
                          color: 'rgba(255,255,255,0.45)',
                          marginTop: 1,
                          fontFamily: 'OpenRunde, system-ui, sans-serif'
                        }}
                      >
                        {selectedYear}
                      </div>
                    </div>

                    {/* Giant Day Number */}
                    <div
                      style={{
                        fontSize: 38,
                        fontWeight: 800,
                        color: '#ffffff',
                        fontFamily: 'OpenRunde, system-ui, sans-serif',
                        letterSpacing: '-1.5px',
                        lineHeight: 1
                      }}
                    >
                      {today.getDate()}
                    </div>

                    {/* Full Weekday Name */}
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.65)',
                        fontFamily: 'OpenRunde, system-ui, sans-serif'
                      }}
                    >
                      {todayWeekdayFull}
                    </div>
                  </div>

                  {/* Right Column: Month Grid */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minWidth: 0 }}>
                    {/* Calendar Month Nav Controls (Compact) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                      <button
                        onClick={() => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 1 }}
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontFamily: 'OpenRunde, system-ui, sans-serif' }}>
                        {calendarDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                      </span>
                      <button
                        onClick={() => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 1 }}
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>

                    {/* Weekday Header (S M T W T F S) - Red for S & S */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, textAlign: 'center' }}>
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
                        const isWeekend = idx === 0 || idx === 6;
                        return (
                          <div
                            key={`cal-h-${idx}`}
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: isWeekend ? '#ff3b30' : 'rgba(255,255,255,0.6)',
                              fontFamily: 'OpenRunde, system-ui, sans-serif'
                            }}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>

                    {/* Date Days Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', textAlign: 'center' }}>
                      {days.map((item, idx) => {
                        const col = idx % 7;
                        const isWeekend = col === 0 || col === 6;
                        const isToday = item.isCurrentMonth &&
                          item.day === today.getDate() &&
                          selectedMonth === today.getMonth() &&
                          selectedYear === today.getFullYear();

                        let dayCellColor = isWeekend ? '#ff3b30' : '#ffffff';
                        if (!item.isCurrentMonth) {
                          dayCellColor = isWeekend ? 'rgba(255, 59, 48, 0.3)' : 'rgba(255, 255, 255, 0.25)';
                        }

                        return (
                          <div
                            key={`cal-d-${idx}`}
                            style={{
                              height: 13,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 9.5,
                              fontWeight: isToday ? 800 : 600,
                              fontFamily: 'OpenRunde, system-ui, sans-serif',
                              color: isToday ? '#ffffff' : dayCellColor
                            }}
                          >
                            {isToday ? (
                              <div
                                style={{
                                  width: 15,
                                  height: 15,
                                  borderRadius: '50%',
                                  background: '#c42b27',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff',
                                  boxShadow: '0 2px 6px rgba(196, 43, 39, 0.6)',
                                  fontSize: 9
                                }}
                              >
                                {item.day}
                              </div>
                            ) : (
                              item.day
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Notifications Tab */}
            {currentTab === 5 && (
              <div className="notifications-container">
                {notificationsList.length === 0 ? (
                  <div style={{ textAlign: 'center', opacity: 0.5, marginTop: 40, fontSize: 13 }}>
                    <Bell size={24} style={{ marginBottom: 6, opacity: 0.7 }} />
                    <p style={{ margin: 0 }}>No new notifications</p>
                  </div>
                ) : (
                  notificationsList.map((notif, idx) => (
                    <div
                      key={notif.id || `notif-${idx}`}
                      className="notification-card"
                      onClick={() => {
                        if (notif.appId && window.electronAPI?.focusNotificationApp) {
                          window.electronAPI.focusNotificationApp(notif.appId);
                        }
                      }}
                      style={{ cursor: notif.appId ? 'pointer' : 'default' }}
                    >
                      {notif.icon ? (
                        <img src={notif.icon} className="notification-icon" alt="" />
                      ) : (
                        <div className="notification-icon" style={{ backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Bell size={14} />
                        </div>
                      )}
                      <div className="notification-content">
                        {notif.appName && (
                          <span className="notification-app-name">{notif.appName}</span>
                        )}
                        <span className="notification-title">{notif.title}</span>
                        <span className="notification-body">{notif.body}</span>
                      </div>
                      <button
                        className="notification-dismiss"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (notif.id && window.electronAPI?.dismissNotification) {
                            window.electronAPI.dismissNotification(notif.id);
                          }
                          setNotificationsList(prev => prev.filter((_, i) => i !== idx));
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Game / System Performance Overlay Tab */}
            {currentTab === 6 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                width: '100%',
                height: '100%',
                padding: '12px 18px',
                boxSizing: 'border-box',
                userSelect: 'none'
              }}>
                {/* CPU Card */}
                <div style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 14,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>CPU LOAD</span>
                    <Activity size={14} color="#0070f3" />
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', fontFamily: 'OpenRunde, system-ui, sans-serif' }}>
                    {systemStats.cpu}%
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${systemStats.cpu}%`, height: '100%', background: '#0070f3', borderRadius: 3, transition: 'width 0.4s ease' }} />
                  </div>
                </div>

                {/* Memory Card */}
                <div style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 14,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>MEMORY</span>
                    <Zap size={14} color="#a855f7" />
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', fontFamily: 'OpenRunde, system-ui, sans-serif' }}>
                    {systemStats.ram}%
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${systemStats.ram}%`, height: '100%', background: '#a855f7', borderRadius: 3, transition: 'width 0.4s ease' }} />
                  </div>
                </div>

                {/* Battery Card */}
                <div style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 14,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' }}>BATTERY</span>
                    <Sun size={14} color={(percent || 0) <= 20 ? '#ff3b30' : '#34c759'} />
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', fontFamily: 'OpenRunde, system-ui, sans-serif' }}>
                    {percent !== null ? `${percent}%` : 'N/A'}
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${percent || 0}%`, height: '100%', background: (percent || 0) <= 20 ? '#ff3b30' : '#34c759', borderRadius: 3, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              </div>
            )}

            {/*Clipboard*/}
            {currentTab === 7 && (
              <div id="clipboard" style={{ animation: 'none' }}>
                {clipboard.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, width: '100%' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Clipboard History ({clipboard.length})
                    </span>
                    <button
                      onClick={clearAllClipboard}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: textColor,
                        opacity: 0.5,
                        fontSize: 11,
                        cursor: 'pointer',
                        padding: 0
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                    >
                      Clear All
                    </button>
                  </div>
                )}
                {clipboard.length === 0 ? (
                  <p style={{ opacity: 0.5, textAlign: 'center', marginTop: 30, color: textColor }}>Clipboard is empty</p>
                ) : (
                  clipboard.map((item, index) => (
                    <div className="clipboard-row" key={index}>
                      <p className="clipboard-content" style={{ paddingRight: '55px', color: textColor }}>{item}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(item);
                          const btn = e.currentTarget;
                          btn.innerText = "Copied!";
                          btn.style.backgroundColor = 'rgba(52, 199, 89, 0.4)';
                          setTimeout(() => {
                            btn.innerText = "Copy";
                            btn.style.backgroundColor = `color-mix(in srgb, ${textColor}, transparent 85%)`;
                          }, 1500);
                        }}
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          zIndex: 10,
                          backgroundColor: `color-mix(in srgb, ${textColor}, transparent 85%)`,
                          border: `1px solid color-mix(in srgb, ${textColor}, transparent 75%)`,
                          borderRadius: '6px',
                          color: textColor,
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '4px 9px',
                          cursor: 'pointer',
                          backdropFilter: 'blur(4px)'
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Minimalist Apple Reminders Horizontal Tasks UI */}
            {currentTab === 8 && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  boxSizing: 'border-box',
                  gap: 16,
                  userSelect: 'none'
                }}
              >
                {/* Left Column: List Header + Quick Add Input Card */}
                <div
                  style={{
                    width: 165,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    flexShrink: 0
                  }}
                >
                  {/* Top Header Card */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 12,
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          background: '#ff9500',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff'
                        }}>
                          <Check size={13} strokeWidth={2.5} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: textColor, fontFamily: 'OpenRunde, system-ui, sans-serif' }}>
                          Reminders
                        </span>
                      </div>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: 10,
                        background: tasks.length > 0 ? 'rgba(255, 149, 0, 0.2)' : 'rgba(52, 199, 89, 0.2)',
                        color: tasks.length > 0 ? '#ff9500' : '#34c759'
                      }}>
                        {tasks.length}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>
                      {tasks.length === 0 ? "All tasks completed" : `${tasks.length} task${tasks.length === 1 ? '' : 's'} remaining`}
                    </span>
                  </div>

                  {/* Bottom Quick Add Capsule */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 10,
                      padding: '2px 3px 2px 10px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <input
                      type="text"
                      placeholder="New task..."
                      value={taskText}
                      onChange={(e) => setTaskText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addTask();
                      }}
                      style={{
                        flex: 1,
                        height: 28,
                        background: 'none',
                        color: textColor,
                        border: 'none',
                        fontSize: 11.5,
                        fontWeight: 400,
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'OpenRunde, system-ui, sans-serif'
                      }}
                    />

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => addTask()}
                      style={{
                        height: 24,
                        padding: '0 8px',
                        background: '#ff9500',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 7,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: 'OpenRunde, system-ui, sans-serif',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      Add
                    </motion.button>
                  </div>
                </div>

                {/* Right Column: Scrollable Task List or Clean Empty State */}
                <div
                  style={{
                    flex: 1,
                    height: '100%',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    minWidth: 0,
                    paddingRight: 2
                  }}
                >
                  <AnimatePresence mode="popLayout">
                    {tasks.length === 0 ? (
                      <motion.div
                        key="empty-tasks"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: textColor,
                          userSelect: 'none'
                        }}
                      >
                        <CheckCircle2 size={26} color="#34c759" style={{ opacity: 0.85, marginBottom: 4 }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>No pending tasks</span>
                        <span style={{ fontSize: 10.5, color: 'rgba(255, 255, 255, 0.45)', marginTop: 2 }}>You're all caught up!</span>
                      </motion.div>
                    ) : (
                      tasks.map((task, index) => (
                        <motion.div
                          key={`task-${task}-${index}`}
                          initial={{ opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 10, height: 0, marginBottom: 0, padding: 0 }}
                          transition={{ duration: 0.15 }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            padding: '6px 10px',
                            borderRadius: 10,
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                            boxSizing: 'border-box'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                            {/* Minimal Circular Check Button */}
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => removeTask(index)}
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                border: '1.5px solid rgba(255, 255, 255, 0.35)',
                                background: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                flexShrink: 0,
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#34c759';
                                e.currentTarget.style.background = 'rgba(52, 199, 89, 0.2)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                                e.currentTarget.style.background = 'none';
                              }}
                              title="Mark as completed"
                            />

                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: textColor,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontFamily: 'OpenRunde, system-ui, sans-serif'
                              }}
                            >
                              {task}
                            </span>
                          </div>

                          <motion.button
                            whileHover={{ opacity: 1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeTask(index)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: textColor,
                              opacity: 0.3,
                              cursor: 'pointer',
                              padding: 2,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 4
                            }}
                            title="Delete task"
                          >
                            <Trash2 size={13} color={textColor} />
                          </motion.button>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Timer Tab (Stopwatch Removed, Modern States & Dynamic Island Styling) */}
            {currentTab === 10 && (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 18px',
                boxSizing: 'border-box',
                userSelect: 'none'
              }}>
                {!isTimerRunning && timerSeconds === 0 ? (
                  /* STATE 1: Select Timer Setup Screen (Image 2) */
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    {/* Title Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 0 }}>
                      <AlarmClock size={14} color="#ffffff" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', fontFamily: 'OpenRunde, system-ui, sans-serif' }}>
                        Select Timer
                      </span>
                    </div>

                    {/* Preset Chips Row: 15m, 30m, 60m, 100m */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, width: '100%' }}>
                      {[
                        { label: '15m', sec: 900 },
                        { label: '30m', sec: 1800 },
                        { label: '60m', sec: 3600 },
                        { label: '100m', sec: 6000 }
                      ].map((preset) => (
                        <motion.button
                          key={preset.label}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setTimerTotalDuration(preset.sec);
                            setTimerSeconds(preset.sec);
                            setIsTimerRunning(true);
                          }}
                          style={{
                            background: '#222227',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 10,
                            height: 32,
                            color: '#ffffff',
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: 'OpenRunde, system-ui, sans-serif',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                          }}
                        >
                          {preset.label}
                        </motion.button>
                      ))}
                    </div>

                    {/* Bottom Row: Custom Time Picker (-) 05:00 (+) & Vibrant Orange START Button */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', marginBottom: 0 }}>
                      {/* Left: Custom Time Picker Pill */}
                      <div style={{
                        background: '#222227',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10,
                        height: 34,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 12px',
                        boxSizing: 'border-box',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                      }}>
                        <button
                          onClick={() => setCustomTimerSetup(prev => Math.max(60, prev - 60))}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: 700, cursor: 'pointer', padding: '0 2px' }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#ffffff', fontFamily: 'OpenRunde, system-ui, sans-serif' }}>
                          {formatTimerMMSS(customTimerSetup)}
                        </span>
                        <button
                          onClick={() => setCustomTimerSetup(prev => prev + 60)}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: 700, cursor: 'pointer', padding: '0 2px' }}
                        >
                          +
                        </button>
                      </div>

                      {/* Right: Big Orange START Button */}
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setTimerTotalDuration(customTimerSetup);
                          setTimerSeconds(customTimerSetup);
                          setIsTimerRunning(true);
                        }}
                        style={{
                          background: '#ff9500',
                          border: 'none',
                          borderRadius: 10,
                          height: 34,
                          color: '#ffffff',
                          fontSize: 12,
                          fontWeight: 800,
                          letterSpacing: '1px',
                          fontFamily: 'OpenRunde, system-ui, sans-serif',
                          cursor: 'pointer',
                          boxShadow: '0 4px 16px rgba(255, 149, 0, 0.45)',
                          textTransform: 'uppercase'
                        }}
                      >
                        START
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  /* STATE 2: Active / Running / Paused Timer Screen (Image 4) */
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
                    {/* Top Center: Bell / Total Duration Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.6 }}>
                      <BellOff size={12} color="#ffffff" />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#ffffff', fontFamily: 'OpenRunde, system-ui, sans-serif' }}>
                        {formatTimerMMSS(timerTotalDuration)}
                      </span>
                    </div>

                    {/* Center Section: Left Pause/Play | Center Giant Time | Right Cancel */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 8px' }}>
                      {/* Left: Glass Circle Pause/Play Button */}
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.15)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
                        }}
                      >
                        {isTimerRunning ? (
                          <Pause size={18} color="#ffffff" fill="#ffffff" />
                        ) : (
                          <Play size={18} color="#ffffff" fill="#ffffff" style={{ marginLeft: 2 }} />
                        )}
                      </motion.button>

                      {/* Center: Giant Countdown Display & Subtitle */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{
                          fontSize: 32,
                          fontWeight: 800,
                          color: '#ffffff',
                          fontFamily: 'OpenRunde, system-ui, sans-serif',
                          letterSpacing: '-1px',
                          lineHeight: 1
                        }}>
                          {formatTimerMMSS(timerSeconds)}
                        </div>
                        <div style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'rgba(255,255,255,0.5)',
                          fontFamily: 'OpenRunde, system-ui, sans-serif',
                          marginTop: 2
                        }}>
                          Timer
                        </div>
                      </div>

                      {/* Right: Red Circle Cancel/Reset Button */}
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => {
                          setIsTimerRunning(false);
                          setTimerSeconds(0);
                        }}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: 'rgba(255, 59, 48, 0.25)',
                          border: '1px solid rgba(255, 59, 48, 0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(255, 59, 48, 0.25)'
                        }}
                      >
                        <X size={18} color="#ff3b30" />
                      </motion.button>
                    </div>

                    {/* Bottom Spacer */}
                    <div style={{ height: 2 }} />
                  </div>
                )}
              </div>
            )}

            {/* Settings Overhaul - Apple macOS System Settings Architecture */}
            {currentTab === 9 && (() => {
              const categories = [
                { id: 'general', label: 'General', icon: SlidersHorizontal },
                { id: 'appearance', label: 'Appearance', icon: Palette },
                { id: 'position', label: 'Position', icon: Compass },
                { id: 'tabs', label: 'Tabs', icon: Layers },
                { id: 'features', label: 'Features', icon: Zap },
                { id: 'weather', label: 'Weather', icon: CloudSun },
                { id: 'updates', label: 'Updates', icon: RefreshCw, hasBadge: (updateStatus === 'available' || updateStatus === 'downloaded') }
              ];

              const appleSelectStyle = {
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: 8,
                padding: '4px 8px',
                color: '#ffffff',
                fontSize: 11.5,
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'OpenRunde, system-ui, sans-serif'
              };

              return (
                <div
                  id="settings-container"
                  ref={settingsContainerRef}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: '100%',
                    height: '100%',
                    padding: 0,
                    margin: 0,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    userSelect: 'none'
                  }}
                >
                  {/* Left Sidebar: Apple-style Category Navigation */}
                  <div style={{
                    width: 130,
                    height: '100%',
                    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(0, 0, 0, 0.22)',
                    padding: '10px 6px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    flexShrink: 0
                  }}>
                    {categories.map((cat) => {
                      const IconComp = cat.icon;
                      const isActive = settingsTab === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSettingsTab(cat.id);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '6px 8px',
                            borderRadius: 8,
                            background: isActive ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
                            border: 'none',
                            color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                            fontSize: 12,
                            fontWeight: isActive ? 700 : 500,
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            transition: 'all 0.15s ease',
                            fontFamily: 'OpenRunde, system-ui, sans-serif'
                          }}
                        >
                          <IconComp size={13} color={isActive ? '#0070f3' : 'currentColor'} />
                          <span style={{ flex: 1 }}>{cat.label}</span>
                          {cat.hasBadge && (
                            <span style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#34c759',
                              boxShadow: '0 0 6px #34c759'
                            }} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Content Area: Inset Grouped Settings Panel */}
                  <div style={{
                    flex: 1,
                    height: '100%',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: '10px 16px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}>
                    {/* CATEGORY: GENERAL */}
                    {settingsTab === 'general' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.75 }}>
                          General Preferences
                        </div>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 12,
                          overflow: 'hidden'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>12/24 Hour Format</span>
                            <AppleSegmented
                              value={hourFormat ? "12-hr" : "24-hr"}
                              options={[{ value: '12-hr', label: '12-Hour' }, { value: '24-hr', label: '24-Hour' }]}
                              onChange={(val) => handleHourFormatChange({ target: { value: val } })}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: displays.length > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Auto Launch on Boot</span>
                            <AppleSwitch
                              checked={autoLaunchEnabled}
                              onChange={(checked) => handleAutoLaunchChange({ target: { value: checked ? "true" : "false" } })}
                            />
                          </div>
                          {displays.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px' }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Target Display</span>
                              <select
                                value={currentDisplayId}
                                onChange={handleDisplayChange}
                                style={appleSelectStyle}
                              >
                                {displays.map(d => (
                                  <option key={d.id} value={d.id} style={{ background: '#1c1c1e', color: '#fff' }}>{d.label}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CATEGORY: APPEARANCE */}
                    {settingsTab === 'appearance' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.75 }}>
                          Appearance & Theme
                        </div>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 12,
                          overflow: 'hidden'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Theme</span>
                            <select
                              value={theme}
                              onChange={(e) => setTheme(e.target.value)}
                              style={appleSelectStyle}
                            >
                              <option value="none" style={{ background: '#1c1c1e', color: '#fff' }}>Default</option>
                              <option value="sleek-black" style={{ background: '#1c1c1e', color: '#fff' }}>Sleek Black</option>
                              <option value="win95" style={{ background: '#1c1c1e', color: '#fff' }}>Windows 95</option>
                            </select>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Island Border</span>
                            <AppleSwitch
                              checked={islandBorderEnabled}
                              onChange={(checked) => handleIslandBorderChange({ target: { value: checked ? "true" : "false" } })}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Hide When Inactive</span>
                            <AppleSwitch
                              checked={hideNotActiveIslandEnabled}
                              onChange={(checked) => handlehideNotActiveIslandChange({ target: { value: checked ? "true" : "false" } })}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 13, height: 13, borderRadius: '50%', background: bgColor, border: '1px solid rgba(255,255,255,0.2)' }} />
                              <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Island Color</span>
                            </div>
                            <input
                              className="select-input"
                              style={{ width: 85, padding: '3px 8px', fontSize: 11, background: 'rgba(255,255,255,0.08)', borderRadius: 6, color: textColor, border: '1px solid rgba(255,255,255,0.12)' }}
                              placeholder="#000000"
                              value={bgColor}
                              onChange={handleBgColorChange}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 13, height: 13, borderRadius: '50%', background: textColor, border: '1px solid rgba(255,255,255,0.2)' }} />
                              <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Text Color</span>
                            </div>
                            <input
                              className="select-input"
                              style={{ width: 85, padding: '3px 8px', fontSize: 11, background: 'rgba(255,255,255,0.08)', borderRadius: 6, color: textColor, border: '1px solid rgba(255,255,255,0.12)' }}
                              placeholder="#FAFAFA"
                              value={textColor}
                              onChange={handleTextColorChange}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '7px 12px' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Background Image URL</span>
                            <input
                              className="select-input"
                              style={{ width: '100%', padding: '4px 8px', fontSize: 11, background: 'rgba(255,255,255,0.08)', borderRadius: 6, color: textColor, border: '1px solid rgba(255,255,255,0.12)' }}
                              placeholder="https://..."
                              value={bgImage}
                              onChange={handleBgImageChange}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CATEGORY: POSITION */}
                    {settingsTab === 'position' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.75 }}>
                          Position & Placement
                        </div>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 12,
                          padding: '8px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, width: '100%' }}>
                            {[
                              { val: "top-left", label: "Top Left" },
                              { val: "top-center", label: "Top Center" },
                              { val: "top-right", label: "Top Right" },
                              { val: "bottom-left", label: "Bottom Left" },
                              { val: "bottom-center", label: "Bottom Center" },
                              { val: "bottom-right", label: "Bottom Right" }
                            ].map((pos) => {
                              const isSel = positionMode === pos.val;
                              return (
                                <button
                                  key={pos.val}
                                  type="button"
                                  onClick={() => {
                                    setPositionMode(pos.val);
                                    localStorage.setItem("position-mode", pos.val);
                                  }}
                                  style={{
                                    padding: '5px 6px',
                                    borderRadius: 7,
                                    background: isSel ? 'rgba(0, 112, 243, 0.35)' : 'rgba(255, 255, 255, 0.06)',
                                    border: isSel ? '1px solid rgba(0, 112, 243, 0.7)' : '1px solid rgba(255, 255, 255, 0.08)',
                                    color: isSel ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
                                    fontSize: 10.5,
                                    fontWeight: isSel ? 700 : 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  {pos.label}
                                </button>
                              );
                            })}
                          </div>

                          <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)' }} />

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Free (Manual) Position</span>
                            <AppleSwitch
                              checked={positionMode === "free"}
                              onChange={(checked) => {
                                const newMode = checked ? "free" : "top-center";
                                setPositionMode(newMode);
                                localStorage.setItem("position-mode", newMode);
                              }}
                            />
                          </div>

                          {positionMode === "free" && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontSize: 10.5, opacity: 0.75 }}>X ({islandX.toFixed(1)}%)</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={islandX}
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    updateDragging(true);
                                  }}
                                  onChange={handleIslandXChange}
                                  onPointerUp={(e) => {
                                    e.stopPropagation();
                                    savePosition();
                                    handleDragEndChecks(e);
                                    e.target.blur();
                                  }}
                                  style={{ flex: 1, accentColor: '#0070f3' }}
                                />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontSize: 10.5, opacity: 0.75 }}>Y ({islandY}px)</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="500"
                                  value={islandY}
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    updateDragging(true);
                                  }}
                                  onChange={handleIslandYChange}
                                  onPointerUp={(e) => {
                                    e.stopPropagation();
                                    savePosition();
                                    handleDragEndChecks(e);
                                    e.target.blur();
                                  }}
                                  style={{ flex: 1, accentColor: '#0070f3' }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CATEGORY: TABS */}
                    {settingsTab === 'tabs' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.75 }}>
                            Tab Management
                          </span>
                          <span style={{ fontSize: 9.5, opacity: 0.5 }}>Drag or use arrows</span>
                        </div>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 12,
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          {tabOrder.map((id, i) => {
                            const tabDef = TABS.find(t => t.id === id);
                            if (!tabDef) return null;
                            const isHidden = hiddenTabs.includes(id);
                            return (
                              <div
                                key={id}
                                className={`tab-order-item ${isHidden ? 'hidden' : ''}`}
                                style={{
                                  padding: '4px 8px',
                                  borderBottom: i < tabOrder.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                  cursor: 'grab'
                                }}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("text/plain", i);
                                  e.currentTarget.style.opacity = '0.4';
                                }}
                                onDragEnd={(e) => {
                                  e.currentTarget.style.opacity = isHidden ? '0.45' : '1';
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                }}
                                onDragLeave={(e) => {
                                  e.currentTarget.style.background = '';
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.currentTarget.style.background = '';
                                  const fromIdx = parseInt(e.dataTransfer.getData("text/plain"));
                                  moveTabOrder(fromIdx, i);
                                }}
                              >
                                <GripVertical size={13} style={{ opacity: 0.35, cursor: 'grab' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                                  {tabDef.icon(textColor)}
                                  <span style={{ fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {tabDef.name}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    className="tab-order-btn"
                                    onClick={() => {
                                      setDefaultTabId(id);
                                      localStorage.setItem("default-tab", id);
                                    }}
                                    title="Set as default"
                                    style={{ opacity: defaultTabId === id ? 1 : 0.3, color: defaultTabId === id ? '#FFD700' : textColor, padding: 2 }}
                                  >
                                    <Star size={13} fill={defaultTabId === id ? '#FFD700' : 'none'} />
                                  </button>
                                  <button
                                    type="button"
                                    className="tab-order-btn"
                                    onClick={() => toggleTabVisibility(id)}
                                    title={isHidden ? "Show" : "Hide"}
                                    style={{ opacity: isHidden ? 1 : 0.6, padding: 2 }}
                                  >
                                    {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className="tab-order-btn"
                                    disabled={i === 0}
                                    onClick={() => moveTabOrder(i, i - 1)}
                                    style={{ padding: 2 }}
                                  >
                                    <ChevronLeft size={13} style={{ transform: 'rotate(90deg)' }} />
                                  </button>
                                  <button
                                    type="button"
                                    className="tab-order-btn"
                                    disabled={i === tabOrder.length - 1}
                                    onClick={() => moveTabOrder(i, i + 1)}
                                    style={{ padding: 2 }}
                                  >
                                    <ChevronLeft size={13} style={{ transform: 'rotate(-90deg)' }} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* CATEGORY: FEATURES */}
                    {settingsTab === 'features' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.75 }}>
                          Features & Alerts
                        </div>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 12,
                          overflow: 'hidden'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Low Battery Alerts</span>
                            <AppleSwitch
                              checked={batteryAlertsEnabled}
                              onChange={(checked) => handleBatteryAlertsChange({ target: { value: checked ? "true" : "false" } })}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Standby Mode</span>
                            <AppleSwitch
                              checked={standbyBorderEnabled}
                              onChange={(checked) => handleStandbyChange({ target: { value: checked ? "true" : "false" } })}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Large Standby Mode</span>
                            <AppleSwitch
                              checked={largeStandbyEnabled}
                              onChange={(checked) => handleLargeStandbyChange({ target: { value: checked ? "true" : "false" } })}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Show Info When Idle</span>
                            <AppleSwitch
                              checked={showInfoWhenIdleEnabled}
                              onChange={(checked) => handleShowInfoWhenIdleChange({ target: { value: checked ? "true" : "false" } })}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CATEGORY: WEATHER */}
                    {settingsTab === 'weather' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.75 }}>
                          Weather Preferences
                        </div>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 12,
                          overflow: 'hidden'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Location</span>
                            <input
                              className="select-input"
                              style={{ width: 140, padding: '3px 8px', fontSize: 11, background: 'rgba(255,255,255,0.08)', borderRadius: 6, color: textColor, border: '1px solid rgba(255,255,255,0.12)' }}
                              placeholder="City, ST, Country"
                              value={weatherLocation}
                              onChange={(e) => {
                                setWeatherLocation(e.target.value);
                                localStorage.setItem("location", e.target.value);
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Temperature Unit</span>
                            <AppleSegmented
                              value={weatherUnit}
                              options={[{ value: 'c', label: '°C Celsius' }, { value: 'f', label: '°F Fahrenheit' }]}
                              onChange={(val) => handleWeatherUnitChange({ target: { value: val } })}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CATEGORY: UPDATES */}
                    {settingsTab === 'updates' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.75 }}>
                          Software Updates
                        </div>
                        <div className="settings-update-card" style={{ padding: '8px 10px', borderRadius: 12 }}>
                          <div className="settings-update-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: textColor }}>Quick Pill v{appVersion}</span>
                              {updateStatus === 'checking' && (
                                <span className="settings-update-badge checking">Checking...</span>
                              )}
                              {updateStatus === 'not-available' && (
                                <span className="settings-update-badge up-to-date"><Check size={11} /> Up to date</span>
                              )}
                              {updateStatus === 'available' && (
                                <span className="settings-update-badge available"><Sparkles size={11} /> v{updateInfo?.version}</span>
                              )}
                              {updateStatus === 'downloading' && (
                                <span className="settings-update-badge available"><Download size={11} /> Downloading</span>
                              )}
                              {updateStatus === 'downloaded' && (
                                <span className="settings-update-badge downloaded"><CheckCircle2 size={11} /> Ready</span>
                              )}
                              {updateStatus === 'error' && (
                                <span className="settings-update-badge error"><AlertCircle size={11} /> Error</span>
                              )}
                            </div>

                            <button
                              className="settings-update-btn"
                              onClick={handleManualCheckForUpdates}
                              disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                              title="Check for updates"
                              style={{ padding: '3px 7px', fontSize: 10.5 }}
                            >
                              <RefreshCw size={11} className={updateStatus === 'checking' ? 'spin-anim' : ''} />
                              <span>{updateStatus === 'checking' ? 'Checking...' : 'Check Now'}</span>
                            </button>
                          </div>

                          {updateStatus === 'available' && updateInfo && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 3 }}>
                              <div style={{ fontSize: 10.5, opacity: 0.9, color: textColor }}>
                                A new version <strong>v{updateInfo.version}</strong> is available {updateInfo.size > 0 ? `(${formatBytes(updateInfo.size)})` : ''}.
                              </div>
                              {updateInfo.changelog && updateInfo.changelog.length > 0 && (
                                <div className="settings-update-changelog" style={{ color: textColor, padding: '4px 6px', fontSize: 9.5 }}>
                                  <span style={{ fontWeight: 600, opacity: 0.7, marginBottom: 2 }}>What's New:</span>
                                  {updateInfo.changelog.map((item, idx) => (
                                    <div key={idx} className="settings-update-changelog-item">
                                      <span>•</span>
                                      <span>{item}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <button
                                className="settings-update-btn primary"
                                onClick={handleStartUpdateDownload}
                                style={{ width: '100%', padding: '5px 10px', fontSize: 11, marginTop: 2 }}
                              >
                                <Download size={12} />
                                Download & Update
                              </button>
                            </div>
                          )}

                          {updateStatus === 'downloading' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 3, color: textColor }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, opacity: 0.85 }}>
                                <span>Downloading v{updateInfo?.version}...</span>
                                <span>{downloadProgress.percent}% ({formatBytes(downloadProgress.transferredBytes)} / {formatBytes(downloadProgress.totalBytes)})</span>
                              </div>
                              <div className="settings-update-progress-track" style={{ height: 4 }}>
                                <div
                                  className="settings-update-progress-fill"
                                  style={{ width: `${downloadProgress.percent}%` }}
                                />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9.5, opacity: 0.65 }}>
                                <span>Speed: {formatBytes(downloadProgress.speedBytesPerSec)}/s</span>
                                <button
                                  onClick={handleCancelUpdateDownload}
                                  style={{ background: 'none', border: 'none', color: textColor, opacity: 0.7, cursor: 'pointer', fontSize: 9.5, textDecoration: 'underline' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {updateStatus === 'downloaded' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 3, color: textColor }}>
                              <div style={{ fontSize: 11, opacity: 0.9 }}>
                                Update <strong>v{updateInfo?.version}</strong> downloaded!
                              </div>
                              <button
                                className="settings-update-btn install"
                                onClick={handleInstallUpdate}
                                style={{ width: '100%', padding: '5px 10px', fontSize: 11 }}
                              >
                                <Sparkles size={12} />
                                Restart & Install Now
                              </button>
                            </div>
                          )}

                          {updateStatus === 'error' && (
                            <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>
                              {updateErrorMessage || 'Failed to check or download update.'}
                            </div>
                          )}
                        </div>

                        <div style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 12,
                          overflow: 'hidden'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Auto-Check on Launch</span>
                            <AppleSwitch
                              checked={autoUpdateCheckEnabled}
                              onChange={(checked) => handleAutoUpdateCheckToggle({ target: { value: checked ? "true" : "false" } })}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div >
  );
}
