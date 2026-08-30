import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Mic, SkipBackIcon, Play, Pause, SkipForwardIcon, Music, Headphones, Zap, Settings, Sun, Cloud, Trash2, ChevronRight, ChevronLeft, Check, X, CloudRain, CloudSnow, CloudLightning, CloudSun, Moon, Eye, EyeOff, GripVertical, List, Search, Star, Calendar as CalendarIcon, Bell, BellOff, AlarmClock, Timer, Activity, Clock, Volume2, VolumeX, Wind, Usb, Download, RefreshCw, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
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


const FlipCard = ({ digit }) => {
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
        width: 140,
        height: 124,
        background: '#18181c',
        borderRadius: 18,
        padding: 5,
        boxSizing: 'border-box',
        boxShadow: '0 12px 28px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.14)',
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
          borderRadius: 13,
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
              fontSize: 82,
              fontWeight: 800,
              color: '#0070f3',
              fontFamily: 'OpenRunde, system-ui, sans-serif',
              letterSpacing: '-2px',
              userSelect: 'none',
              marginTop: 4
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
              fontSize: 82,
              fontWeight: 800,
              color: '#0070f3',
              fontFamily: 'OpenRunde, system-ui, sans-serif',
              letterSpacing: '-2px',
              userSelect: 'none',
              marginBottom: 4
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
                fontSize: 82,
                fontWeight: 800,
                color: '#0070f3',
                fontFamily: 'OpenRunde, system-ui, sans-serif',
                letterSpacing: '-2px',
                userSelect: 'none',
                marginTop: 4
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
            height: 2.5,
            background: '#18181c',
            marginTop: -1.25,
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
            marginTop: -6,
            width: 7,
            height: 12,
            background: '#1c1c20',
            borderRadius: '0 3px 3px 0',
            zIndex: 31
          }}
        />

        {/* Right hinge pin */}
        <div
          style={{
            position: 'absolute',
            right: -1,
            top: '50%',
            marginTop: -6,
            width: 7,
            height: 12,
            background: '#1c1c20',
            borderRadius: '3px 0 0 3px',
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
  const [tabOrder, setTabOrder] = useState(() => JSON.parse(localStorage.getItem("tab-order") || "[2,4,5,6,7,8,10,0,1,3,9]"));
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
  const [browserSearch, setBrowserSearch] = useState("");
  const [clipboard, setClipboard] = useState([]);
  const [charging, setCharging] = useState(false);
  const [chargingAlert, setChargingAlert] = useState(false);
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
      if (num === 20) return 6;
      return Math.max(0, Math.min(1000, num));
    }
    return 6;
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
      ? (currentTab === 9 ? 495 : currentTab === 1 ? 390 : currentTab === 10 ? 370 : currentTab === 0 ? 405 : currentTab === 4 ? 400 : currentTab === 6 ? 340 : currentTab === 3 ? 380 : 380)
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
      ? (currentTab === 9 ? (positionMode === "free" ? 435 : 355) : currentTab === 8 ? 180 : currentTab === 1 ? 272 : currentTab === 4 ? 210 : currentTab === 5 ? 240 : currentTab === 7 ? 230 : currentTab === 6 ? 180 : currentTab === 10 ? 192 : currentTab === 3 ? 185 : currentTab === 0 ? 120 : 190)
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
        };
        handler = update;
        update();
        battery.addEventListener("chargingchange", handler);
        battery.addEventListener("levelchange", handler);
      } catch {
        setPercent(null);
      }
    })();

    return () => {
      if (battery && handler) {
        battery.removeEventListener("levelchange", handler);
        battery.removeEventListener("chargingchange", handler);
      }
    };
  }, []);

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
      case 'top-center': return { left: '49.8%', top: '6px', x: '-50%' };
      case 'bottom-center': return { left: '49.8%', top: 'auto', bottom: '45px', x: '-50%' };
      default: return { left: `${islandX}%`, top: `${islandY}px`, x: '-50%' };
    }
  }, [positionMode, islandX, islandY]);

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
        borderRadius:
          mode === "large" && theme === "win95"
            ? 0
            : mode === "large"
              ? (currentTab === 0 ? 28 : 32)
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
        overflow: "hidden",
        fontFamily: theme === "win95" ? "w95" : "OpenRunde",
        border: theme === "win95" ? "2px solid rgb(254, 254, 254)" : islandBorderEnabled ? cameraInUse ? `1px solid rgba(255, 215, 0, 0.8)` : microphoneInUse ? `1px solid rgba(255, 154, 0, 0.8)` : (charging || chargingAlert) ? `1px solid rgba(111, 255, 123, 0.5)` : (percent <= 20 || alert) ? `1px solid rgba(255, 63, 63, 0.5)` : bluetoothAlert ? `1px solid rgba(0, 150, 255, 0.34)` : hideNotActiveIslandEnabled ? "none" : `1px solid color-mix(in srgb, ${textColor}, transparent 70%)` : "none",
        borderColor:
          theme === "win95"
            ? "#FFFFFF #808080 #808080 #FFFFFF"
            : "none",
        '--island-text-color': textColor,
        '--island-bg-color': bgColor,
        position: 'fixed',
        margin: 0,
        pointerEvents: isTransitioning ? 'auto' : (ctrlHeld && isHovered) ? 'none' : (mode === 'still' && !isHovered && (!showInfoWhenIdleEnabled || hideNotActiveIslandEnabled || window.electronAPI?.platform === 'linux')) ? 'none' : 'auto'
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
              position: "absolute"
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
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  boxSizing: 'border-box',
                  userSelect: 'none'
                }}>
                  {/* Top Header: 3D Weather Icon + Location Header on Left & Temp/Status on Right */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    {/* Left: 3D Layered Animated Weather Icon & Location Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Animated3DWeatherIcon status={statusStr} size={50} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'OpenRunde, system-ui, sans-serif' }}>
                          {locName}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255, 255, 255, 0.55)', fontFamily: 'OpenRunde, system-ui, sans-serif' }}>
                          Updated 5m ago
                        </span>
                      </div>
                    </div>

                    {/* Right: Giant Temp & Condition Title */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 30, fontWeight: 800, color: '#ffffff', fontFamily: 'OpenRunde, system-ui, sans-serif', lineHeight: 1, letterSpacing: '-0.5px' }}>
                        {tempVal}°{weatherUnit === 'f' ? 'F' : 'C'}
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255, 255, 255, 0.75)', marginTop: 4, fontFamily: 'OpenRunde, system-ui, sans-serif' }}>
                        {statusStr}
                      </div>
                    </div>
                  </div>

                  {/* Middle Stats Row: Humidity | Precip | Wind */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: '100%' }}>
                    <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '7px 4px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>Humidity</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>{humidityVal}</div>
                    </div>
                    <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '7px 4px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>Precip</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>{precipVal}</div>
                    </div>
                    <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '7px 4px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255, 255, 255, 0.6)' }}>Wind</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>{windVal}</div>
                    </div>
                  </div>

                  {/* Bottom Row: 3-Day Forecast Glass Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: '100%' }}>
                    {[
                      { day: 'Today', icon: 'Partly Sunny', hi: `${tempVal}°`, lo: `${tempVal - 6}°`, rain: '5%' },
                      { day: 'Tomorrow', icon: 'Partly Cloudy', hi: `${tempVal - 2}°`, lo: `${tempVal - 8}°`, rain: '15%' },
                      { day: 'Wed', icon: 'Rain', hi: `${tempVal - 4}°`, lo: `${tempVal - 9}°`, rain: '80%' }
                    ].map((fc) => (
                      <motion.div
                        key={fc.day}
                        whileHover={{ y: -3, scale: 1.03 }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: 14,
                          padding: '8px 4px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)'
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255, 255, 255, 0.75)' }}>{fc.day}</span>
                        <div style={{ margin: '4px 0' }}>
                          <Animated3DWeatherIcon status={fc.icon} size={22} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#ffffff' }}>{fc.hi}/{fc.lo}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#4fc3f7', marginTop: 1 }}>{fc.rain}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })()}
            {/* Overview / Retro Flip Clock Tab */}
            {currentTab === 2 && (() => {
              const d = new Date();
              let h = d.getHours();
              const m = String(d.getMinutes()).padStart(2, '0');
              const ampm = h >= 12 ? 'PM' : 'AM';
              h = h % 12;
              h = h ? h : 12;
              const hStr = String(h).padStart(2, '0');
              const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
              const monthName = d.toLocaleDateString('en-US', { month: 'short' });
              const dayNum = d.getDate();
              const fullDateUpper = `${dayName.toUpperCase()}, ${monthName.toUpperCase()} ${dayNum}`;

              return (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px 14px 18px',
                  boxSizing: 'border-box',
                  position: 'relative'
                }}>

                  {/* Center Retro Mechanical Split-Flap Flip Clock */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 10 }}>
                    <FlipCard digit={hStr} />

                    {/* Glowing Orange Colon Dots */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', justifyContent: 'center' }}>
                      <motion.div
                        animate={{ opacity: [1, 0.35, 1], scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          width: 11,
                          height: 11,
                          borderRadius: '50%',
                          background: '#ff9500',
                          boxShadow: '0 0 12px #ff9500'
                        }}
                      />
                      <motion.div
                        animate={{ opacity: [1, 0.35, 1], scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          width: 11,
                          height: 11,
                          borderRadius: '50%',
                          background: '#ff9500',
                          boxShadow: '0 0 12px #ff9500'
                        }}
                      />
                    </div>

                    <FlipCard digit={m} />
                  </div>

                  {/* Bottom Caption: FLIP CLOCK • MON, JUL 27 • AM */}
                  <div style={{
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.65)',
                    letterSpacing: '0.9px',
                    fontFamily: 'OpenRunde, system-ui, sans-serif',
                    textTransform: 'uppercase'
                  }}>
                    FLIP CLOCK • {fullDateUpper} • {ampm}
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
                      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', padding: '2px 4px' }}>
                        {/* Top App Name Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.75)' }}>
                          <Music size={14} color="rgba(255,255,255,0.85)" />
                          <span>{cleanAppName(spotifyTrack?.source)}</span>
                        </div>

                        {/* Middle Title & Artist */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                          <ScrollingTitle text={spotifyTrack.name || "Unknown Title"} fontSize={15} />
                          <p
                            style={{
                              margin: 0,
                              fontSize: 13,
                              fontWeight: 400,
                              color: 'rgba(255,255,255,0.65)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '300px',
                              fontFamily: 'OpenRunde, system-ui, sans-serif'
                            }}
                          >
                            {spotifyTrack.artist || "Unknown Artist"}
                          </p>
                        </div>

                        {/* Progress Waveform Scrubber Timeline */}
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

                        {/* Bottom Middle 3 Playback Control Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 32, marginTop: 2 }}>
                          {/* 1. Previous button */}
                          <button
                            className="media-btn"
                            onClick={() => {
                              lastMediaActionRef.current = Date.now();
                              if (window.electronAPI?.controlSystemMedia) {
                                window.electronAPI.controlSystemMedia('previous');
                              }
                            }}
                            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.9, padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Previous Track"
                            aria-label="Previous Track"
                          >
                            <SkipBackIcon size={22} color="#ffffff" fill="#ffffff" />
                          </button>

                          {/* 2. Center Play/Pause button */}
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
                              background: 'rgba(255,255,255,0.16)',
                              backdropFilter: 'blur(8px)',
                              border: '1px solid rgba(255,255,255,0.25)',
                              borderRadius: '50%',
                              width: 40,
                              height: 40,
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
                            {spotifyTrack.state === 'playing' ? <Pause size={20} color="#ffffff" fill="#ffffff" /> : <Play size={20} color="#ffffff" fill="#ffffff" />}
                          </button>

                          {/* 3. Next button */}
                          <button
                            className="media-btn"
                            onClick={() => {
                              lastMediaActionRef.current = Date.now();
                              if (window.electronAPI?.controlSystemMedia) {
                                window.electronAPI.controlSystemMedia('next');
                              }
                            }}
                            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.9, padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Next Track"
                            aria-label="Next Track"
                          >
                            <SkipForwardIcon size={22} color="#ffffff" fill="#ffffff" />
                          </button>
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
                    padding: '12px 16px',
                    boxSizing: 'border-box',
                    gap: 16,
                    userSelect: 'none'
                  }}
                >
                  {/* Left Column: Hero Date Card */}
                  <div
                    style={{
                      width: 118,
                      height: '100%',
                      background: '#1b1b1f',
                      borderRadius: 16,
                      border: '1.5px solid #2c2c34',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                      padding: '12px 10px',
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
                          fontSize: 13,
                          fontWeight: 800,
                          color: '#ff3b30',
                          letterSpacing: '1.2px',
                          textTransform: 'uppercase',
                          fontFamily: 'OpenRunde, system-ui, sans-serif'
                        }}
                      >
                        {monthNameUpper}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
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
                        fontSize: 54,
                        fontWeight: 800,
                        color: '#ffffff',
                        fontFamily: 'OpenRunde, system-ui, sans-serif',
                        letterSpacing: '-2px',
                        lineHeight: 1
                      }}
                    >
                      {today.getDate()}
                    </div>

                    {/* Full Weekday Name */}
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.65)',
                        fontFamily: 'OpenRunde, system-ui, sans-serif'
                      }}
                    >
                      {todayWeekdayFull}
                    </div>
                  </div>

                  {/* Right Column: Month Grid */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    {/* Calendar Month Nav Controls (Compact) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                      <button
                        onClick={() => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 2 }}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', fontFamily: 'OpenRunde, system-ui, sans-serif' }}>
                        {calendarDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                      </span>
                      <button
                        onClick={() => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 2 }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    {/* Weekday Header (S M T W T F S) - Red for S & S */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' }}>
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
                        const isWeekend = idx === 0 || idx === 6;
                        return (
                          <div
                            key={`cal-h-${idx}`}
                            style={{
                              fontSize: 12,
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
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
                              height: 22,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: isToday ? 800 : 600,
                              fontFamily: 'OpenRunde, system-ui, sans-serif',
                              color: isToday ? '#ffffff' : dayCellColor
                            }}
                          >
                            {isToday ? (
                              <div
                                style={{
                                  width: 23,
                                  height: 23,
                                  borderRadius: '50%',
                                  background: '#c42b27',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff',
                                  boxShadow: '0 2px 6px rgba(196, 43, 39, 0.6)'
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
              <div className="stats-container">
                <div className="stat-bar-group">
                  <div className="stat-label-row">
                    <span>CPU LOAD</span>
                    <span>{systemStats.cpu}%</span>
                  </div>
                  <div className="stat-bar-track">
                    <div className="stat-bar-fill" style={{ width: `${systemStats.cpu}%` }} />
                  </div>
                </div>

                <div className="stat-bar-group">
                  <div className="stat-label-row">
                    <span>MEMORY USAGE</span>
                    <span>{systemStats.ram}%</span>
                  </div>
                  <div className="stat-bar-track">
                    <div className="stat-bar-fill" style={{ width: `${systemStats.ram}%` }} />
                  </div>
                </div>

                <div className="stat-bar-group">
                  <div className="stat-label-row">
                    <span>BATTERY</span>
                    <span>{percent !== null ? `${percent}%` : 'N/A'}</span>
                  </div>
                  <div className="stat-bar-track">
                    <div className="stat-bar-fill" style={{ width: `${percent || 0}%` }} />
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

            {/* Minimalist Apple/Things 3 Tasks UI */}
            {currentTab === 8 && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  boxSizing: 'border-box',
                  userSelect: 'none'
                }}
              >
                {/* Task List */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    marginBottom: 8,
                    paddingRight: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3
                  }}
                >
                  <AnimatePresence mode="popLayout">
                    {tasks.length === 0 ? (
                      <motion.div
                        key="empty-tasks"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.4 }}
                        exit={{ opacity: 0 }}
                        style={{
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 400,
                          color: textColor,
                          fontFamily: 'OpenRunde, system-ui, sans-serif'
                        }}
                      >
                        No tasks yet. Add one below!
                      </motion.div>
                    ) : (
                      tasks.map((task, index) => (
                        <motion.div
                          key={`task-${task}-${index}`}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 10, height: 0, marginBottom: 0, padding: 0 }}
                          transition={{ duration: 0.15 }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            padding: '6px 8px',
                            borderRadius: 8,
                            boxSizing: 'border-box'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
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
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                                e.currentTarget.style.background = 'none';
                              }}
                            />

                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 400,
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
                          >
                            <Trash2 size={13} color={textColor} />
                          </motion.button>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>

                {/* Minimal Single-Capsule Input Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 12,
                    padding: '3px 4px 3px 12px',
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
                      height: 32,
                      background: 'none',
                      color: textColor,
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 400,
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'OpenRunde, system-ui, sans-serif'
                    }}
                  />

                  <motion.button
                    whileHover={{ background: 'rgba(255, 255, 255, 0.25)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => addTask()}
                    style={{
                      height: 28,
                      padding: '0 12px',
                      background: 'rgba(255, 255, 255, 0.16)',
                      color: textColor,
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
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
                padding: '16px 20px',
                boxSizing: 'border-box',
                userSelect: 'none'
              }}>
                {!isTimerRunning && timerSeconds === 0 ? (
                  /* STATE 1: Select Timer Setup Screen (Image 2) */
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    {/* Title Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 0 }}>
                      <AlarmClock size={16} color="#ffffff" />
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', fontFamily: 'OpenRunde, system-ui, sans-serif' }}>
                        Select Timer
                      </span>
                    </div>

                    {/* Preset Chips Row: 15m, 30m, 60m, 100m */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, width: '100%' }}>
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
                            borderRadius: 14,
                            height: 46,
                            color: '#ffffff',
                            fontSize: 14,
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', marginBottom: 0 }}>
                      {/* Left: Custom Time Picker Pill */}
                      <div style={{
                        background: '#222227',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 14,
                        height: 48,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 14px',
                        boxSizing: 'border-box',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                      }}>
                        <button
                          onClick={() => setCustomTimerSetup(prev => Math.max(60, prev - 60))}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 20, fontWeight: 700, cursor: 'pointer', padding: '0 2px' }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', fontFamily: 'OpenRunde, system-ui, sans-serif' }}>
                          {formatTimerMMSS(customTimerSetup)}
                        </span>
                        <button
                          onClick={() => setCustomTimerSetup(prev => prev + 60)}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 20, fontWeight: 700, cursor: 'pointer', padding: '0 2px' }}
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
                          borderRadius: 14,
                          height: 48,
                          color: '#ffffff',
                          fontSize: 15,
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
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                    {/* Top Center: Bell / Total Duration Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.6 }}>
                      <BellOff size={13} color="#ffffff" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff', fontFamily: 'OpenRunde, system-ui, sans-serif' }}>
                        {formatTimerMMSS(timerTotalDuration)}
                      </span>
                    </div>

                    {/* Center Section: Left Pause/Play | Center Giant Time | Right Cancel */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 10px' }}>
                      {/* Left: Glass Circle Pause/Play Button */}
                      <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        style={{
                          width: 52,
                          height: 52,
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
                          <Pause size={22} color="#ffffff" fill="#ffffff" />
                        ) : (
                          <Play size={22} color="#ffffff" fill="#ffffff" style={{ marginLeft: 2 }} />
                        )}
                      </motion.button>

                      {/* Center: Giant Countdown Display & Subtitle */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{
                          fontSize: 42,
                          fontWeight: 800,
                          color: '#ffffff',
                          fontFamily: 'OpenRunde, system-ui, sans-serif',
                          letterSpacing: '-1px',
                          lineHeight: 1
                        }}>
                          {formatTimerMMSS(timerSeconds)}
                        </div>
                        <div style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'rgba(255,255,255,0.5)',
                          fontFamily: 'OpenRunde, system-ui, sans-serif',
                          marginTop: 4
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
                          width: 52,
                          height: 52,
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
                        <X size={22} color="#ff3b30" />
                      </motion.button>
                    </div>

                    {/* Bottom Spacer */}
                    <div style={{ height: 2 }} />
                  </div>
                )}
              </div>
            )}

            {/*Settings Overhaul*/}
            {currentTab === 9 && (
              <div
                id="settings-container"
                ref={settingsContainerRef}
                onMouseDown={handleSettingsMouseDown}
                onMouseMove={handleSettingsMouseMove}
                onMouseUp={handleSettingsMouseUp}
                onMouseLeave={handleSettingsMouseUp}
                onTouchStart={handleSettingsMouseDown}
                onTouchMove={handleSettingsMouseMove}
                onTouchEnd={handleSettingsMouseUp}
              >
                <div className="settings-section">
                  <h3 style={{ fontSize: 13, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>General</h3>
                  <div className="settings-row">
                    <span className="settings-label">12/24 Hour Format</span>
                    <select value={hourFormat ? "12-hr" : "24-hr"} onChange={handleHourFormatChange}>
                      <option value="12-hr">12-hour</option>
                      <option value="24-hr">24-hour</option>
                    </select>
                  </div>
                  {window.electronAPI?.platform !== 'darwin' && (
                    <div className="settings-row">
                      <span className="settings-label">Auto Launch on Boot</span>
                      <select value={autoLaunchEnabled ? "true" : "false"} onChange={handleAutoLaunchChange}>
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>
                  )}
                  {displays.length > 0 && (
                    <div className="settings-row">
                      <span className="settings-label">Target Display</span>
                      <select value={currentDisplayId} onChange={handleDisplayChange}>
                        {displays.map(d => (
                          <option key={d.id} value={d.id}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="settings-section">
                  <h3 style={{ fontSize: 13, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Software Updates</h3>

                  <div className="settings-update-card">
                    <div className="settings-update-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: textColor }}>Quick Pill v{appVersion}</span>
                        {updateStatus === 'checking' && (
                          <span className="settings-update-badge checking">Checking...</span>
                        )}
                        {updateStatus === 'not-available' && (
                          <span className="settings-update-badge up-to-date"><Check size={11} /> Up to date</span>
                        )}
                        {updateStatus === 'available' && (
                          <span className="settings-update-badge available"><Sparkles size={11} /> v{updateInfo?.version} available</span>
                        )}
                        {updateStatus === 'downloading' && (
                          <span className="settings-update-badge available"><Download size={11} /> Downloading</span>
                        )}
                        {updateStatus === 'downloaded' && (
                          <span className="settings-update-badge downloaded"><CheckCircle2 size={11} /> Ready to Install</span>
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
                      >
                        <RefreshCw size={12} className={updateStatus === 'checking' ? 'spin-anim' : ''} />
                        <span>{updateStatus === 'checking' ? 'Checking...' : 'Check Now'}</span>
                      </button>
                    </div>

                    {updateStatus === 'available' && updateInfo && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                        <div style={{ fontSize: 12, opacity: 0.9, color: textColor }}>
                          A new version <strong>v{updateInfo.version}</strong> is available {updateInfo.size > 0 ? `(${formatBytes(updateInfo.size)})` : ''}.
                        </div>
                        {updateInfo.changelog && updateInfo.changelog.length > 0 && (
                          <div className="settings-update-changelog" style={{ color: textColor }}>
                            <span style={{ fontWeight: 600, opacity: 0.7, marginBottom: 2 }}>What's New:</span>
                            {updateInfo.changelog.map((item, idx) => (
                              <div key={idx} className="settings-update-changelog-item">
                                <span>•</span>
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <button
                            className="settings-update-btn primary"
                            onClick={handleStartUpdateDownload}
                            style={{ flex: 1 }}
                          >
                            <Download size={13} />
                            Download & Update
                          </button>
                        </div>
                      </div>
                    )}

                    {updateStatus === 'downloading' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4, color: textColor }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.85 }}>
                          <span>Downloading v{updateInfo?.version}...</span>
                          <span>{downloadProgress.percent}% ({formatBytes(downloadProgress.transferredBytes)} / {formatBytes(downloadProgress.totalBytes)})</span>
                        </div>
                        <div className="settings-update-progress-track">
                          <div
                            className="settings-update-progress-fill"
                            style={{ width: `${downloadProgress.percent}%` }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, opacity: 0.65 }}>
                          <span>Speed: {formatBytes(downloadProgress.speedBytesPerSec)}/s</span>
                          <button
                            onClick={handleCancelUpdateDownload}
                            style={{ background: 'none', border: 'none', color: textColor, opacity: 0.7, cursor: 'pointer', fontSize: 11, textDecoration: 'underline' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {updateStatus === 'downloaded' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4, color: textColor }}>
                        <div style={{ fontSize: 12, opacity: 0.9 }}>
                          Update <strong>v{updateInfo?.version}</strong> has been downloaded and is ready to install!
                        </div>
                        <button
                          className="settings-update-btn install"
                          onClick={handleInstallUpdate}
                          style={{ width: '100%', padding: '8px 14px' }}
                        >
                          <Sparkles size={14} />
                          Restart & Install Now
                        </button>
                      </div>
                    )}

                    {updateStatus === 'error' && (
                      <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>
                        {updateErrorMessage || 'Failed to check or download update. Please try again.'}
                      </div>
                    )}
                  </div>

                  <div className="settings-row">
                    <span className="settings-label">Auto-Check on Launch</span>
                    <select value={autoUpdateCheckEnabled ? "true" : "false"} onChange={handleAutoUpdateCheckToggle}>
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                </div>

                <div className="settings-section">
                  <h3 style={{ fontSize: 13, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em', marginBottom: '4px' }}>Tab Management</h3>
                  <p style={{ fontSize: 11, opacity: 0.4, marginTop: -8, marginBottom: 8 }}>Drag to reorder, click eye to hide.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {tabOrder.map((id, i) => {
                      const tabDef = TABS.find(t => t.id === id);
                      if (!tabDef) return null; // Guard against stale tab IDs from localStorage
                      const isHidden = hiddenTabs.includes(id);
                      return (
                        <div
                          key={id}
                          className={`tab-order-item ${isHidden ? 'hidden' : ''}`}
                          style={{ cursor: 'grab' }}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", i);
                            e.currentTarget.style.opacity = '0.4';
                            e.currentTarget.style.borderStyle = 'dashed';
                          }}
                          onDragEnd={(e) => {
                            e.currentTarget.style.opacity = isHidden ? '0.45' : '1';
                            e.currentTarget.style.borderStyle = isHidden ? 'dashed' : 'solid';
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.background = `color-mix(in srgb, ${textColor}, transparent 90%)`;
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.style.background = '';
                            e.currentTarget.style.transform = '';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.background = '';
                            e.currentTarget.style.transform = '';
                            const fromIdx = parseInt(e.dataTransfer.getData("text/plain"));
                            moveTabOrder(fromIdx, i);
                          }}
                        >
                          <GripVertical size={16} style={{ opacity: 0.3, cursor: 'grab' }} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                            {tabDef.icon(textColor)}
                            <span style={{ fontSize: 14, fontWeight: 500 }}>{tabDef.name}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <button
                              className="tab-order-btn"
                              onClick={() => {
                                setDefaultTabId(id);
                                localStorage.setItem("default-tab", id);
                              }}
                              title="Set as default"
                              style={{ opacity: defaultTabId === id ? 1 : 0.3, color: defaultTabId === id ? '#FFD700' : textColor }}
                            >
                              <Star size={16} fill={defaultTabId === id ? '#FFD700' : 'none'} />
                            </button>
                            <div style={{ width: 1, height: 16, background: textColor, opacity: 0.1, margin: '0 4px' }} />
                            <button
                              className="tab-order-btn"
                              onClick={() => toggleTabVisibility(id)}
                              title={isHidden ? "Show" : "Hide"}
                              style={{ opacity: isHidden ? 1 : 0.6 }}
                            >
                              {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <div style={{ width: 1, height: 16, background: textColor, opacity: 0.1, margin: '0 4px' }} />
                            <button
                              className="tab-order-btn"
                              disabled={i === 0}
                              onClick={() => moveTabOrder(i, i - 1)}
                            >
                              <ChevronLeft size={16} style={{ transform: 'rotate(90deg)' }} />
                            </button>
                            <button
                              className="tab-order-btn"
                              disabled={i === tabOrder.length - 1}
                              onClick={() => moveTabOrder(i, i + 1)}
                            >
                              <ChevronLeft size={16} style={{ transform: 'rotate(-90deg)' }} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="settings-section">
                  <h3 style={{ fontSize: 13, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Island Style</h3>
                  <div className="settings-row">
                    <span className="settings-label">Theme</span>
                    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                      <option value="none">Default</option>
                      <option value="sleek-black">Sleek Black</option>
                      <option value="win95">Windows 95</option>
                    </select>
                  </div>
                  <div className="settings-section" style={{ alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="settings-label" style={{ textAlign: 'center', marginBottom: '8px', opacity: 1, color: textColor }}>Position Mode</span>
                    <div className="radio-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', width: '100%', gap: '15px 10px' }}>
                      {[
                        { val: "top-left", label: "Top L" },
                        { val: "top-center", label: "Top C" },
                        { val: "top-right", label: "Top R" },
                        { val: "bottom-left", label: "Bot L" },
                        { val: "bottom-center", label: "Bot C" },
                        { val: "bottom-right", label: "Bot R" }
                      ].map((posOption) => (
                        <label key={posOption.val} className="radio-label" style={{ justifyContent: 'center' }}>
                          <input
                            type="radio"
                            name="positionMode"
                            value={posOption.val}
                            checked={positionMode === posOption.val}
                            onChange={(e) => {
                              setPositionMode(e.target.value);
                              localStorage.setItem("position-mode", e.target.value);
                            }}
                          />
                          <span className="radio-custom"></span>
                          {posOption.label}
                        </label>
                      ))}
                    </div>
                    <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '10px 0' }}></div>
                    <label className="radio-label" style={{ justifyContent: 'center' }}>
                      <input
                        type="radio"
                        name="positionMode"
                        value="free"
                        checked={positionMode === "free"}
                        onChange={(e) => {
                          setPositionMode(e.target.value);
                          localStorage.setItem("position-mode", e.target.value);
                        }}
                      />
                      <span className="radio-custom"></span>
                      FREE (MANUAL)
                    </label>
                  </div>
                  <AnimatePresence>
                    {isFree && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '12px' }}
                      >
                        <div className="settings-row">
                          <span className="settings-label">Position X ({islandX.toFixed(1)}%)</span>
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
                            list="tickmarks"
                            style={{ flex: 1, accentColor: textColor }}
                          />
                          <datalist id="tickmarks">
                            <option value="50" label="50%"></option>
                          </datalist>
                        </div>
                        <div className="settings-row">
                          <span className="settings-label">Position Y ({islandY}px)</span>
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
                            style={{ flex: 1, accentColor: textColor }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="settings-row">
                    <span className="settings-label">Island Border</span>
                    <select value={islandBorderEnabled ? "true" : "false"} onChange={handleIslandBorderChange}>
                      <option value="true">Show</option>
                      <option value="false">Hide</option>
                    </select>
                  </div>
                  <div className="settings-row">
                    <span className="settings-label">Hide When Inactive</span>
                    <select value={hideNotActiveIslandEnabled ? "true" : "false"} onChange={handlehideNotActiveIslandChange}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                </div>

                <div className="settings-section">
                  <h3 style={{ fontSize: 13, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Colors & Assets</h3>
                  <div className="settings-row">
                    <span className="settings-label">Island Color</span>
                    <input
                      className="select-input"
                      style={{ width: '100px' }}
                      placeholder="#000000"
                      value={bgColor}
                      onChange={handleBgColorChange}
                    />
                  </div>
                  <div className="settings-row">
                    <span className="settings-label">Text Color</span>
                    <input
                      className="select-input"
                      style={{ width: '100px' }}
                      placeholder="#FAFAFA"
                      value={textColor}
                      onChange={handleTextColorChange}
                    />
                  </div>
                  <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span className="settings-label">Background Image URL</span>
                    <input
                      className="select-input"
                      placeholder="https://..."
                      value={bgImage}
                      onChange={handleBgImageChange}
                    />
                  </div>
                </div>

                <div className="settings-section">
                  <h3 style={{ fontSize: 13, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Features</h3>
                  <div className="settings-row">
                    <span className="settings-label">Low Battery Alerts</span>
                    <select value={batteryAlertsEnabled ? "true" : "false"} onChange={handleBatteryAlertsChange}>
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                  <div className="settings-row">
                    <span className="settings-label">Standby Mode</span>
                    <select value={standbyBorderEnabled ? "true" : "false"} onChange={handleStandbyChange}>
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                  <div className="settings-row">
                    <span className="settings-label">Large Standby Mode</span>
                    <select value={largeStandbyEnabled ? "true" : "false"} onChange={handleLargeStandbyChange}>
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                  <div className="settings-row">
                    <span className="settings-label">Show Info when idle</span>
                    <select value={showInfoWhenIdleEnabled ? "true" : "false"} onChange={handleShowInfoWhenIdleChange}>
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                </div>

                <div className="settings-section">
                  <h3 style={{ fontSize: 13, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Weather</h3>
                  <div className="settings-row">
                    <span className="settings-label">Location</span>
                    <input
                      className="select-input"
                      placeholder="City, ST, Country"
                      value={weatherLocation}
                      onChange={(e) => {
                        setWeatherLocation(e.target.value);
                        localStorage.setItem("location", e.target.value);
                      }}
                    />
                  </div>
                  <div className="settings-row">
                    <span className="settings-label">Unit</span>
                    <select value={weatherUnit} onChange={handleWeatherUnitChange}>
                      <option value="f">Fahrenheit (°F)</option>
                      <option value="c">Celsius (°C)</option>
                    </select>
                  </div>
                </div>

              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div >
  );
}
