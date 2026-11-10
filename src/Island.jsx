import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Mic, SkipBackIcon, Play, Pause, SkipForwardIcon, Music, Headphones, Zap, Settings, Sun, Cloud, Trash2, ChevronRight, ChevronLeft, Check, X, CloudRain, CloudSnow, CloudLightning, CloudSun, Moon, Eye, EyeOff, GripVertical, List, Search, Star, Calendar as CalendarIcon, Bell, BellOff, AlarmClock, Timer, Activity, Clock, Volume2, VolumeX, Wind, Droplets, Usb, Download, RefreshCw, Sparkles, AlertCircle, CheckCircle2, SlidersHorizontal, Palette, Compass, Layers, Quote, Copy, Shuffle, BatteryCharging, Battery, ArrowDown, ArrowUp, FolderOpen, RotateCcw, FileText, CheckCircle, Upload, Film, Package, Phone, PhoneCall, PhoneIncoming, Send, MessageSquare, ExternalLink, Undo, ChevronDown, ChevronUp, BellRing, Keyboard, Inbox } from "lucide-react";
import "./App.css";
import AppLauncher from "./components/AppLauncher";
import QuickNotes from "./components/QuickNotes";
import Shelf, { extractFilePathsFromDataTransfer } from "./components/Shelf";
import Prayer from "./components/Prayer";
import ErrorBoundary from "./components/ErrorBoundary";

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

// Play peaceful dual-tone harmonic chime for prayer time notification
function playPrayerChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [659.25, 987.77].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);
      gain.gain.setValueAtTime(0, now + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 2.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 2.5);
    });
  } catch (err) {
    console.error("Failed to play prayer chime:", err);
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

function getOrdinalSuffix(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Clean SF-Symbol / Reference-Image-1 style white line-art weather icon for the 3-column hourly forecast
const HourlyLineWeatherIcon = React.memo(({ status = "", size = 26, color = "#ffffff" }) => {
  const s = (status || "").toLowerCase();
  const isThunder = s.includes("thunder") || s.includes("storm");
  const isSnow = s.includes("snow") || s.includes("sleet") || s.includes("ice") || s.includes("blizzard");
  const isRain = s.includes("rain") || s.includes("drizzle") || s.includes("shower");
  const isCloudy = s.includes("overcast") || (s.includes("cloud") && !s.includes("partly"));
  const isClear = (s.includes("sunny") || s.includes("clear")) && !s.includes("partly") && !s.includes("cloud");

  if (isClear) {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>
        <circle cx="14" cy="14" r="5" stroke={color} strokeWidth="1.9" />
        <line x1="14" y1="3.5" x2="14" y2="6" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
        <line x1="14" y1="22" x2="14" y2="24.5" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
        <line x1="3.5" y1="14" x2="6" y2="14" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
        <line x1="22" y1="14" x2="24.5" y2="14" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
        <line x1="6.6" y1="6.6" x2="8.4" y2="8.4" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
        <line x1="19.6" y1="19.6" x2="21.4" y2="21.4" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
        <line x1="21.4" y1="6.6" x2="19.6" y2="8.4" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
        <line x1="8.4" y1="19.6" x2="6.6" y2="21.4" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    );
  }

  if (isThunder) {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>
        <path d="M8.5 18.5H7.2C5.1 18.5 3.5 16.9 3.5 14.9C3.5 13.1 4.8 11.6 6.6 11.4C7.2 8.3 9.9 6 13.2 6C16.9 6 19.9 8.9 20 12.6C21.7 12.9 23 14.3 23 16.1C23 17.5 22 18.5 20.5 18.5H18" stroke={color} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14.2 16.5L11.5 21H14.8L13.2 25.2" stroke={color} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (isSnow) {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>
        <path d="M8 18.5H7.2C5.1 18.5 3.5 16.9 3.5 14.9C3.5 13.1 4.8 11.6 6.6 11.4C7.2 8.3 9.9 6 13.2 6C16.9 6 19.9 8.9 20 12.6C21.7 12.9 23 14.3 23 16.1C23 17.5 21.8 18.5 20.2 18.5H19" stroke={color} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="21.5" r="1.1" fill={color} />
        <circle cx="13.5" cy="23.5" r="1.1" fill={color} />
        <circle cx="17" cy="21.5" r="1.1" fill={color} />
      </svg>
    );
  }

  if (isCloudy && !isRain) {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>
        <path d="M7.5 20.5H19.8C21.9 20.5 23.5 18.9 23.5 16.9C23.5 15.1 22.1 13.6 20.3 13.4C19.8 9.7 16.7 7 12.9 7C9.1 7 6 9.8 5.6 13.5C4.1 14 3 15.4 3 17.1C3 19 4.6 20.5 6.5 20.5H7.5Z" stroke={color} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // Default / Sun + Cloud + Rain Streaks (matches Reference Image 1's iconic weather glyph)
  const showRainBars = isRain || (!s.includes("partly") && !s.includes("cloud") && !s.includes("sun") && !s.includes("clear"));
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>
      {/* Sun peeking from top-right of cloud (like Image 1) */}
      <path d="M16.2 7.4C16.9 6.6 17.9 6.1 19.1 6.1C21.2 6.1 22.9 7.8 22.9 9.9C22.9 10.9 22.5 11.8 21.8 12.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="19.1" y1="2.8" x2="19.1" y2="4.2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="24.1" y1="4.9" x2="23.1" y2="5.9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="26.2" y1="9.9" x2="24.8" y2="9.9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="24.1" y1="14.9" x2="23.1" y2="13.9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="14.2" y1="4.9" x2="15.1" y2="5.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      {/* Cloud body */}
      <path d="M8.2 18.2H6.8C4.8 18.2 3.2 16.6 3.2 14.7C3.2 12.9 4.5 11.4 6.2 11.2C6.8 8.5 9.2 6.5 12.1 6.5C15.3 6.5 17.9 8.9 18.1 12.1C19.6 12.3 20.8 13.6 20.8 15.2C20.8 16.9 19.4 18.2 17.7 18.2H16.2" stroke={color} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
      {/* Vertical rain bars (Image 1 style) or closed cloud bottom */}
      {showRainBars ? (
        <>
          <line x1="9.2" y1="17.8" x2="9.2" y2="23.2" stroke={color} strokeWidth="1.85" strokeLinecap="round" />
          <line x1="12.2" y1="18.8" x2="12.2" y2="24.8" stroke={color} strokeWidth="1.85" strokeLinecap="round" />
          <line x1="15.2" y1="17.8" x2="15.2" y2="22.6" stroke={color} strokeWidth="1.85" strokeLinecap="round" />
        </>
      ) : (
        <line x1="8.2" y1="18.2" x2="16.2" y2="18.2" stroke={color} strokeWidth="1.85" strokeLinecap="round" />
      )}
    </svg>
  );
});

// 3D Dark-Themed iOS Analog Clock (Combines Image 1's 3D bezel & depth with Image 2's iOS dial & hands)
const IOS3DAnalogClock = React.memo(({ size = 122 }) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeoutId;
    let isMounted = true;

    const scheduleNextTick = () => {
      if (!isMounted) return;
      const current = new Date();
      setNow(current);
      const msUntilNextSecond = 1000 - current.getMilliseconds();
      timeoutId = setTimeout(scheduleNextTick, Math.max(50, msUntilNextSecond));
    };

    scheduleNextTick();
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // Track cumulative seconds so the CSS spring transition never spins 354° backward at 59s -> 0s
  const cumulativeSecondsRef = useRef(null);
  const rawSeconds = now.getSeconds();
  if (cumulativeSecondsRef.current === null) {
    cumulativeSecondsRef.current = rawSeconds;
  } else {
    const prevMod = ((cumulativeSecondsRef.current % 60) + 60) % 60;
    let delta = rawSeconds - prevMod;
    if (delta < 0) delta += 60;
    cumulativeSecondsRef.current += delta;
  }

  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = rawSeconds;

  const hourAngle = hours * 30 + minutes * 0.5 + seconds * (0.5 / 60);
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const secondAngle = cumulativeSecondsRef.current * 6;

  const ticks = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const isHour = i % 5 === 0;
      const angleDeg = i * 6;
      return { i, isHour, angleDeg };
    });
  }, []);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'relative',
        flexShrink: 0,
        // 3D Outer Bezel (Dark Metallic Slate with Directional Lighting & Cast Shadow like Image 1)
        background: 'linear-gradient(145deg, #323238 0%, #202025 48%, #111114 100%)',
        boxShadow: [
          '6px 8px 18px rgba(0, 0, 0, 0.78)',
          '-2px -2px 8px rgba(255, 255, 255, 0.05)',
          'inset 1.5px 2px 3px rgba(255, 255, 255, 0.22)',
          'inset -2px -2.5px 4px rgba(0, 0, 0, 0.85)'
        ].join(', '),
        padding: 9,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none'
      }}
    >
      {/* Inner Bezel Step Rim (Metallic Lip before the Dial Cavity) */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #16161a 0%, #29292f 100%)',
          padding: 2.5,
          boxSizing: 'border-box',
          boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.85), 0 1px 1px rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Deep Matte Charcoal Dial Face with 3D Overhang Cavity Shadow */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            position: 'relative',
            background: 'radial-gradient(circle at 38% 32%, #1e1e24 0%, #151519 65%, #101013 100%)',
            boxShadow: [
              'inset 3px 4px 8px rgba(0, 0, 0, 0.92)',
              'inset -1px -1px 4px rgba(255, 255, 255, 0.05)',
              'inset 0 0 12px rgba(0, 0, 0, 0.7)'
            ].join(', '),
            overflow: 'hidden'
          }}
        >
          {/* iOS-Style Recessed Inner Circle Well (from Reference Image 2, in Dark Theme) */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '50%',
              height: '50%',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #121216 0%, #19191f 100%)',
              boxShadow: 'inset 1.5px 2px 4px rgba(0, 0, 0, 0.75), 0 1px 1px rgba(255, 255, 255, 0.06)',
              border: '0.5px solid rgba(255, 255, 255, 0.03)',
              pointerEvents: 'none'
            }}
          />

          {/* SVG Dial Face: 60 Ticks + Bold iOS Numerals (12, 3, 6, 9) + 3D Hands */}
          <svg
            viewBox="0 0 100 100"
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              inset: 0,
              overflow: 'visible'
            }}
          >
            <defs>
              {/* 3D Elevation Drop Shadow for Hour & Minute Hands */}
              <filter id="ios-clock-hand-shadow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="1.2" dy="2.2" stdDeviation="1.4" floodColor="#000000" floodOpacity="0.82" />
              </filter>
              {/* Elevated Drop Shadow for Second Hand */}
              <filter id="ios-clock-sec-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="1.5" dy="2.6" stdDeviation="1.3" floodColor="#000000" floodOpacity="0.75" />
              </filter>
              {/* Subtle Gradient for White 3D Baton Hands */}
              <linearGradient id="ios-hand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#e2e4ea" />
              </linearGradient>
            </defs>

            {/* 60 Perimeter Tick Marks (Image 2 iOS style: bold pill ticks for hours, crisp ticks for minutes) */}
            {ticks.map(({ i, isHour, angleDeg }) => (
              <line
                key={i}
                x1="50"
                y1={isHour ? "4.2" : "4.2"}
                x2="50"
                y2={isHour ? "10.6" : "7.6"}
                stroke={isHour ? "#ffffff" : "rgba(255, 255, 255, 0.45)"}
                strokeWidth={isHour ? "2.1" : "0.95"}
                strokeLinecap="round"
                transform={`rotate(${angleDeg} 50 50)`}
              />
            ))}

            {/* Cardinal iOS Numerals: 12, 3, 6, 9 */}
            <text
              x="50"
              y="20.5"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#ffffff"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Rounded", "SF Pro Display", "OpenRunde", sans-serif',
                fontSize: '12.5px',
                fontWeight: 800,
                letterSpacing: '-0.4px'
              }}
            >
              12
            </text>
            <text
              x="79.5"
              y="50.5"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#ffffff"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Rounded", "SF Pro Display", "OpenRunde", sans-serif',
                fontSize: '12.5px',
                fontWeight: 800
              }}
            >
              3
            </text>
            <text
              x="50"
              y="79.5"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#ffffff"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Rounded", "SF Pro Display", "OpenRunde", sans-serif',
                fontSize: '12.5px',
                fontWeight: 800
              }}
            >
              6
            </text>
            <text
              x="20.5"
              y="50.5"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#ffffff"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Rounded", "SF Pro Display", "OpenRunde", sans-serif',
                fontSize: '12.5px',
                fontWeight: 800
              }}
            >
              9
            </text>

            {/* HOUR HAND (iOS two-stage baton: narrow neck from center, wider rounded paddle body) */}
            <g
              transform={`rotate(${hourAngle} 50 50)`}
              style={{ filter: 'drop-shadow(1px 2px 2px rgba(0, 0, 0, 0.85))' }}
            >
              {/* Narrow inner shaft */}
              <rect
                x="48.8"
                y="38.5"
                width="2.4"
                height="11.5"
                rx="1.2"
                fill="url(#ios-hand-grad)"
              />
              {/* Main rounded baton body */}
              <rect
                x="47.7"
                y="24"
                width="4.6"
                height="18"
                rx="2.3"
                fill="url(#ios-hand-grad)"
              />
            </g>

            {/* MINUTE HAND (iOS two-stage baton extending near minute track) */}
            <g
              transform={`rotate(${minuteAngle} 50 50)`}
              style={{ filter: 'drop-shadow(1.2px 2.4px 2.2px rgba(0, 0, 0, 0.85))' }}
            >
              {/* Narrow inner shaft */}
              <rect
                x="48.95"
                y="37.5"
                width="2.1"
                height="12.5"
                rx="1.05"
                fill="url(#ios-hand-grad)"
              />
              {/* Main rounded baton body */}
              <rect
                x="48.1"
                y="11.5"
                width="3.8"
                height="29"
                rx="1.9"
                fill="url(#ios-hand-grad)"
              />
            </g>

            {/* Outer Dark Metallic Center Hub Collar (underneath second hand) */}
            <circle
              cx="50"
              cy="50"
              r="4.2"
              fill="#1f1f24"
              stroke="#ffffff"
              strokeWidth="1.2"
              style={{ filter: 'drop-shadow(0px 1.5px 2px rgba(0, 0, 0, 0.85))' }}
            />
          </svg>

          {/* SECOND HAND LAYER (Separate DOM layer for smooth CSS spring bounce on each 1s mechanical tick) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              transform: `rotate(${secondAngle}deg)`,
              transition: 'transform 0.26s cubic-bezier(0.34, 1.65, 0.64, 1)',
              willChange: 'transform',
              pointerEvents: 'none'
            }}
          >
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <g style={{ filter: 'drop-shadow(1.2px 2.2px 2px rgba(0, 0, 0, 0.8))' }}>
                {/* Counterweight tail + main sweeping needle in iOS Red (#FF3B30) */}
                <rect
                  x="49.3"
                  y="8.8"
                  width="1.4"
                  height="53.2"
                  rx="0.7"
                  fill="#FF3B30"
                />
                {/* Red Center Cap */}
                <circle cx="50" cy="50" r="2.7" fill="#FF3B30" />
                {/* Center Pin Specular Dot */}
                <circle cx="50" cy="50" r="0.95" fill="#18181c" />
              </g>
            </svg>
          </div>

          {/* Subtle Top-Left 3D Glass Reflection Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 45%)',
              pointerEvents: 'none'
            }}
          />
        </div>
      </div>
    </div>
  );
});

const ThreeDInstrumentDial = React.memo(({
  label = "CPU",
  sublabel = "LOAD",
  value = 0,
  accentColor = "#0a84ff",
  size = 114
}) => {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const totalTicks = 28;
  const activeTicks = Math.round((clamped / 100) * totalTicks);
  const startAngle = -125;
  const endAngle = 125;
  const angleSpan = endAngle - startAngle;
  const iosFontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Rounded", "OpenRunde", system-ui, sans-serif';

  const ticks = useMemo(() => {
    return Array.from({ length: totalTicks + 1 }, (_, i) => {
      const deg = startAngle + (i / totalTicks) * angleSpan;
      const isMajor = i % 7 === 0;
      const isActive = i <= activeTicks && clamped > 0;
      return { deg, isMajor, isActive };
    });
  }, [activeTicks, clamped, startAngle, angleSpan]);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'relative',
        flexShrink: 0,
        padding: 7,
        boxSizing: 'border-box',
        background: 'linear-gradient(145deg, #2a2a32 0%, #17171d 55%, #0c0c10 100%)',
        boxShadow: `
          0 10px 22px rgba(0, 0, 0, 0.85),
          0 3px 7px rgba(0, 0, 0, 0.65),
          inset 0 1.5px 2px rgba(255, 255, 255, 0.2),
          inset 0 -2px 4px rgba(0, 0, 0, 0.9),
          0 0 16px ${accentColor}14
        `,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none'
      }}
    >
      {/* Inner Bezel Step */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          padding: 2.5,
          boxSizing: 'border-box',
          background: 'linear-gradient(145deg, #09090c 0%, #23232b 100%)',
          boxShadow: 'inset 0 2px 5px rgba(0, 0, 0, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Recessed Matte Dial Cavity */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            position: 'relative',
            background: 'radial-gradient(circle at 50% 42%, #191920 0%, #111116 72%, #0a0a0e 100%)',
            boxShadow: 'inset 0 5px 11px rgba(0, 0, 0, 0.92), inset 0 -1px 3px rgba(255, 255, 255, 0.05)',
            overflow: 'hidden'
          }}
        >
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
            {/* Sunken Center Well */}
            <circle
              cx="50"
              cy="50"
              r="29"
              fill="#0e0e13"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.8"
            />

            {/* 250-degree Instrument Scale Ticks */}
            {ticks.map((t, idx) => (
              <rect
                key={idx}
                x={t.isMajor ? "48.9" : "49.2"}
                y="6.2"
                width={t.isMajor ? "2.2" : "1.6"}
                height={t.isMajor ? "7.2" : "4.8"}
                rx="0.9"
                fill={t.isActive ? accentColor : "rgba(255, 255, 255, 0.16)"}
                transform={`rotate(${t.deg} 50 50)`}
                style={t.isActive ? { filter: `drop-shadow(0 0 2.5px ${accentColor}99)` } : undefined}
              />
            ))}
          </svg>

          {/* Center Readout Stack */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: iosFontStack,
              paddingTop: 4
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.6px',
                lineHeight: 1,
                textShadow: '0 2px 6px rgba(0,0,0,0.85)'
              }}
            >
              {value !== null && value !== undefined ? `${clamped}%` : 'N/A'}
            </span>
            <span
              style={{
                fontSize: 8.5,
                fontWeight: 700,
                color: 'rgba(255, 255, 255, 0.48)',
                letterSpacing: '0.6px',
                marginTop: 2,
                textTransform: 'uppercase'
              }}
            >
              {sublabel}
            </span>
          </div>

          {/* Bottom Recessed Pill Badge */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '1.5px 7px',
              borderRadius: 999,
              background: 'rgba(0, 0, 0, 0.65)',
              border: `1px solid ${accentColor}44`,
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.9)'
            }}
          >
            <span
              style={{
                width: 4.5,
                height: 4.5,
                borderRadius: '50%',
                background: accentColor,
                boxShadow: `0 0 6px ${accentColor}`
              }}
            />
            <span
              style={{
                fontSize: 8.5,
                fontWeight: 800,
                color: accentColor,
                letterSpacing: '0.5px',
                fontFamily: iosFontStack
              }}
            >
              {label}
            </span>
          </div>

          {/* Specular Top-Left Glint */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 45%)',
              pointerEvents: 'none'
            }}
          />
        </div>
      </div>
    </div>
  );
});

const TimerTickRulerSelector = ({
  customTimerSetup,
  setCustomTimerSetup,
  onStartCustom,
  onStartPreset
}) => {
  const rulerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const selectedMinutes = Math.max(1, Math.min(120, Math.round((customTimerSetup || 900) / 60)));
  const iosFontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Rounded", "OpenRunde", system-ui, sans-serif';

  // Keep 0..32 visible when selectedMinutes <= 25 so 0, 5, 10, 15, 20, 25, 30 matches img1,
  // and pan the 32-minute window smoothly when selectedMinutes > 25 up to 120.
  const visibleSpan = 32;
  const startMin = selectedMinutes <= 25
    ? 0
    : Math.min(120 - visibleSpan, selectedMinutes - 16);

  const updateMinutesFromClientX = useCallback((clientX) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const padX = 12;
    const usableW = Math.max(1, rect.width - padX * 2);
    const relX = Math.max(0, Math.min(usableW, clientX - rect.left - padX));
    const ratio = relX / usableW;
    const pickedMin = Math.max(1, Math.min(120, Math.round(startMin + ratio * visibleSpan)));
    setCustomTimerSetup(pickedMin * 60);
  }, [startMin, visibleSpan, setCustomTimerSetup]);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    if (e.currentTarget.setPointerCapture) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    }
    updateMinutesFromClientX(e.clientX);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();
    updateMinutesFromClientX(e.clientX);
  };

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();
    isDraggingRef.current = false;
  };

  const handleRulerWheel = (e) => {
    e.stopPropagation();
    const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
    if (delta === 0) return;
    const step = e.shiftKey ? 5 : 1;
    const dir = delta > 0 ? 1 : -1;
    const nextMin = Math.max(1, Math.min(120, selectedMinutes + dir * step));
    setCustomTimerSetup(nextMin * 60);
  };

  const ticks = [];
  for (let m = startMin; m <= startMin + visibleSpan; m++) {
    ticks.push(m);
  }

  const pointerIndex = selectedMinutes - startMin;
  const pointerPercent = (pointerIndex / visibleSpan) * 100;
  const formattedReadout = `${String(selectedMinutes).padStart(2, '0')}:00`;

  const presets = [
    { label: '5m', sec: 300 },
    { label: '15m', sec: 900 },
    { label: '30m', sec: 1800 },
    { label: '60m', sec: 3600 }
  ];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '2px 0',
        boxSizing: 'border-box',
        userSelect: 'none',
        fontFamily: iosFontStack
      }}
    >
      {/* Left Main Panel (~72%): img1 3D Recessed Tick-Ruler + 'Start Timer' Pill + Big Orange Digital Readout */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          borderRadius: 18,
          padding: '10px 16px 10px 16px',
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #131216 0%, #0b0a0d 100%)',
          border: '1px solid rgba(255, 159, 10, 0.16)',
          boxShadow: `
            0 8px 20px rgba(0, 0, 0, 0.8),
            inset 0 4px 12px rgba(0, 0, 0, 0.92),
            inset 0 1px 1px rgba(255, 255, 255, 0.06)
          `,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Interactive Horizontal Tick-Ruler Area (Numbers + Vertical Tick Bars + Triangle Indicator) */}
        <div
          ref={rulerRef}
          data-scrollable="true"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleRulerWheel}
          title="Drag or scroll to adjust minutes"
          style={{
            width: '100%',
            padding: '0 12px',
            boxSizing: 'border-box',
            cursor: 'ew-resize',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            maskImage: 'linear-gradient(to right, rgba(0,0,0,0.2) 0%, rgba(0,0,0,1) 12%, rgba(0,0,0,1) 86%, rgba(0,0,0,0.12) 100%)',
            WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,0.2) 0%, rgba(0,0,0,1) 12%, rgba(0,0,0,1) 86%, rgba(0,0,0,0.12) 100%)'
          }}
        >
          {/* Top Major Numbers Row (0, 5, 10, 15, 20, 25, 30...) */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 17,
              marginBottom: 4
            }}
          >
            {ticks.map((m, idx) => {
              if (m % 5 !== 0) return null;
              const leftPct = (idx / visibleSpan) * 100;
              const distFromSelected = Math.abs(m - selectedMinutes);
              const isSelected = m === selectedMinutes;
              const opacity = isSelected
                ? 1
                : Math.max(0.28, 0.88 - (distFromSelected / visibleSpan) * 0.65);

              return (
                <span
                  key={`num-${m}`}
                  style={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    transform: 'translateX(-50%)',
                    fontSize: 12.5,
                    fontWeight: isSelected ? 700 : 600,
                    color: '#FF9F0A',
                    opacity,
                    letterSpacing: '-0.2px',
                    textShadow: isSelected ? '0 0 8px rgba(255, 159, 10, 0.5)' : '0 1px 2px rgba(0,0,0,0.9)',
                    transition: 'opacity 0.12s ease'
                  }}
                >
                  {m}
                </span>
              );
            })}
          </div>

          {/* Middle Vertical Rounded Tick Bars Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              height: 30,
              position: 'relative'
            }}
          >
            {ticks.map((m) => {
              const isFilled = m <= selectedMinutes;
              const isSelected = m === selectedMinutes;
              const isMajor = m % 5 === 0;
              return (
                <div
                  key={`tick-${m}`}
                  style={{
                    width: isSelected ? 3.2 : 2.6,
                    height: isSelected ? 29 : (isMajor ? 27 : 25),
                    borderRadius: 999,
                    background: isFilled
                      ? 'linear-gradient(180deg, #FFB340 0%, #FF9F0A 55%, #D97706 100%)'
                      : 'linear-gradient(180deg, rgba(255, 159, 10, 0.26) 0%, rgba(180, 100, 10, 0.16) 100%)',
                    boxShadow: isFilled
                      ? (isSelected
                          ? '0 0 8px rgba(255, 159, 10, 0.65), 0 2px 4px rgba(0,0,0,0.85)'
                          : '0 2px 4px rgba(0, 0, 0, 0.8), 0 0 4px rgba(255, 159, 10, 0.25)')
                      : 'inset 0 1px 2px rgba(0, 0, 0, 0.85)',
                    transition: 'background 0.1s ease, height 0.1s ease'
                  }}
                />
              );
            })}
          </div>

          {/* Upward Orange Triangle Pointer (▲) directly under selected tick */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 12,
              marginTop: 3
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: `${pointerPercent}%`,
                transform: 'translateX(-50%)',
                transition: isDraggingRef.current ? 'none' : 'left 0.12s cubic-bezier(0.22, 1, 0.36, 1)',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.85)) drop-shadow(0 0 5px rgba(255, 159, 10, 0.45))'
              }}
            >
              <svg width="12" height="10" viewBox="0 0 12 10">
                <path
                  d="M5.15 1.1C5.53 0.45 6.47 0.45 6.85 1.1L10.85 8.0C11.23 8.65 10.76 9.48 10.0 9.48H2.0C1.24 9.48 0.77 8.65 1.15 8.0L5.15 1.1Z"
                  fill="#FF9F0A"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom Row: Left 3D Dark-Bronze 'Start Timer' Pill + Right Large iOS '15:00' Digital Readout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            marginTop: 1
          }}
        >
          <motion.button
            whileHover={{ scale: 1.03, filter: 'brightness(1.1)' }}
            whileTap={{ scale: 0.96 }}
            onClick={(e) => {
              e.stopPropagation();
              onStartCustom(selectedMinutes * 60);
            }}
            style={{
              height: 34,
              padding: '0 18px',
              borderRadius: 999,
              background: 'linear-gradient(180deg, #33200d 0%, #231507 100%)',
              border: '1px solid rgba(255, 159, 10, 0.28)',
              boxShadow: `
                0 5px 12px rgba(0, 0, 0, 0.75),
                inset 0 1px 1px rgba(255, 195, 100, 0.22),
                inset 0 -1.5px 3px rgba(0, 0, 0, 0.85)
              `,
              color: '#FF9F0A',
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: '-0.1px',
              fontFamily: iosFontStack,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Start Timer
          </motion.button>

          <div
            style={{
              fontSize: 33,
              fontWeight: 400,
              color: '#FF9F0A',
              fontFamily: iosFontStack,
              letterSpacing: '-0.8px',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 2px 10px rgba(255, 159, 10, 0.28), 0 2px 4px rgba(0, 0, 0, 0.9)'
            }}
          >
            {formattedReadout}
          </div>
        </div>
      </div>

      {/* Right Side Column (~28%): Sunken 3D Well with 2x2 Tactile Preset Buttons (Instant Start) */}
      <div
        style={{
          width: 132,
          height: '100%',
          flexShrink: 0,
          borderRadius: 18,
          padding: '8px',
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #121216 0%, #0a0a0d 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: `
            0 8px 20px rgba(0, 0, 0, 0.75),
            inset 0 4px 10px rgba(0, 0, 0, 0.9),
            inset 0 1px 1px rgba(255, 255, 255, 0.05)
          `,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 6
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 3px'
          }}
        >
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              color: 'rgba(255, 159, 10, 0.85)',
              letterSpacing: '0.6px',
              textTransform: 'uppercase'
            }}
          >
            Quick Presets
          </span>
          <Timer size={11} color="#FF9F0A" style={{ opacity: 0.85 }} />
        </div>

        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gridTemplateRows: 'repeat(2, 1fr)',
            gap: 6
          }}
        >
          {presets.map((preset) => {
            const isMatched = selectedMinutes * 60 === preset.sec;
            return (
              <motion.button
                key={preset.label}
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.94 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onStartPreset(preset.sec);
                }}
                title={`Start ${preset.label} timer immediately`}
                style={{
                  background: isMatched
                    ? 'linear-gradient(180deg, #35210d 0%, #221407 100%)'
                    : 'linear-gradient(180deg, #212128 0%, #15151a 100%)',
                  border: isMatched
                    ? '1px solid rgba(255, 159, 10, 0.45)'
                    : '1px solid rgba(255, 255, 255, 0.09)',
                  borderRadius: 11,
                  boxShadow: `
                    0 4px 10px rgba(0, 0, 0, 0.7),
                    inset 0 1px 1px rgba(255, 255, 255, 0.14),
                    inset 0 -1.5px 2px rgba(0, 0, 0, 0.85)
                  `,
                  color: isMatched ? '#FF9F0A' : '#ffffff',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: iosFontStack,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
              >
                <span>{preset.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
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
  { id: 12, name: "Audio Mixer", icon: (color) => <SlidersHorizontal size={16} color={color} /> },
  { id: 14, name: "App Launcher", icon: (color) => <Compass size={16} color={color} /> },
  { id: 15, name: "Quick Notes", icon: (color) => <FileText size={16} color={color} /> },
  { id: 16, name: "Shelf", icon: (color) => <Inbox size={16} color={color} /> },
  { id: 17, name: "Prayer", icon: (color) => <Moon size={16} color={color} /> },
  { id: 3, name: "Now Playing", icon: (color) => <Music size={16} color={color} /> },
  { id: 4, name: "Calendar", icon: (color) => <CalendarIcon size={16} color={color} /> },
  { id: 5, name: "Notifications", icon: (color) => <Bell size={16} color={color} /> },
  { id: 6, name: "Game / Stats", icon: (color) => <Activity size={16} color={color} /> },
  { id: 7, name: "Clipboard", icon: (color) => <List size={16} color={color} /> },
  { id: 8, name: "Tasks", icon: (color) => <Check size={16} color={color} /> },
  { id: 10, name: "Timer", icon: (color) => <Timer size={16} color={color} /> },
  { id: 9, name: "Settings", icon: (color) => <Settings size={16} color={color} /> },
];

const DEFAULT_TAB_SHORTCUTS = {
  0: "Alt+B",   // Browser Search
  1: "Alt+W",   // Weather
  2: "Alt+O",   // Overview
  12: "Alt+A",  // Audio Mixer
  14: "Alt+L",  // App Launcher
  15: "Alt+Q",  // Quick Notes
  16: "Alt+F",  // Shelf
  17: "Alt+P",  // Prayer
  3: "Alt+M",   // Now Playing
  4: "Alt+C",   // Calendar
  5: "Alt+N",   // Notifications
  6: "Alt+G",   // Game / Stats
  7: "Alt+V",   // Clipboard
  8: "Alt+T",   // Tasks
  10: "Alt+R",  // Timer
  9: "Alt+S"    // Settings
};

const WaveformScrubber = ({ position = 0, duration = 0, isPlaying = false, onSeek, accentColor = "#ff2d55" }) => {
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
  const width = 300;
  const height = 22;
  const centerY = 11;
  const barHeight = 6;
  const playedX = Math.max(0, Math.min(width, progress * width));

  const pointsCount = 35;
  const topPoints = [];

  for (let i = 0; i <= pointsCount; i++) {
    const t = i / pointsCount;
    const x = t * playedX;
    const envelope = Math.sin(t * Math.PI);
    const waveAmp = isPlaying
      ? Math.sin(t * 8 - animTime * 3) * 4.5 * envelope
      : Math.sin(t * 4 + animTime) * 1.2 * envelope;
    const y = (centerY - barHeight / 2) - Math.max(0, waveAmp + 3.5 * envelope);
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
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        cursor: 'pointer',
        padding: '4px 8px 3px 8px',
        boxSizing: 'border-box',
        borderRadius: 10,
        background: 'rgba(8, 8, 12, 0.72)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'inset 0 3px 7px rgba(0, 0, 0, 0.88), inset 0 -1px 1px rgba(255, 255, 255, 0.05)'
      }}
      onClick={handleScrubClick}
    >
      <svg width="100%" height="18" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="scrubber-wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={accentColor} />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>
        {/* Sunken Unplayed Trough */}
        <rect
          x="0"
          y={centerY - barHeight / 2}
          width={width}
          height={barHeight}
          rx={barHeight / 2}
          fill="rgba(255, 255, 255, 0.14)"
        />

        {/* Played Fluid Wave Mountain Ribbon Fill */}
        {playedX > 0 && (
          <path
            d={filledPathD}
            fill="url(#scrubber-wave-grad)"
            style={{ filter: `drop-shadow(0 0 5px ${accentColor}77)` }}
          />
        )}

        {/* 3D Beveled Slider Handle Knob */}
        <circle
          cx={playedX}
          cy={centerY}
          r="6.5"
          fill="#ffffff"
          stroke={accentColor}
          strokeWidth="1.5"
          style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.75))' }}
        />
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', fontFamily: 'OpenRunde, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ color: accentColor }}>{formatTime(currentPos)}</span>
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
      width: 40,
      height: 22,
      borderRadius: 11,
      background: checked
        ? 'linear-gradient(180deg, #1f8a3c 0%, #28b84c 100%)'
        : 'linear-gradient(180deg, #0a0a0e 0%, #15151c 100%)',
      border: checked
        ? '1px solid rgba(52, 199, 89, 0.5)'
        : '1px solid rgba(255, 255, 255, 0.08)',
      padding: 2,
      display: 'inline-flex',
      alignItems: 'center',
      cursor: disabled ? 'not-allowed' : 'pointer',
      position: 'relative',
      transition: 'all 0.2s ease',
      boxShadow: checked
        ? 'inset 0 2px 5px rgba(0, 0, 0, 0.5), 0 0 10px rgba(52, 199, 89, 0.28)'
        : 'inset 0 3px 6px rgba(0, 0, 0, 0.9), inset 0 -1px 1px rgba(255, 255, 255, 0.05)',
      flexShrink: 0
    }}
  >
    <motion.div
      animate={{ x: checked ? 17 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      style={{
        width: 17,
        height: 17,
        borderRadius: '50%',
        background: 'linear-gradient(180deg, #ffffff 0%, #d4d4d8 100%)',
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.9)'
      }}
    />
  </button>
);

const AppleSegmented = ({ value, options, onChange }) => (
  <div style={{
    display: 'inline-flex',
    background: '#0b0b0f',
    borderRadius: 9,
    padding: 2.5,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.9)'
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
            background: isSelected
              ? 'linear-gradient(180deg, #1b3358 0%, #102039 100%)'
              : 'transparent',
            border: isSelected ? '1px solid rgba(10, 132, 255, 0.4)' : '1px solid transparent',
            color: isSelected ? '#60a5fa' : 'rgba(255, 255, 255, 0.55)',
            borderRadius: 6.5,
            padding: '3px 9px',
            fontSize: 11,
            fontWeight: isSelected ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: isSelected
              ? '0 2px 6px rgba(0,0,0,0.65), inset 0 1px 1px rgba(255,255,255,0.15)'
              : 'none'
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
      const rawSaved = JSON.parse(localStorage.getItem("tab-order") || "null");
      if (Array.isArray(rawSaved)) {
        const saved = rawSaved.filter(id => id !== 11 && id !== 13);
        if (!saved.includes(12)) {
          const idx2 = saved.indexOf(2);
          if (idx2 !== -1) saved.splice(idx2 + 1, 0, 12);
          else saved.push(12);
        }
        if (!saved.includes(14)) {
          const idx12 = saved.indexOf(12);
          if (idx12 !== -1) saved.splice(idx12 + 1, 0, 14);
          else saved.push(14);
        }
        if (!saved.includes(15)) {
          const idx14 = saved.indexOf(14);
          if (idx14 !== -1) saved.splice(idx14 + 1, 0, 15);
          else saved.push(15);
        }
        if (!saved.includes(16)) {
          const idx15 = saved.indexOf(15);
          if (idx15 !== -1) saved.splice(idx15 + 1, 0, 16);
          else saved.push(16);
        }
        if (!saved.includes(17)) {
          const idx16 = saved.indexOf(16);
          if (idx16 !== -1) saved.splice(idx16 + 1, 0, 17);
          else saved.push(17);
        }
        // Self-healing: ensure any valid tab from TABS is included in tabOrder
        TABS.forEach(t => {
          if (!saved.includes(t.id)) saved.push(t.id);
        });
        localStorage.setItem("tab-order", JSON.stringify(saved));
        return saved;
      }
    } catch {}
    return [2, 12, 14, 15, 16, 17, 4, 5, 6, 7, 8, 10, 0, 1, 3, 9];
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

  // Self-healing synchronization: guarantee all tabs defined in TABS exist in tabOrder
  useEffect(() => {
    setTabOrder((prev) => {
      let changed = false;
      const updated = [...prev];
      TABS.forEach((t) => {
        if (!updated.includes(t.id)) {
          updated.push(t.id);
          changed = true;
        }
      });
      if (changed) {
        try {
          localStorage.setItem("tab-order", JSON.stringify(updated));
        } catch (_) {}
        return updated;
      }
      return prev;
    });
  }, []);

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
  const [weather, setWeather] = useState({ temp: "", status: "", humidity: "", wind: "", hourly: [] });
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
  const [tasks, setTasks] = useState(() => {
    try {
      const stored = localStorage.getItem("tasks");
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.map(t => typeof t === "string" ? t : (t?.title || t?.text || t?.name || "Untitled Task"));
      }
      return [];
    } catch {
      return [];
    }
  });
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
  const timerEndTimeRef = useRef(null);
  const isTimerRunningRef = useRef(false);

  // Volume HUD State
  const [volumeLevel, setVolumeLevel] = useState(70);
  const [volumeAlert, setVolumeAlert] = useState(false);
  const volumeAlertTimeout = useRef(null);

  // Ctrl+Hover Click-Through State
  const [ctrlHeld, setCtrlHeld] = useState(false);
  const ctrlHeldRef = useRef(false);
  const lastIgnoreRef = useRef({ ignore: true, forward: true, isCtrl: false });
  const isExternalFileDragRef = useRef(false);
  const externalFileDragTimeoutRef = useRef(null);
  const isShelfDragOutActiveRef = useRef(false);

  const updateMouseIgnore = useCallback((ignore, forward = true, isCtrlOverride = undefined) => {
    const isCtrlFlag = isCtrlOverride !== undefined ? Boolean(isCtrlOverride) : Boolean(ignore && ctrlHeldRef.current);
    if (
      lastIgnoreRef.current?.ignore === ignore &&
      lastIgnoreRef.current?.forward === forward &&
      lastIgnoreRef.current?.isCtrl === isCtrlFlag
    ) {
      return;
    }
    lastIgnoreRef.current = { ignore, forward, isCtrl: isCtrlFlag };
    if (window.electronAPI?.setIgnoreMouseEvents) {
      window.electronAPI.setIgnoreMouseEvents(ignore, forward, isCtrlFlag);
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

  // Prayer Time Alert State (Banner & Chime)
  const [prayerAlert, setPrayerAlert] = useState(null);
  const prayerAlertTimeout = useRef(null);
  const lastAlertedPrayerKey = useRef(null);

  useEffect(() => {
    const checkPrayerTime = () => {
      try {
        const cached = localStorage.getItem("quick_pill_prayer_timings");
        if (!cached) return;
        const timings = JSON.parse(cached);
        const now = new Date();
        const curH = now.getHours().toString().padStart(2, "0");
        const curM = now.getMinutes().toString().padStart(2, "0");
        const curTimeStr = `${curH}:${curM}`;

        for (const [key, t] of Object.entries(timings)) {
          if (t === curTimeStr && lastAlertedPrayerKey.current !== `${key}-${curTimeStr}`) {
            lastAlertedPrayerKey.current = `${key}-${curTimeStr}`;
            setPrayerAlert({ prayerName: key, time: t });
            playPrayerChime();

            if (prayerAlertTimeout.current) clearTimeout(prayerAlertTimeout.current);
            prayerAlertTimeout.current = setTimeout(() => {
              prayerAlertTimeout.current = null;
              setPrayerAlert(null);
            }, 15000);
            break;
          }
        }
      } catch (_) {}
    };

    const interval = setInterval(checkPrayerTime, 10000);
    return () => {
      clearInterval(interval);
      if (prayerAlertTimeout.current) clearTimeout(prayerAlertTimeout.current);
    };
  }, []);

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
      setMode("large");
      setTabState([tabNum, tabNum > currentTabId ? 1 : -1]);
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [currentTabId]);

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
      opacity: 0,
      x: direction > 0 ? 10 : direction < 0 ? -10 : 0,
      scale: 0.985
    }),
    center: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.16,
        ease: [0.16, 1, 0.3, 1]
      }
    },
    exit: (direction) => ({
      opacity: 0,
      x: direction < 0 ? 10 : direction > 0 ? -10 : 0,
      scale: 0.985,
      transition: {
        duration: 0.10,
        ease: [0.16, 1, 0.3, 1]
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
      let scrollableElem = e.target.closest("#clipboard, .notifications-container, #task-list, .task-list-scrollable, #settings-sidebar, .settings-sidebar, .settings-sidebar-scrollable, #settings-content, .settings-content, .settings-content-scrollable, #settings-container, .calendar-container, .audio-mixer-scrollable, .launcher-scrollable, .notes-scrollable, [data-scrollable='true']");
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
      target?.closest?.(".shelf-item") ||
      target?.closest?.("[draggable='true']")
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
  const isNotificationBanner = Boolean(notificationAlert && mode !== "large");
  const isPrayerBanner = Boolean(prayerAlert && mode !== "large");
  const isAnyBanner = isNotificationBanner || isPrayerBanner;
  const width = isAnyBanner
    ? (isPrayerBanner ? 320 : 300)
    : mode === "large"
      ? (currentTab === 14 ? 885 : (currentTab === 9 ? 620 : (currentTab === 12 || currentTab === 15 ? 590 : (currentTab === 16 || currentTab === 17 ? 560 : (currentTab === 2 ? 560 : (currentTab === 1 ? 555 : 540))))))
      : (mode === "quick" && isPlaying && !alert && !chargingAlert && !bluetoothAlert && !cameraAlert && !microphoneAlert && !volumeAlert && !keyLockAlert && !usbAlert && !notificationAlert && !prayerAlert)
        ? nowPlayingWidth
        : (mode === "quick" || alert || chargingAlert || bluetoothAlert || cameraAlert || microphoneAlert || volumeAlert || keyLockAlert || usbAlert || notificationAlert || prayerAlert)
          ? 260
          : isPlaying
            ? nowPlayingWidth
            : 170;
  const height = isAnyBanner
    ? 46
    : mode === "large"
      ? (currentTab === 14 ? 278 : (currentTab === 9 ? 220 : (currentTab === 15 ? 185 : (currentTab === 16 || currentTab === 17 ? 175 : (currentTab === 12 ? 175 : (currentTab === 1 ? 162 : 145))))))
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

  // Get Weather (including 3-slot hourly forecast for Overview screen)
  useEffect(() => {
    let isCancelled = false;
    const getWeather = async () => {
      const loc = localStorage.getItem("location") || weatherLocation;
      const unit = localStorage.getItem("weather-unit") || weatherUnit || "f";
      const q = loc && loc.trim() ? encodeURIComponent(loc.trim()) : "auto:ip";
      const tempKey = unit === "c" ? "temp_c" : "temp_f";

      try {
        const response = await fetch(
          `https://api.weatherapi.com/v1/forecast.json?key=0b18c67c443543e0a6045401250911&q=${q}&days=2&aqi=no&alerts=no`
        );
        if (response.ok) {
          const data = await response.json();
          if (data?.current && !isCancelled) {
            const tempVal = Math.round(data.current[tempKey]);
            if (!isNaN(tempVal)) {
              const statusText = data.current.condition?.text || "Partly Cloudy";
              const nowHour = new Date().getHours();
              const allHours = [
                ...(data.forecast?.forecastday?.[0]?.hour || []),
                ...(data.forecast?.forecastday?.[1]?.hour || [])
              ];
              const h1Obj = allHours[nowHour + 1];
              const h2Obj = allHours[nowHour + 2];

              const hourlySlots = [
                {
                  temp: tempVal,
                  status: statusText,
                  hour24: nowHour,
                  isNow: true
                },
                {
                  temp: h1Obj && !isNaN(Math.round(h1Obj[tempKey])) ? Math.round(h1Obj[tempKey]) : tempVal - 1,
                  status: h1Obj?.condition?.text || statusText,
                  hour24: (nowHour + 1) % 24,
                  isNow: false
                },
                {
                  temp: h2Obj && !isNaN(Math.round(h2Obj[tempKey])) ? Math.round(h2Obj[tempKey]) : tempVal - 2,
                  status: h2Obj?.condition?.text || statusText,
                  hour24: (nowHour + 2) % 24,
                  isNow: false
                }
              ];

              setWeather({
                temp: tempVal,
                status: statusText,
                humidity: data.current.humidity ? `${data.current.humidity}%` : "",
                wind: data.current.wind_mph ? `${Math.round(data.current.wind_mph)} mph` : "",
                hourly: hourlySlots
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
              const statusText = current.weatherDesc?.[0]?.value || "Partly Cloudy";
              const nowHour = new Date().getHours();
              const hourlySlots = [
                { temp: tempVal, status: statusText, hour24: nowHour, isNow: true },
                { temp: tempVal - 1, status: statusText, hour24: (nowHour + 1) % 24, isNow: false },
                { temp: tempVal - 2, status: statusText, hour24: (nowHour + 2) % 24, isNow: false }
              ];
              setWeather({
                temp: tempVal,
                status: statusText,
                humidity: current.humidity ? `${current.humidity}%` : "",
                wind: current.windspeedMiles ? `${current.windspeedMiles} mph` : "",
                hourly: hourlySlots
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
          clearTimeout(notificationAlertTimeout.current);
          notificationAlertTimeout.current = setTimeout(() => {
            setNotificationAlert(null);
            setMode("still");
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
        const ok = await window.electronAPI.focusNotificationApp(params.appId || notificationId);
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
          updateMouseIgnore(true, true, true);
        } else {
          if (ctrlHeldRef.current) {
            setCtrlState(false);
          }
          updateMouseIgnore(false, true, false);
        }
      } else {
        if (ctrlHeldRef.current) {
          setCtrlState(false);
        }
        if (!isDraggingRef.current && !isExternalFileDragRef.current && !isShelfDragOutActiveRef.current) {
          updateMouseIgnore(true, true, false);
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

  useEffect(() => {
    try {
      const safeTasks = Array.isArray(tasks)
        ? tasks.map(t => typeof t === "string" ? t : (t?.title || t?.text || t?.name || "Untitled Task"))
        : [];
      localStorage.setItem("tasks", JSON.stringify(safeTasks));
    } catch (_) {}
  }, [tasks]);

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
      if (e.key === "ArrowRight") {
        moveTab(1);
      } else if (e.key === "ArrowLeft") {
        moveTab(-1);
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
  }, [moveTab, visibleTabs, currentTabId, tabShortcuts, recordingTabId]);

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

  // Keep main process informed of #Island bounds so native cursor-in-notch watcher
  // can wake the window during external OS file drags (DoDragDrop)
  const syncIslandBoundsToMain = useCallback(() => {
    if (!window.electronAPI?.updateIslandBounds) return;
    const elem = document.getElementById("Island");
    if (!elem) return;
    const rect = elem.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      window.electronAPI.updateIslandBounds({
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom)
      });
    }
  }, []);

  useEffect(() => {
    syncIslandBoundsToMain();
    const t1 = setTimeout(syncIslandBoundsToMain, 180);
    const t2 = setTimeout(syncIslandBoundsToMain, 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [mode, currentTab, width, height, positionMode, islandX, islandY, isTransitioning, syncIslandBoundsToMain]);

  // Global file drag-and-drop & native cursor watcher integration
  useEffect(() => {
    const hasFilesInDrag = (e) => {
      const types = e?.dataTransfer?.types;
      if (!types) return false;
      return Array.from(types).includes("Files");
    };

    const handleWindowFileDragOver = (e) => {
      if (!hasFilesInDrag(e)) return;
      if (isShelfDragOutActiveRef.current) return;
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
      if (mouseLeaveTimer.current) {
        clearTimeout(mouseLeaveTimer.current);
        mouseLeaveTimer.current = null;
      }
      isExternalFileDragRef.current = true;
      setHoverState(true);
      updateMouseIgnore(false, true);
      setMode("large");
      setTabState((prev) => (prev[0] === 16 ? prev : [16, 1]));
      window.dispatchEvent(new CustomEvent("quick-pill-file-drag-over"));

      if (externalFileDragTimeoutRef.current) {
        clearTimeout(externalFileDragTimeoutRef.current);
      }
      externalFileDragTimeoutRef.current = setTimeout(() => {
        isExternalFileDragRef.current = false;
        window.dispatchEvent(new CustomEvent("quick-pill-file-drag-end"));
      }, 280);
    };

    const handleNativeDragStart = () => {
      isShelfDragOutActiveRef.current = true;
      lastIgnoreRef.current = { ignore: true, forward: true, isCtrl: false };
      if (mouseLeaveTimer.current) {
        clearTimeout(mouseLeaveTimer.current);
        mouseLeaveTimer.current = null;
      }
    };

    let unsubDragEnd = null;
    if (window.electronAPI?.shelf?.onDragEnded) {
      unsubDragEnd = window.electronAPI.shelf.onDragEnded(() => {
        isShelfDragOutActiveRef.current = false;
        lastIgnoreRef.current = { ignore: true, forward: true, isCtrl: false };
      });
    }

    let unsubCursorEntered = null;
    if (window.electronAPI?.onIslandCursorEntered) {
      unsubCursorEntered = window.electronAPI.onIslandCursorEntered(() => {
        lastIgnoreRef.current = { ignore: false, forward: true, isCtrl: false };
      });
    }

    let unsubCursorOutside = null;
    if (window.electronAPI?.onIslandCursorOutside) {
      unsubCursorOutside = window.electronAPI.onIslandCursorOutside(() => {
        if (isDraggingRef.current || isShelfDragOutActiveRef.current || isExternalFileDragRef.current) {
          return;
        }
        setHoverState(false);
        updateMouseIgnore(true, true);
        if (standbyBorderEnabled) {
          setMode("quick");
        } else if (largeStandbyEnabled) {
          setMode("large");
        } else {
          setMode("still");
        }
      });
    }

    window.addEventListener("dragenter", handleWindowFileDragOver);
    window.addEventListener("dragover", handleWindowFileDragOver);
    window.addEventListener("shelf-native-drag-start", handleNativeDragStart);

    return () => {
      window.removeEventListener("dragenter", handleWindowFileDragOver);
      window.removeEventListener("dragover", handleWindowFileDragOver);
      window.removeEventListener("shelf-native-drag-start", handleNativeDragStart);
      if (typeof unsubDragEnd === "function") unsubDragEnd();
      if (typeof unsubCursorEntered === "function") unsubCursorEntered();
      if (typeof unsubCursorOutside === "function") unsubCursorOutside();
    };
  }, [setHoverState, updateMouseIgnore, standbyBorderEnabled, largeStandbyEnabled]);

  useEffect(() => {
    const handleFocusOut = () => {
      // Reset album hover state when window loses focus
      setAlbumHovered(false);
      setAlbumRotation({ x: 0, y: 0 });

      setTimeout(() => {
        if (!isHovered && !isExternalFileDragRef.current && !isShelfDragOutActiveRef.current) {
          const activeTag = document.activeElement?.tagName;
          const isLauncher = currentTab === 14;
          if (isLauncher || (activeTag !== "INPUT" && activeTag !== "TEXTAREA" && activeTag !== "SELECT")) {
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
  }, [isHovered, standbyBorderEnabled, largeStandbyEnabled, currentTab]);

  useEffect(() => {
    if (!isDragging && !isHovered && !isExternalFileDragRef.current && !isShelfDragOutActiveRef.current) {
      const activeTag = document.activeElement?.tagName;
      const isLauncher = currentTab === 14;
      if (isLauncher && (activeTag === "INPUT" || activeTag === "TEXTAREA")) {
        document.activeElement?.blur();
      }
      if (isLauncher || (activeTag !== "INPUT" && activeTag !== "TEXTAREA")) {
        if (standbyBorderEnabled) {
          setMode("quick");
        } else if (largeStandbyEnabled) {
          setMode("large");
        } else {
          setMode("still");
        }
      }
    }
  }, [isDragging, isHovered, standbyBorderEnabled, largeStandbyEnabled, currentTab]);

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
      onDragEnter={(e) => {
        const types = e.dataTransfer?.types ? Array.from(e.dataTransfer.types) : [];
        if (types.includes("Files") && !isShelfDragOutActiveRef.current) {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
          isExternalFileDragRef.current = true;
          setHoverState(true);
          updateMouseIgnore(false, true);
          setMode("large");
          if (currentTab !== 16) {
            setTabState([16, 1]);
          }
          window.dispatchEvent(new CustomEvent("quick-pill-file-drag-over"));
        }
      }}
      onDragOver={(e) => {
        const types = e.dataTransfer?.types ? Array.from(e.dataTransfer.types) : [];
        if (types.includes("Files") && !isShelfDragOutActiveRef.current) {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
          isExternalFileDragRef.current = true;
          setHoverState(true);
          updateMouseIgnore(false, true);
          setMode("large");
          if (currentTab !== 16) {
            setTabState([16, 1]);
          }
          window.dispatchEvent(new CustomEvent("quick-pill-file-drag-over"));
        }
      }}
      onDrop={async (e) => {
        if (externalFileDragTimeoutRef.current) {
          clearTimeout(externalFileDragTimeoutRef.current);
          externalFileDragTimeoutRef.current = null;
        }
        isExternalFileDragRef.current = false;
        window.dispatchEvent(new CustomEvent("quick-pill-file-drag-end"));

        if (isShelfDragOutActiveRef.current) {
          isShelfDragOutActiveRef.current = false;
          return;
        }

        const filePaths = extractFilePathsFromDataTransfer(e.dataTransfer);
        if (filePaths.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          updateMouseIgnore(false, true);
          setMode("large");
          setTabState([16, 1]);
          if (window.electronAPI?.shelf?.addFiles) {
            try {
              await window.electronAPI.shelf.addFiles(filePaths);
            } catch (err) {
              console.error("Failed to add files via global notch drop:", err);
            }
          }
        }
      }}
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
          // If a temporary notification alert or prayer alert is currently active, DO NOT force large mode!
          // Keep the notification banner visible and pause the auto-dismiss timer so user can read or click it.
          if (notificationAlert) {
            if (notificationAlertTimeout.current) {
              clearTimeout(notificationAlertTimeout.current);
              notificationAlertTimeout.current = null;
            }
            updateMouseIgnore(false, true);
            return;
          }
          if (prayerAlert) {
            if (prayerAlertTimeout.current) {
              clearTimeout(prayerAlertTimeout.current);
              prayerAlertTimeout.current = null;
            }
            updateMouseIgnore(false, true);
            return;
          }
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
        if (isDraggingRef.current || isExternalFileDragRef.current || isShelfDragOutActiveRef.current) return;
        if (mouseLeaveTimer.current) clearTimeout(mouseLeaveTimer.current);
        mouseLeaveTimer.current = setTimeout(() => {
          mouseLeaveTimer.current = null;
          setHoverState(false);
          updateMouseIgnore(true, true);

          const activeTag = document.activeElement?.tagName;
          const isLauncher = currentTab === 14;
          if (isLauncher && (activeTag === "INPUT" || activeTag === "TEXTAREA")) {
            document.activeElement?.blur();
          } else if (activeTag === "INPUT" || activeTag === "TEXTAREA") {
            return;
          }

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
            }, 3000);
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
        stiffness: 380,
        damping: 35,
        mass: 0.6,
        x: { duration: 0.15 }
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
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '0 12px 0 14px',
                  gap: 8,
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleExecuteAction(notificationAlert.id, 'open', { appId: notificationAlert.appId });
                  setNotificationAlert(null);
                  if (notificationAlertTimeout.current) {
                    clearTimeout(notificationAlertTimeout.current);
                  }
                  if (standbyBorderEnabled) {
                    setMode("quick");
                  } else if (largeStandbyEnabled) {
                    setMode("large");
                  } else {
                    setMode("still");
                  }
                }}
              >
                {notificationAlert.isCall ? (
                  <div className="notification-call-pulsing-icon" style={{ width: 26, height: 26 }}>
                    <PhoneIncoming size={14} color="#ffffff" />
                  </div>
                ) : notificationAlert.icon ? (
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
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    opacity: notificationAlert.isCall ? 0.9 : 0.5,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: notificationAlert.isCall ? '#25d366' : textColor,
                    lineHeight: 1
                  }}>
                    {notificationAlert.isCall ? `Incoming ${notificationAlert.callType || 'Voice'} Call` : notificationAlert.appName}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                    {notificationAlert.title || notificationAlert.body}
                  </span>
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {notificationAlert.isCall ? (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExecuteAction(notificationAlert.id, 'open', { appId: notificationAlert.appId });
                        setNotificationAlert(null);
                      }}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 12,
                        background: '#25d366',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        cursor: 'pointer'
                      }}
                      title="Open and Answer Call"
                    >
                      <Phone size={10} /> Answer
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.16)' }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSnooze(notificationAlert.id, 5);
                        setNotificationAlert(null);
                        if (notificationAlertTimeout.current) clearTimeout(notificationAlertTimeout.current);
                      }}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: 'none',
                        color: textColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        opacity: 0.7
                      }}
                      title="Snooze for 5 minutes"
                    >
                      <Clock size={11} strokeWidth={2} />
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.16)' }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExecuteAction(notificationAlert.id, 'dismiss');
                      setNotificationAlert(null);
                      if (notificationAlertTimeout.current) {
                        clearTimeout(notificationAlertTimeout.current);
                      }
                      if (standbyBorderEnabled) {
                        setMode("quick");
                      } else if (largeStandbyEnabled) {
                        setMode("large");
                      } else {
                        setMode("still");
                      }
                    }}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      color: textColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      padding: 0,
                      opacity: 0.7
                    }}
                    title="Dismiss notification"
                  >
                    <X size={11} strokeWidth={2.5} />
                  </motion.button>
                </div>
              </motion.div>
          ) : prayerAlert && !keyLockAlert && !usbAlert ? (
            <motion.div
              key={`prayer-alert-${prayerAlert.prayerName}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0 20px',
                boxSizing: 'border-box',
                overflow: 'hidden',
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setPrayerAlert(null);
                if (prayerAlertTimeout.current) {
                  clearTimeout(prayerAlertTimeout.current);
                  prayerAlertTimeout.current = null;
                }
                setMode('large');
                setTabState([17, 1]);
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                  {prayerAlert.prayerName}
                </span>
                <span style={{ fontSize: 11.5, color: '#9ca3af', lineHeight: 1.2 }}>
                  It's time to pray
                </span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
                {prayerAlert.time}
              </span>
            </motion.div>
          ) : (isPlaying || showPausedQuickView) && !alert && !chargingAlert && !bluetoothAlert && !cameraAlert && !microphoneAlert && !keyLockAlert && !usbAlert && !notificationAlert && !prayerAlert && !isTimerRunning && timerSeconds === 0 ? (
            <motion.div
              key={spotifyTrack?.name ? `playing-${spotifyTrack.name}-${spotifyTrack.artist}` : "playing"}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
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
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
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

      <AnimatePresence custom={direction} mode="wait">
        {mode === "large" && (
          <motion.div
            key={currentTabId}
            custom={direction}
            variants={tabVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              borderRadius: "inherit"
            }}
          >
            {/* Browser Search (3D Spotlight Command Deck — #DA3A28 Accent) */}
            {currentTab === 0 && (() => {
              const iosFontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Rounded", "OpenRunde", system-ui, sans-serif';
              const searchAccent = '#DA3A28';
              const quickEngines = [
                {
                  label: 'Google',
                  searchUrl: 'https://www.google.com/search?q=',
                  homeUrl: 'https://www.google.com',
                  icon: (
                    <svg width="12" height="12" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )
                },
                {
                  label: 'YouTube',
                  searchUrl: 'https://www.youtube.com/results?search_query=',
                  homeUrl: 'https://www.youtube.com',
                  icon: (
                    <svg width="13" height="13" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                      <path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  )
                },
                {
                  label: 'GitHub',
                  searchUrl: 'https://github.com/search?q=',
                  homeUrl: 'https://github.com',
                  icon: (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff" style={{ flexShrink: 0 }}>
                      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                    </svg>
                  )
                },
                {
                  label: 'ChatGPT',
                  searchUrl: 'https://chatgpt.com/?q=',
                  homeUrl: 'https://chatgpt.com',
                  icon: (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#10A37F" style={{ flexShrink: 0 }}>
                      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
                    </svg>
                  )
                },
                {
                  label: 'Claude.ai',
                  searchUrl: 'https://claude.ai/new?q=',
                  homeUrl: 'https://claude.ai',
                  icon: (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#D97757" style={{ flexShrink: 0 }}>
                      <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" />
                    </svg>
                  )
                }
              ];

              const triggerQuickEngine = (eng) => {
                const q = (browserSearch || '').trim();
                const targetUrl = q ? `${eng.searchUrl}${encodeURIComponent(q)}` : eng.homeUrl;
                window.electronAPI?.openExternal?.(targetUrl);
                setBrowserSearch('');
              };

              return (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    boxSizing: 'border-box',
                    userSelect: 'none',
                    fontFamily: iosFontStack
                  }}
                >
                  {/* Top Header Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          background: 'linear-gradient(180deg, #3b1510 0%, #220b08 100%)',
                          border: '1px solid rgba(218, 58, 40, 0.45)',
                          boxShadow: '0 3px 8px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.18)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Search size={11} color={searchAccent} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.1px' }}>
                        Web & URL Command
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: '#0a0909',
                        border: '1px solid rgba(218, 58, 40, 0.32)',
                        boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.85)',
                        color: searchAccent,
                        letterSpacing: '0.4px',
                        textTransform: 'uppercase'
                      }}
                    >
                      {(browserSearch || '').includes('.') && !(browserSearch || '').includes(' ') ? 'Direct URL' : 'Search Query'}
                    </span>
                  </div>

                  {/* Center Sunken 3D Search Trough */}
                  <div
                    style={{
                      width: '100%',
                      height: 44,
                      borderRadius: 14,
                      background: 'linear-gradient(180deg, #090809 0%, #121012 100%)',
                      border: '1px solid rgba(218, 58, 40, 0.32)',
                      boxShadow: `
                        0 6px 16px rgba(0, 0, 0, 0.75),
                        inset 0 4px 10px rgba(0, 0, 0, 0.95),
                        inset 0 -1px 1px rgba(255, 255, 255, 0.06)
                      `,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 6px 0 14px',
                      boxSizing: 'border-box',
                      gap: 10
                    }}
                  >
                    <Search size={15} color={searchAccent} style={{ flexShrink: 0, filter: 'drop-shadow(0 0 5px rgba(218, 58, 40, 0.45))' }} />
                    <input
                      id="browser-searchbar"
                      placeholder="Search Google, type a query, or enter URL..."
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
                        width: '100%',
                        height: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        boxShadow: 'none',
                        padding: 0,
                        margin: 0,
                        color: '#ffffff',
                        fontSize: 13.5,
                        fontWeight: 500,
                        fontFamily: iosFontStack
                      }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.03, filter: 'brightness(1.12)' }}
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      onClick={() => searchBrowser()}
                      style={{
                        height: 32,
                        padding: '0 14px',
                        borderRadius: 10,
                        background: 'linear-gradient(180deg, #3b1510 0%, #220b08 100%)',
                        border: '1px solid rgba(218, 58, 40, 0.48)',
                        boxShadow: `
                          0 4px 10px rgba(0, 0, 0, 0.75),
                          inset 0 1px 1px rgba(255, 255, 255, 0.2),
                          inset 0 -1.5px 2px rgba(0, 0, 0, 0.85)
                        `,
                        color: searchAccent,
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: iosFontStack,
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      Launch
                    </motion.button>
                  </div>

                  {/* Bottom Row: 5 Tactile 3D Quick-Engine / Site Capsules */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: 7,
                      width: '100%'
                    }}
                  >
                    {quickEngines.map((eng) => (
                      <motion.button
                        key={eng.label}
                        type="button"
                        whileHover={{ y: -1.5, scale: 1.03 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => triggerQuickEngine(eng)}
                        style={{
                          height: 27,
                          borderRadius: 9,
                          background: 'linear-gradient(180deg, #1d1e26 0%, #121318 100%)',
                          border: '1px solid rgba(255, 255, 255, 0.09)',
                          boxShadow: `
                            0 4px 9px rgba(0, 0, 0, 0.7),
                            inset 0 1px 1px rgba(255, 255, 255, 0.12),
                            inset 0 -1px 2px rgba(0, 0, 0, 0.85)
                          `,
                          color: 'rgba(255, 255, 255, 0.88)',
                          fontSize: 10.5,
                          fontWeight: 600,
                          fontFamily: iosFontStack,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 5.5,
                          padding: '0 6px'
                        }}
                      >
                        {eng.icon}
                        <span>{eng.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Weather Dashboard (Redesigned per Reference Image: Left 3D Hero Pod with stacked condition, Sunrise/Sunset, Wind/Humidity + Right 3-Row Stacked Forecast + Bottom-Right 3D Cloud) */}
            {currentTab === 1 && (() => {
              const locName = localStorage.getItem("location") || weatherLocation || "CHATTOGRAM";
              const tempVal = typeof weather.temp === "number" && !isNaN(weather.temp) ? weather.temp : 28;
              const statusStr = weather.status || "Partly Sunny";
              const humidityVal = weather.humidity || "65%";
              const windVal = weather.wind || "12 km/h";
              const iosFontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Rounded", "OpenRunde", system-ui, sans-serif';

              // Day / Night detection based on status or current local hour (18:00 - 06:00 is night)
              const d = new Date();
              const currentHour = d.getHours();
              const statusLower = (statusStr || "").toLowerCase();
              const isNightTime = statusLower.includes("night") || statusLower.includes("moon") || (currentHour >= 18 || currentHour < 6);

              // Stealth night theme matching reference image: deep charcoal canvas (#0B0C10) with frosted ice-blue accents (#D4ECFA)
              // Day theme: warm dark charcoal with vibrant sun gold accents (#FFD801)
              const iceBlueAccent = "#D4ECFA";
              const sunGoldAccent = "#FFD801";

              // Format date & time for top-right header: e.g. "11 Nov, 12:20 AM"
              const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              let timeStr = "";
              if (hourFormat) {
                const h12 = currentHour % 12 || 12;
                const m = String(d.getMinutes()).padStart(2, '0');
                const ampm = currentHour >= 12 ? "PM" : "AM";
                timeStr = `${h12}:${m} ${ampm}`;
              } else {
                const h24 = String(currentHour).padStart(2, '0');
                const m = String(d.getMinutes()).padStart(2, '0');
                timeStr = `${h24}:${m}`;
              }

              // Parse condition text into uppercase lines
              const conditionWords = (statusStr || "PARTLY CLOUDY").trim().toUpperCase().split(/\s+/);
              const firstWord = conditionWords[0] || "PARTLY";
              const restWords = conditionWords.slice(1).join(" ");

              // Sunrise & sunset times (from data or realistic astronomical fallback)
              const sunriseTime = weather.sunrise || "6:24 AM";
              const sunsetTime = weather.sunset || "7:08 PM";

              // 3-day forecast items with Today highlighted in 3D active pod
              const forecastRows = [
                {
                  id: "today",
                  day: "Today",
                  icon: isNightTime ? "Night Cloudy" : statusStr,
                  hi: `${tempVal + 2}°`,
                  lo: `${tempVal - 6}°`,
                  rain: "5%",
                  isActive: true
                },
                {
                  id: "tomorrow",
                  day: "Tomorrow",
                  icon: "Partly Cloudy",
                  hi: `${tempVal}°`,
                  lo: `${tempVal - 7}°`,
                  rain: "15%",
                  isActive: false
                },
                {
                  id: "next_day",
                  day: "Next Day",
                  icon: "Rain",
                  hi: `${tempVal - 3}°`,
                  lo: `${tempVal - 9}°`,
                  rain: "80%",
                  isActive: false
                }
              ];

              return (
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 13px',
                  boxSizing: 'border-box',
                  gap: 13,
                  userSelect: 'none',
                  overflow: 'hidden',
                  fontFamily: iosFontStack
                }}>
                  {/* Decorative 3D Atmospheric Cloud in Bottom-Right Corner (from Reference Image) */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -16,
                      right: -10,
                      pointerEvents: 'none',
                      zIndex: 1,
                      opacity: isNightTime ? 0.78 : 0.88,
                      filter: 'drop-shadow(0 -4px 14px rgba(147, 197, 253, 0.28))'
                    }}
                  >
                    <svg width="128" height="85" viewBox="0 0 128 85" fill="none">
                      <defs>
                        <linearGradient id="cloudBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={isNightTime ? "#dbeafe" : "#ffffff"} />
                          <stop offset="50%" stopColor={isNightTime ? "#93c5fd" : "#e0f2fe"} />
                          <stop offset="100%" stopColor={isNightTime ? "#3b82f6" : "#7dd3fc"} />
                        </linearGradient>
                        <linearGradient id="cloudHighlightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                          <stop offset="100%" stopColor={isNightTime ? "#93c5fd" : "#bae6fd"} stopOpacity="0.25" />
                        </linearGradient>
                      </defs>
                      {/* Back cloud lobe with depth */}
                      <ellipse cx="94" cy="50" rx="30" ry="24" fill="url(#cloudBodyGrad)" opacity="0.65" />
                      {/* Base cloud volumetric mass */}
                      <path
                        d="M26 72 C26 58 40 48 54 48 C60 36 74 27 90 31 C104 35 114 47 114 60 C122 63 126 70 122 76 C118 82 110 83 100 83 L36 83 C29 83 26 78 26 72 Z"
                        fill="url(#cloudBodyGrad)"
                      />
                      {/* Soft 3D volumetric highlights */}
                      <ellipse cx="68" cy="50" rx="18" ry="14" fill="url(#cloudHighlightGrad)" />
                      <ellipse cx="96" cy="46" rx="15" ry="11" fill="url(#cloudHighlightGrad)" />
                    </svg>
                  </div>

                  {/* LEFT HERO CARD: 3D Beveled Stealth Well */}
                  <div
                    style={{
                      width: 218,
                      height: '100%',
                      flexShrink: 0,
                      borderRadius: 16,
                      padding: '8px 11px',
                      boxSizing: 'border-box',
                      background: isNightTime
                        ? 'linear-gradient(155deg, #181921 0%, #0e1015 55%, #08090d 100%)'
                        : 'linear-gradient(155deg, #2b2514 0%, #17150c 55%, #0b0905 100%)',
                      border: isNightTime
                        ? '1px solid rgba(255, 255, 255, 0.09)'
                        : '1px solid rgba(255, 216, 1, 0.25)',
                      boxShadow: `
                        0 8px 20px rgba(0, 0, 0, 0.85),
                        inset 0 1px 1px rgba(255, 255, 255, 0.12),
                        inset 0 -2px 4px rgba(0, 0, 0, 0.9)
                      `,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      zIndex: 2
                    }}
                  >
                    {/* Top Row: Weather Sphere + Giant Temp & H/L */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.8))' }}>
                        <Animated3DWeatherIcon status={statusStr} size={36} isNight={isNightTime} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <div
                          style={{
                            fontSize: 27,
                            fontWeight: 800,
                            color: isNightTime ? iceBlueAccent : '#ffffff',
                            letterSpacing: '-1px',
                            lineHeight: 1,
                            textShadow: isNightTime
                              ? '0 2px 10px rgba(212, 236, 250, 0.35)'
                              : '0 2px 10px rgba(255, 216, 1, 0.3)'
                          }}
                        >
                          {tempVal}°{weatherUnit === 'f' ? 'F' : 'C'}
                        </div>
                        <div
                          style={{
                            fontSize: 9.5,
                            fontWeight: 600,
                            color: 'rgba(255, 255, 255, 0.45)',
                            marginTop: 2.5
                          }}
                        >
                          H {tempVal + 2}°  |  L {tempVal - 6}°
                        </div>
                      </div>
                    </div>

                    {/* Middle Row: Stacked Condition Text (Left) + Sunrise/Sunset (Right) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, margin: '2px 0' }}>
                      {/* Left: Stacked Condition Typography */}
                      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 900, color: '#ffffff', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                          {firstWord}
                        </span>
                        {restWords ? (
                          <span style={{ fontSize: 13.5, fontWeight: 900, color: '#ffffff', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                            {restWords}
                          </span>
                        ) : null}
                      </div>

                      {/* Right: Sunrise & Sunset with Icons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                        {/* Sunrise */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 600, color: 'rgba(255, 255, 255, 0.62)' }}>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: isNightTime ? '#93c5fd' : '#fde047' }}>
                            <path d="M2 13h12" />
                            <path d="M4 10a4 4 0 0 1 8 0" />
                            <path d="M8 2v4" />
                            <path d="M6 4l2-2 2 2" />
                          </svg>
                          <span>{sunriseTime}</span>
                        </div>
                        {/* Sunset */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 600, color: 'rgba(255, 255, 255, 0.62)' }}>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: isNightTime ? '#f472b6' : '#fb923c' }}>
                            <path d="M2 13h12" />
                            <path d="M4 10a4 4 0 0 1 8 0" />
                            <path d="M8 6v4" />
                            <path d="M6 8l2 2 2-2" />
                          </svg>
                          <span>{sunsetTime}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Wind & Humidity */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      {/* Wind */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Wind size={13} color={isNightTime ? "#93c5fd" : "#FFD801"} style={{ opacity: 0.85 }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 7.5, fontWeight: 800, color: 'rgba(255, 255, 255, 0.42)', letterSpacing: '0.5px' }}>WIND</span>
                          <span style={{ fontSize: 9.5, fontWeight: 700, color: '#ffffff' }}>{windVal}</span>
                        </div>
                      </div>
                      {/* Humidity */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Droplets size={13} color={isNightTime ? "#93c5fd" : "#FFD801"} style={{ opacity: 0.85 }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 7.5, fontWeight: 800, color: 'rgba(255, 255, 255, 0.42)', letterSpacing: '0.5px' }}>HUMIDITY</span>
                          <span style={{ fontSize: 9.5, fontWeight: 700, color: '#ffffff' }}>{humidityVal}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT PANEL: Top Header Bar + 3-Row Stacked Forecast Deck */}
                  <div style={{
                    flex: 1,
                    minWidth: 0,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    zIndex: 2
                  }}>
                    {/* Top Header Bar: Location (Left) + Live Date & Time (Right) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 3px' }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          letterSpacing: '0.8px',
                          color: isNightTime ? 'rgba(255, 255, 255, 0.85)' : '#FFD801',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 150
                        }}
                      >
                        {locName}
                      </span>
                      <div style={{ fontSize: 10, fontFamily: iosFontStack }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.48)' }}>{dateStr}, </span>
                        <span style={{ color: '#ffffff', fontWeight: 700 }}>{timeStr}</span>
                      </div>
                    </div>

                    {/* 3 Stacked Horizontal Forecast Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                      {forecastRows.map((fc) => (
                        <motion.div
                          key={fc.id}
                          whileHover={{ x: 2, scale: 1.01 }}
                          style={{
                            height: 33,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0 10px',
                            borderRadius: 10,
                            boxSizing: 'border-box',
                            background: fc.isActive
                              ? (isNightTime
                                ? 'linear-gradient(180deg, #1d202b 0%, #11131a 100%)'
                                : 'linear-gradient(180deg, #2b2515 0%, #18150c 100%)')
                              : (isNightTime
                                ? 'linear-gradient(180deg, #13141a 0%, #090a0d 100%)'
                                : 'linear-gradient(180deg, #1c180e 0%, #0d0c07 100%)'),
                            border: fc.isActive
                              ? (isNightTime
                                ? '1px solid rgba(212, 236, 250, 0.24)'
                                : '1px solid rgba(255, 216, 1, 0.32)')
                              : '1px solid rgba(255, 255, 255, 0.06)',
                            boxShadow: fc.isActive
                              ? `0 4px 10px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.15), inset 0 -1px 2px rgba(0, 0, 0, 0.8)`
                              : `0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.07)`,
                            transition: 'all 0.12s ease'
                          }}
                        >
                          {/* Left: Weather Icon + Day Name */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <Animated3DWeatherIcon status={fc.icon} size={20} isNight={isNightTime} />
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: fc.isActive ? 800 : 700,
                                color: fc.isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.82)'
                              }}
                            >
                              {fc.day}
                            </span>
                          </div>

                          {/* Center: Rain Probability Pill */}
                          <span
                            style={{
                              fontSize: 8.5,
                              fontWeight: 700,
                              padding: '1.5px 6px',
                              borderRadius: 6,
                              background: isNightTime ? 'rgba(56, 189, 248, 0.14)' : 'rgba(255, 216, 1, 0.14)',
                              border: isNightTime ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(255, 216, 1, 0.3)',
                              color: isNightTime ? '#7dd3fc' : '#fde047'
                            }}
                          >
                            {fc.rain} rain
                          </span>

                          {/* Right: High & Low Temperature */}
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#ffffff' }}>
                              {fc.hi}
                            </span>
                            <span style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255, 255, 255, 0.42)' }}>
                              {fc.lo}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* Overview / 3D iOS Analog Clock & Hourly Weather Tab */}
            {currentTab === 2 && (() => {
              const d = new Date();
              const weekdayFull = d.toLocaleDateString('en-US', { weekday: 'long' });
              const monthFull = d.toLocaleDateString('en-US', { month: 'long' });
              const dayOrdinal = getOrdinalSuffix(d.getDate());
              const unitChar = weatherUnit === 'f' ? 'F' : 'C';
              const fallbackTemp = typeof weather?.temp === "number" && !isNaN(weather.temp)
                ? weather.temp
                : (weatherUnit === 'f' ? 68 : 24);
              const fallbackStatus = weather?.status || "Partly Cloudy";
              const nowHour = d.getHours();

              const formatForecastHour = (h24, isNow) => {
                if (isNow) return "Now";
                const normalized = ((h24 % 24) + 24) % 24;
                if (hourFormat) {
                  const h12 = normalized % 12 || 12;
                  return `${String(h12).padStart(2, '0')}:00`;
                }
                return `${String(normalized).padStart(2, '0')}:00`;
              };

              const rawSlots = Array.isArray(weather?.hourly) && weather.hourly.length === 3
                ? weather.hourly
                : [
                    { temp: fallbackTemp, status: fallbackStatus, hour24: nowHour, isNow: true },
                    { temp: fallbackTemp - 1, status: fallbackStatus, hour24: (nowHour + 1) % 24, isNow: false },
                    { temp: fallbackTemp - 2, status: fallbackStatus, hour24: (nowHour + 2) % 24, isNow: false }
                  ];

              const iosFontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Rounded", "OpenRunde", system-ui, sans-serif';

              return (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 26px 10px 22px',
                  boxSizing: 'border-box',
                  gap: 24,
                  userSelect: 'none'
                }}>
                  {/* Left: 3D Dark-Themed iOS Analog Clock */}
                  <IOS3DAnalogClock size={122} />

                  {/* Right: Date Header + Divider + 3-Column Hourly Weather Forecast (Image 1 Layout) */}
                  <div style={{
                    flex: 1,
                    minWidth: 0,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontFamily: iosFontStack
                  }}>
                    {/* Top Date Stack: Weekday ("Thursday") + Month & Ordinal Day ("November 5th") */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      marginBottom: 7
                    }}>
                      <span style={{
                        fontSize: 13.5,
                        fontWeight: 500,
                        color: 'rgba(255, 255, 255, 0.88)',
                        letterSpacing: '-0.1px',
                        lineHeight: 1.15,
                        fontFamily: iosFontStack
                      }}>
                        {weekdayFull}
                      </span>
                      <span style={{
                        fontSize: 26,
                        fontWeight: 600,
                        color: '#ffffff',
                        letterSpacing: '-0.6px',
                        lineHeight: 1.12,
                        marginTop: 1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontFamily: iosFontStack
                      }}>
                        {monthFull} {dayOrdinal}
                      </span>
                    </div>

                    {/* Thin Horizontal Divider Line */}
                    <div style={{
                      width: '92%',
                      height: 1,
                      background: 'rgba(255, 255, 255, 0.22)',
                      marginBottom: 8,
                      flexShrink: 0
                    }} />

                    {/* Bottom 3-Column Hourly Weather Row (Now | +1 hr | +2 hr) */}
                    <div style={{
                      width: '94%',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      alignItems: 'center',
                      justifyItems: 'center',
                      gap: 10
                    }}>
                      {rawSlots.map((slot, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2
                          }}
                        >
                          <HourlyLineWeatherIcon status={slot.status} size={25} color="#ffffff" />
                          <span style={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: '#ffffff',
                            letterSpacing: '-0.3px',
                            lineHeight: 1.15,
                            marginTop: 1,
                            fontFamily: iosFontStack
                          }}>
                            {slot.temp}°{unitChar}
                          </span>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: 'rgba(255, 255, 255, 0.78)',
                            letterSpacing: '-0.1px',
                            lineHeight: 1.1,
                            fontFamily: iosFontStack
                          }}>
                            {formatForecastHour(slot.hour24, slot.isNow)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Quick Pill Per-App Audio Mixer (Studio Hardware Console — Electric Violet Accent) */}
            {currentTab === 12 && (() => {
              const filteredSessions = audioSessions.filter(s => {
                if (!audioSearch.trim()) return true;
                const q = audioSearch.toLowerCase();
                return (s.displayName && s.displayName.toLowerCase().includes(q)) ||
                       (s.processName && s.processName.toLowerCase().includes(q));
              });

              const currentDev = audioDevices.find(d => d.id === activeAudioDeviceId) ||
                                 audioDevices.find(d => d.isDefault) ||
                                 audioDevices[0];
              const iosFontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Rounded", "OpenRunde", system-ui, sans-serif';

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
                  gap: 12,
                  userSelect: 'none',
                  position: 'relative',
                  fontFamily: iosFontStack
                }}>
                  {/* Left Column: 3D Master Studio Console + Sunken Filter Trough */}
                  <div style={{
                    width: 180,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                    gap: 7
                  }}>
                    {/* Top 3D Beveled Master Output Console */}
                    <div style={{
                      flex: 1,
                      background: 'linear-gradient(165deg, #211c2d 0%, #14111c 60%, #0c0a11 100%)',
                      border: '1px solid rgba(168, 85, 247, 0.25)',
                      borderRadius: 15,
                      padding: '8px 10px',
                      boxShadow: `
                        0 8px 18px rgba(0, 0, 0, 0.8),
                        inset 0 1px 1px rgba(255, 255, 255, 0.14),
                        inset 0 -2px 4px rgba(0, 0, 0, 0.85)
                      `,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      {/* Header Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{
                            width: 18,
                            height: 18,
                            borderRadius: 5,
                            background: 'linear-gradient(180deg, #321952 0%, #1d0e31 100%)',
                            border: '1px solid rgba(192, 132, 252, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.7)'
                          }}>
                            <SlidersHorizontal size={10} color="#c084fc" />
                          </div>
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: '#ffffff', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                            Studio Mixer
                          </span>
                        </div>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 999,
                          background: '#09080d',
                          border: '1px solid rgba(168, 85, 247, 0.32)',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.9)',
                          color: '#c084fc'
                        }}>
                          {audioSessions.length} {audioSessions.length === 1 ? 'ch' : 'chs'}
                        </span>
                      </div>

                      {/* Sunken Output Device Selector Well */}
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          onClick={() => setDeviceDropdownOpen(!deviceDropdownOpen)}
                          style={{
                            width: '100%',
                            background: '#0a090e',
                            border: '1px solid rgba(168, 85, 247, 0.2)',
                            boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.92)',
                            borderRadius: 9,
                            padding: '4.5px 7px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            color: '#ffffff',
                            cursor: 'pointer',
                            fontSize: 10,
                            fontWeight: 600,
                            overflow: 'hidden'
                          }}
                          title={currentDev?.name || "Select Output Device"}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, overflow: 'hidden' }}>
                            <Headphones size={11} color="#c084fc" style={{ flexShrink: 0 }} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {currentDev?.name ? currentDev.name.replace(/\s*\([^)]*\)$/, '') : "Speakers"}
                            </span>
                          </div>
                          <ChevronLeft size={11} style={{ transform: deviceDropdownOpen ? 'rotate(-90deg)' : 'rotate(90deg)', flexShrink: 0, opacity: 0.65 }} />
                        </button>

                        {/* Device Dropdown Menu */}
                        {deviceDropdownOpen && (
                          <div
                            className="audio-mixer-scrollable"
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              marginTop: 4,
                              background: '#0e0d14',
                              border: '1px solid rgba(168, 85, 247, 0.35)',
                              borderRadius: 10,
                              boxShadow: '0 10px 28px rgba(0, 0, 0, 0.9)',
                              zIndex: 100,
                              maxHeight: 110,
                              overflowY: 'auto',
                              padding: 4
                            }}
                          >
                            {audioDevices.map(d => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => {
                                  setActiveAudioDeviceId(d.id);
                                  localStorage.setItem("audio-mixer-device-id", d.id);
                                  fetchAudioSessions(d.id, true);
                                  setDeviceDropdownOpen(false);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '5px 7px',
                                  borderRadius: 6,
                                  background: (d.id === (currentDev?.id || activeAudioDeviceId)) ? 'rgba(168, 85, 247, 0.22)' : 'transparent',
                                  border: 'none',
                                  color: (d.id === (currentDev?.id || activeAudioDeviceId)) ? '#c084fc' : 'rgba(255, 255, 255, 0.85)',
                                  fontSize: 10,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  textAlign: 'left'
                                }}
                              >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {d.name.replace(/\s*\([^)]*\)$/, '')}
                                </span>
                                {d.id === (currentDev?.id || activeAudioDeviceId) && <Check size={10} color="#c084fc" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Sunken Master Volume Fader Trough */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '3px 6px',
                        borderRadius: 8,
                        background: '#09080d',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.9)'
                      }}>
                        <button
                          type="button"
                          onClick={() => handleToggleMasterMute()}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title={masterAudioMuted ? "Unmute Master" : "Mute Master"}
                        >
                          {masterAudioMuted ? <VolumeX size={12} color="#f87171" /> : <Volume2 size={12} color="#c084fc" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={masterAudioMuted ? 0 : Math.round(masterAudioVolume * 100)}
                          onChange={(e) => handleSetMasterVolume(parseFloat(e.target.value) / 100)}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            width: '100%',
                            height: 4,
                            accentColor: '#a855f7',
                            cursor: 'pointer'
                          }}
                        />
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: masterAudioMuted ? '#f87171' : '#c084fc', width: 28, textAlign: 'right', flexShrink: 0 }}>
                          {masterAudioMuted ? "M" : `${Math.round(masterAudioVolume * 100)}%`}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Sunken 3D Search & Refresh Trough */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      width: '100%',
                      height: 30,
                      background: '#09080d',
                      border: '1px solid rgba(168, 85, 247, 0.2)',
                      boxShadow: 'inset 0 3px 8px rgba(0, 0, 0, 0.92), 0 3px 8px rgba(0, 0, 0, 0.6)',
                      borderRadius: 11,
                      padding: '0 8px',
                      boxSizing: 'border-box'
                    }}>
                      <Search size={11} color="#c084fc" style={{ flexShrink: 0, opacity: 0.8 }} />
                      <input
                        type="text"
                        placeholder="Filter channels..."
                        value={audioSearch}
                        onChange={(e) => setAudioSearch(e.target.value)}
                        style={{
                          flex: 1,
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: '#ffffff',
                          fontSize: 10.5,
                          fontFamily: iosFontStack,
                          minWidth: 0
                        }}
                      />
                      <motion.button
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          fetchAudioDevices();
                          fetchAudioSessions(activeAudioDeviceId, true);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 2,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          color: '#c084fc'
                        }}
                        title="Refresh sessions"
                      >
                        <RefreshCw size={11} className={audioLoading ? "spin-anim" : ""} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Right Column: Sunken Dark Rack of Per-App 3D Channel Strips */}
                  <div
                    className="audio-mixer-scrollable"
                    style={{
                      flex: 1,
                      height: '100%',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      minWidth: 0,
                      padding: '6px 7px',
                      borderRadius: 15,
                      background: 'linear-gradient(180deg, #09080d 0%, #0d0c13 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.95)',
                      boxSizing: 'border-box'
                    }}
                  >
                    {audioSessions.length === 0 ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        gap: 5
                      }}>
                        <Volume2 size={22} color="rgba(192, 132, 252, 0.45)" />
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                          No Active Audio Channels
                        </span>
                        <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.42)' }}>
                          Play audio in any app to mix its level
                        </span>
                      </div>
                    ) : filteredSessions.length === 0 ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        opacity: 0.6
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#ffffff' }}>
                          No channels match "{audioSearch}"
                        </span>
                      </div>
                    ) : (
                      filteredSessions.map((s) => {
                        const isAppMuted = Boolean(s.isMuted);
                        const appVol = typeof s.volume === 'number' ? s.volume : 1;
                        const pct = isAppMuted ? 0 : Math.round(appVol * 100);
                        const isAudioActive = s.peak > 0.01 || s.state === 'AudioSessionStateActive';

                        return (
                          <div
                            key={s.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 9,
                              padding: '5px 8px',
                              background: 'linear-gradient(180deg, #1d1b26 0%, #13111a 100%)',
                              border: '1px solid rgba(255, 255, 255, 0.09)',
                              borderRadius: 11,
                              boxShadow: `
                                0 4px 10px rgba(0, 0, 0, 0.7),
                                inset 0 1px 1px rgba(255, 255, 255, 0.12),
                                inset 0 -1px 2px rgba(0, 0, 0, 0.85)
                              `,
                              boxSizing: 'border-box',
                              userSelect: 'none'
                            }}
                          >
                            {/* Sunken App Icon Well */}
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: '#09080d',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              boxShadow: 'inset 0 2px 5px rgba(0, 0, 0, 0.9)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              flexShrink: 0,
                              position: 'relative'
                            }}>
                              {s.icon ? (
                                <img
                                  src={s.icon}
                                  alt=""
                                  draggable={false}
                                  style={{ width: 20, height: 20, objectFit: 'contain', pointerEvents: 'none' }}
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              ) : (
                                <SlidersHorizontal size={13} color="#c084fc" />
                              )}
                              {isAudioActive && (
                                <span style={{
                                  position: 'absolute',
                                  bottom: 2,
                                  right: 2,
                                  width: 5,
                                  height: 5,
                                  borderRadius: '50%',
                                  background: '#34d399',
                                  boxShadow: '0 0 6px #34d399'
                                }} />
                              )}
                            </div>

                            {/* Center: App Name & Sunken Volume Fader */}
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                                  <span style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: '#ffffff',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {s.displayName || s.processName}
                                  </span>
                                  {s.sessionsCount > 1 && (
                                    <span style={{
                                      fontSize: 8,
                                      fontWeight: 700,
                                      padding: '0 4px',
                                      borderRadius: 4,
                                      background: 'rgba(168, 85, 247, 0.18)',
                                      color: '#c084fc'
                                    }}>
                                      {s.sessionsCount}x
                                    </span>
                                  )}
                                </div>
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: isAppMuted ? '#f87171' : '#c084fc',
                                  width: 34,
                                  textAlign: 'right'
                                }}>
                                  {isAppMuted ? "Muted" : `${pct}%`}
                                </span>
                              </div>

                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={isAppMuted ? 0 : pct}
                                onChange={(e) => handleSetAppVolume(s, parseFloat(e.target.value) / 100)}
                                style={{
                                  width: '100%',
                                  height: 4,
                                  accentColor: isAppMuted ? '#f87171' : '#a855f7',
                                  cursor: 'pointer'
                                }}
                              />
                            </div>

                            {/* Tactile 3D Mute Button */}
                            <motion.button
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.92 }}
                              type="button"
                              onClick={() => handleToggleAppMute(s)}
                              style={{
                                width: 27,
                                height: 27,
                                borderRadius: 8,
                                background: isAppMuted
                                  ? 'linear-gradient(180deg, #3b1419 0%, #240b0e 100%)'
                                  : 'linear-gradient(180deg, #262235 0%, #171421 100%)',
                                border: `1px solid ${isAppMuted ? 'rgba(248, 113, 113, 0.45)' : 'rgba(192, 132, 252, 0.28)'}`,
                                boxShadow: '0 3px 8px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.14)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                              title={isAppMuted ? "Unmute" : "Mute"}
                            >
                              {isAppMuted ? (
                                <VolumeX size={13} color="#f87171" />
                              ) : (
                                <Volume2 size={13} color="#c084fc" />
                              )}
                            </motion.button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Quick App Launcher & Workspace Switcher */}
            {currentTab === 14 && (
              <ErrorBoundary tabName="App Launcher" onGoHome={() => setTabState([2, -1])}>
                <AppLauncher
                  textColor={textColor}
                  accentColor="#38bdf8"
                  isOpen={mode === "large"}
                  onClose={() => setMode("still")}
                />
              </ErrorBoundary>
            )}

            {/* Quick Notes & Contextual Capture */}
            {currentTab === 15 && (
              <ErrorBoundary tabName="Quick Notes" onGoHome={() => setTabState([2, -1])}>
                <QuickNotes
                  textColor={textColor}
                  accentColor="#10b981"
                  onTaskCreated={(task) => {
                    const taskTitle = typeof task === "string" ? task : (task?.title || task?.text || task?.name || "Untitled Task");
                    setTasks(prev => {
                      const list = Array.isArray(prev) ? prev : [];
                      const updated = [taskTitle, ...list];
                      try {
                        localStorage.setItem("tasks", JSON.stringify(updated));
                      } catch (_) {}
                      return updated;
                    });
                  }}
                />
              </ErrorBoundary>
            )}

            {/* Shelf - Session File Stash */}
            {currentTab === 16 && (
              <ErrorBoundary tabName="Shelf" onGoHome={() => setTabState([2, -1])}>
                <Shelf accentColor="#38bdf8" />
              </ErrorBoundary>
            )}

            {/* Prayer - Islamic Prayer Times & Celestial Arc */}
            {currentTab === 17 && (
              <ErrorBoundary tabName="Prayer" onGoHome={() => setTabState([2, -1])}>
                <Prayer
                  accentColor="#38bdf8"
                  locationName={localStorage.getItem("location") || weatherLocation || "Rangpur"}
                />
              </ErrorBoundary>
            )}

            {/* Now Playing (3D Beveled Album Art Housing + Sunken Waveform Trough & Tactile 3D Transport Orbs) */}
            {currentTab === 3 && (() => {
              const iosFontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Rounded", "OpenRunde", system-ui, sans-serif';
              const appLabel = cleanAppName(spotifyTrack?.source);
              const mediaAccent = appLabel === 'Spotify' ? '#1db954' : '#ff2d55';

              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  height: '100%',
                  userSelect: 'none',
                  fontFamily: iosFontStack
                }}>
                  <AnimatePresence mode="wait">
                    {spotifyTrack ? (
                      <motion.div
                        key={spotifyTrack.name + spotifyTrack.artist}
                        initial={{ opacity: 0, filter: 'blur(10px)', scale: 0.96 }}
                        animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                        exit={{ opacity: 0, filter: 'blur(10px)', scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '10px 18px',
                          boxSizing: 'border-box',
                          overflow: 'hidden',
                          borderRadius: 'inherit'
                        }}
                      >
                        {/* Smoked Dark Ambient Album Art Backdrop */}
                        {spotifyTrack.artwork_url && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              backgroundImage: `url("${spotifyTrack.artwork_url}")`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              filter: 'blur(18px) brightness(0.32) saturate(1.4)',
                              transform: 'scale(1.15)',
                              zIndex: 0
                            }}
                          />
                        )}

                        {/* Deep 3D Recessed Dark Vignette */}
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(135deg, rgba(8,8,12,0.88) 0%, rgba(12,12,18,0.72) 55%, rgba(8,8,12,0.92) 100%)',
                            boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.9)',
                            zIndex: 1
                          }}
                        />

                        {/* Foreground 3D Media Deck */}
                        <div style={{
                          position: 'relative',
                          zIndex: 2,
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          height: '100%',
                          width: '100%',
                          gap: 16,
                          boxSizing: 'border-box'
                        }}>
                          {/* Left: 3D Metallic Beveled Album Artwork Housing */}
                          <div
                            style={{
                              width: 108,
                              height: 108,
                              borderRadius: 22,
                              padding: 5,
                              boxSizing: 'border-box',
                              flexShrink: 0,
                              background: 'linear-gradient(145deg, #2e2e38 0%, #17171d 55%, #0a0a0e 100%)',
                              boxShadow: `
                                0 10px 24px rgba(0, 0, 0, 0.85),
                                0 3px 8px rgba(0, 0, 0, 0.7),
                                inset 0 1.5px 2px rgba(255, 255, 255, 0.22),
                                inset 0 -2px 4px rgba(0, 0, 0, 0.9)
                              `,
                              position: 'relative'
                            }}
                          >
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: 17,
                                overflow: 'hidden',
                                position: 'relative',
                                background: '#0b0b0f',
                                boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.9)'
                              }}
                            >
                              {spotifyTrack.artwork_url ? (
                                <img
                                  src={spotifyTrack.artwork_url}
                                  alt=""
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Music size={30} color={mediaAccent} />
                                </div>
                              )}
                              {/* Inner Specular Glint */}
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 45%)',
                                  pointerEvents: 'none'
                                }}
                              />
                            </div>
                          </div>

                          {/* Right: Metadata Header + Sunken Waveform Trough + Tactile 3D Transport Orbs */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            flex: 1,
                            minWidth: 0,
                            height: 108
                          }}>
                            {/* Top Track Info & Source Capsule */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div
                                  onClick={() => openMusicPlayer(spotifyTrack?.source)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    background: 'rgba(0, 0, 0, 0.65)',
                                    border: `1px solid ${mediaAccent}44`,
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.85)',
                                    fontSize: 9.5,
                                    fontWeight: 700,
                                    color: mediaAccent,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Music size={10} color={mediaAccent} />
                                  <span>{appLabel}</span>
                                </div>
                                <span style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  {spotifyTrack.state === 'playing' ? 'Playing' : 'Paused'}
                                </span>
                              </div>
                              <ScrollingTitle text={spotifyTrack.name || "Unknown Title"} fontSize={15} />
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 11.5,
                                  fontWeight: 500,
                                  color: 'rgba(255,255,255,0.68)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {spotifyTrack.artist || "Unknown Artist"}
                              </p>
                            </div>

                            {/* Bottom Row: Sunken Scrubber Trough + 3D Transport Orbs */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <WaveformScrubber
                                  position={mediaPosition}
                                  duration={spotifyTrack.duration || 0}
                                  isPlaying={spotifyTrack.state === 'playing'}
                                  accentColor={mediaAccent}
                                  onSeek={(sec) => {
                                    setMediaPosition(sec);
                                    if (window.electronAPI?.controlSystemMedia) {
                                      window.electronAPI.controlSystemMedia('seek', sec);
                                    }
                                  }}
                                />
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.92 }}
                                  onClick={() => {
                                    lastMediaActionRef.current = Date.now();
                                    if (window.electronAPI?.controlSystemMedia) {
                                      window.electronAPI.controlSystemMedia('previous');
                                    }
                                  }}
                                  style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(180deg, #23232c 0%, #14141a 100%)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.75), inset 0 1px 1px rgba(255,255,255,0.16)',
                                    color: '#ffffff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title="Previous Track"
                                  aria-label="Previous Track"
                                >
                                  <SkipBackIcon size={14} color="#ffffff" fill="#ffffff" />
                                </motion.button>

                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.92 }}
                                  onClick={() => {
                                    lastMediaActionRef.current = Date.now();
                                    setSpotifyTrack((prev) => prev ? { ...prev, state: prev.state === 'playing' ? 'paused' : 'playing' } : null);
                                    if (window.electronAPI?.controlSystemMedia) {
                                      window.electronAPI.controlSystemMedia('playpause');
                                    }
                                  }}
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    background: `linear-gradient(180deg, ${mediaAccent}38 0%, #191922 100%)`,
                                    border: `1px solid ${mediaAccent}77`,
                                    boxShadow: `0 6px 14px rgba(0,0,0,0.85), 0 0 12px ${mediaAccent}33, inset 0 1px 1px rgba(255,255,255,0.25)`,
                                    color: '#ffffff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title={spotifyTrack.state === 'playing' ? "Pause" : "Play"}
                                  aria-label={spotifyTrack.state === 'playing' ? "Pause" : "Play"}
                                >
                                  {spotifyTrack.state === 'playing' ? <Pause size={16} color="#ffffff" fill="#ffffff" /> : <Play size={16} color="#ffffff" fill="#ffffff" style={{ marginLeft: 1.5 }} />}
                                </motion.button>

                                <motion.button
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.92 }}
                                  onClick={() => {
                                    lastMediaActionRef.current = Date.now();
                                    if (window.electronAPI?.controlSystemMedia) {
                                      window.electronAPI.controlSystemMedia('next');
                                    }
                                  }}
                                  style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(180deg, #23232c 0%, #14141a 100%)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.75), inset 0 1px 1px rgba(255,255,255,0.16)',
                                    color: '#ffffff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title="Next Track"
                                  aria-label="Next Track"
                                >
                                  <SkipForwardIcon size={14} color="#ffffff" fill="#ffffff" />
                                </motion.button>
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
                          height: '100%',
                          padding: '12px 20px',
                          boxSizing: 'border-box',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 18
                        }}
                      >
                        {/* Left 3D Idle Vinyl Dial Well */}
                        <div
                          style={{
                            width: 108,
                            height: 108,
                            borderRadius: '50%',
                            padding: 6,
                            boxSizing: 'border-box',
                            background: 'linear-gradient(145deg, #292932 0%, #15151b 55%, #0a0a0e 100%)',
                            boxShadow: '0 10px 22px rgba(0,0,0,0.85), inset 0 1.5px 2px rgba(255,255,255,0.18)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              borderRadius: '50%',
                              background: 'radial-gradient(circle at 50% 50%, #1c1c24 0%, #0d0d12 70%, #08080b 100%)',
                              boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.92)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Music size={28} color="#ff2d55" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 45, 85, 0.45))' }} />
                          </div>
                        </div>

                        {/* Right Sunken Idle Media Launcher Well */}
                        <div
                          style={{
                            flex: 1,
                            height: '100%',
                            borderRadius: 16,
                            padding: '12px 16px',
                            boxSizing: 'border-box',
                            background: 'linear-gradient(180deg, #0a0a0e 0%, #111118 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                            boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.92)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.2px' }}>
                              No Active Media Session
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.52)', marginTop: 2 }}>
                              Start playback in your favorite player to control it here
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => openMusicPlayer("Spotify")}
                              style={{
                                height: 30,
                                padding: '0 14px',
                                borderRadius: 999,
                                background: 'linear-gradient(180deg, #0f2e1c 0%, #091d11 100%)',
                                border: '1px solid rgba(29, 185, 84, 0.4)',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.75), inset 0 1px 1px rgba(255,255,255,0.16)',
                                color: '#1db954',
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Open Spotify
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => openMusicPlayer("Music")}
                              style={{
                                height: 30,
                                padding: '0 14px',
                                borderRadius: 999,
                                background: 'linear-gradient(180deg, #36121b 0%, #210a10 100%)',
                                border: '1px solid rgba(255, 45, 85, 0.4)',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.75), inset 0 1px 1px rgba(255,255,255,0.16)',
                                color: '#ff2d55',
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Apple Music
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })()}

            {/* Calendar Tab (3D Beveled Flip-Block + Sunken Month Matrix — Crimson Red Accent) */}
            {currentTab === 4 && (() => {
              const today = new Date();
              const selectedYear = calendarDate.getFullYear();
              const selectedMonth = calendarDate.getMonth();
              const monthNameUpper = calendarDate.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
              const todayWeekdayFull = today.toLocaleDateString('en-US', { weekday: 'long' });
              const days = getCalendarDays(selectedYear, selectedMonth);
              const iosFontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Rounded", "OpenRunde", system-ui, sans-serif';

              return (
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
                    gap: 14,
                    userSelect: 'none',
                    fontFamily: iosFontStack
                  }}
                >
                  {/* Left Column: 3D Beveled iOS Flip-Calendar Block */}
                  <div
                    style={{
                      width: 118,
                      height: '100%',
                      borderRadius: 18,
                      padding: 5,
                      boxSizing: 'border-box',
                      background: 'linear-gradient(145deg, #2d2426 0%, #181416 55%, #0c0a0b 100%)',
                      boxShadow: `
                        0 10px 22px rgba(0, 0, 0, 0.85),
                        inset 0 1.5px 2px rgba(255, 255, 255, 0.18),
                        inset 0 -2px 4px rgba(0, 0, 0, 0.9)
                      `,
                      flexShrink: 0,
                      display: 'flex'
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 14,
                        background: 'linear-gradient(180deg, #16151a 0%, #0d0c10 100%)',
                        boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.9)',
                        padding: '6px 8px',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      {/* Sunken Dark-Crimson Month Header Pill */}
                      <div
                        style={{
                          width: '100%',
                          padding: '3px 4px',
                          borderRadius: 8,
                          background: 'linear-gradient(180deg, #381110 0%, #240a09 100%)',
                          border: '1px solid rgba(255, 69, 58, 0.35)',
                          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 2px 6px rgba(0,0,0,0.7)',
                          textAlign: 'center'
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: '#ff453a',
                            letterSpacing: '0.8px',
                            textTransform: 'uppercase',
                            lineHeight: 1.1
                          }}
                        >
                          {monthNameUpper}
                        </div>
                        <div
                          style={{
                            fontSize: 8.5,
                            fontWeight: 600,
                            color: 'rgba(255, 255, 255, 0.55)',
                            lineHeight: 1.1
                          }}
                        >
                          {selectedYear}
                        </div>
                      </div>

                      {/* Raised 3D Giant Day Number */}
                      <div
                        style={{
                          fontSize: 40,
                          fontWeight: 800,
                          color: '#ffffff',
                          letterSpacing: '-1.5px',
                          lineHeight: 1,
                          textShadow: '0 4px 10px rgba(0, 0, 0, 0.9), 0 0 12px rgba(255, 69, 58, 0.18)'
                        }}
                      >
                        {today.getDate()}
                      </div>

                      {/* Sunken Weekday Badge */}
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'rgba(255,255,255,0.75)',
                          padding: '1.5px 8px',
                          borderRadius: 999,
                          background: 'rgba(0,0,0,0.55)',
                          border: '1px solid rgba(255,255,255,0.07)'
                        }}
                      >
                        {todayWeekdayFull}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Sunken 3D Month Matrix Well */}
                  <div
                    style={{
                      flex: 1,
                      height: '100%',
                      minWidth: 0,
                      borderRadius: 16,
                      padding: '7px 12px',
                      boxSizing: 'border-box',
                      background: 'linear-gradient(180deg, #0a0a0e 0%, #111117 100%)',
                      border: '1px solid rgba(255, 69, 58, 0.18)',
                      boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.94), 0 4px 12px rgba(0, 0, 0, 0.6)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    {/* Calendar Month Nav Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        style={{
                          width: 20,
                          height: 18,
                          borderRadius: 6,
                          background: 'linear-gradient(180deg, #22222b 0%, #14141a 100%)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'rgba(255,255,255,0.8)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        <ChevronLeft size={12} />
                      </motion.button>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#ffffff', letterSpacing: '0.2px' }}>
                        {calendarDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        style={{
                          width: 20,
                          height: 18,
                          borderRadius: 6,
                          background: 'linear-gradient(180deg, #22222b 0%, #14141a 100%)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'rgba(255,255,255,0.8)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        <ChevronRight size={12} />
                      </motion.button>
                    </div>

                    {/* Weekday Header (S M T W T F S) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, textAlign: 'center' }}>
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
                        const isWeekend = idx === 0 || idx === 6;
                        return (
                          <div
                            key={`cal-h-${idx}`}
                            style={{
                              fontSize: 9.5,
                              fontWeight: 800,
                              color: isWeekend ? '#ff453a' : 'rgba(255,255,255,0.52)'
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

                        let dayCellColor = isWeekend ? '#ff453a' : '#ffffff';
                        if (!item.isCurrentMonth) {
                          dayCellColor = isWeekend ? 'rgba(255, 69, 58, 0.26)' : 'rgba(255, 255, 255, 0.22)';
                        }

                        return (
                          <div
                            key={`cal-d-${idx}`}
                            style={{
                              height: 13.5,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 9.5,
                              fontWeight: isToday ? 800 : 600,
                              color: isToday ? '#ffffff' : dayCellColor
                            }}
                          >
                            {isToday ? (
                              <div
                                style={{
                                  width: 16,
                                  height: 15,
                                  borderRadius: 6,
                                  background: 'linear-gradient(180deg, #ff453a 0%, #c41e14 100%)',
                                  border: '1px solid rgba(255, 140, 130, 0.5)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff',
                                  boxShadow: '0 2px 7px rgba(255, 69, 58, 0.65)',
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

            {/* Notifications Tab (Left 3D Filter Dock + Right Sunken Alert Well — Sky Blue & Amber Accents) */}
            {currentTab === 5 && (() => {
              const iosFontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Rounded", "OpenRunde", system-ui, sans-serif';
              const filterItems = [
                { id: 'all', label: 'All', count: notificationSnapshot.stats.totalActive, accent: '#38bdf8' },
                { id: 'unread', label: 'Unread', count: notificationSnapshot.stats.unreviewedCount, accent: '#60a5fa' },
                { id: 'snoozed', label: 'Snoozed', count: notificationSnapshot.stats.snoozedCount, accent: '#f59e0b' },
                { id: 'history', label: 'History', count: notificationSnapshot.stats.historyCount, accent: '#a855f7' }
              ];

              return (
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
                    gap: 12,
                    userSelect: 'none',
                    fontFamily: iosFontStack
                  }}
                >
                  {/* Left Column: 3D Vertical Filter & Action Dock */}
                  <div
                    style={{
                      width: 138,
                      height: '100%',
                      flexShrink: 0,
                      borderRadius: 16,
                      padding: '7px 8px',
                      boxSizing: 'border-box',
                      background: 'linear-gradient(165deg, #1d202b 0%, #12141c 60%, #0b0c11 100%)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      boxShadow: `
                        0 8px 18px rgba(0, 0, 0, 0.8),
                        inset 0 1px 1px rgba(255, 255, 255, 0.14),
                        inset 0 -2px 4px rgba(0, 0, 0, 0.85)
                      `,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    {/* 2x2 Tactile Filter Pills Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 5
                      }}
                    >
                      {filterItems.map((f) => {
                        const isActive = notificationFilter === f.id;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setNotificationFilter(f.id)}
                            style={{
                              height: 36,
                              borderRadius: 9,
                              padding: '3px 5px',
                              boxSizing: 'border-box',
                              background: isActive
                                ? 'linear-gradient(180deg, #122c49 0%, #0b1b2e 100%)'
                                : '#0a0b10',
                              border: isActive
                                ? `1px solid ${f.accent}66`
                                : '1px solid rgba(255, 255, 255, 0.07)',
                              boxShadow: isActive
                                ? '0 3px 8px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.16)'
                                : 'inset 0 2px 5px rgba(0,0,0,0.9)',
                              color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.55)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              fontFamily: iosFontStack
                            }}
                          >
                            <span style={{ fontSize: 9, fontWeight: 700, color: isActive ? f.accent : 'rgba(255,255,255,0.5)' }}>
                              {f.label}
                            </span>
                            <span style={{ fontSize: 11.5, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
                              {f.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Bottom Action Capsules (Privacy + Undo / Clear) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <button
                        type="button"
                        onClick={handleTogglePrivacy}
                        title={notificationSnapshot.settings.hidePreviews ? "Previews hidden. Click to show." : "Hide notification previews"}
                        style={{
                          height: 26,
                          width: 30,
                          borderRadius: 8,
                          background: notificationSnapshot.settings.hidePreviews
                            ? 'linear-gradient(180deg, #35210c 0%, #221406 100%)'
                            : 'linear-gradient(180deg, #21232d 0%, #14151c 100%)',
                          border: notificationSnapshot.settings.hidePreviews
                            ? '1px solid rgba(245, 158, 11, 0.45)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: '0 3px 7px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.12)',
                          color: notificationSnapshot.settings.hidePreviews ? '#f59e0b' : 'rgba(255,255,255,0.75)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {notificationSnapshot.settings.hidePreviews ? <EyeOff size={12} color="#f59e0b" /> : <Eye size={12} />}
                      </button>

                      {(notificationSnapshot.stats.hasUndo || undoToast) ? (
                        <button
                          type="button"
                          onClick={handleUndoDismiss}
                          title="Undo dismissal"
                          style={{
                            flex: 1,
                            height: 26,
                            borderRadius: 8,
                            background: 'linear-gradient(180deg, #122c49 0%, #0b1b2e 100%)',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            boxShadow: '0 3px 7px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.15)',
                            color: '#38bdf8',
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                        >
                          <Undo size={11} /> Undo
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (notificationFilter === 'history') {
                              window.electronAPI?.notifications?.clearHistory?.();
                            } else {
                              handleClearAll();
                            }
                          }}
                          disabled={notificationFilter === 'history' ? notificationSnapshot.history.length === 0 : notificationSnapshot.stats.totalActive === 0}
                          title="Clear notifications"
                          style={{
                            flex: 1,
                            height: 26,
                            borderRadius: 8,
                            background: 'linear-gradient(180deg, #2b1316 0%, #1a0b0d 100%)',
                            border: '1px solid rgba(248, 113, 113, 0.3)',
                            boxShadow: '0 3px 7px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.12)',
                            color: '#f87171',
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: 'pointer',
                            opacity: (notificationFilter === 'history' ? notificationSnapshot.history.length === 0 : notificationSnapshot.stats.totalActive === 0) ? 0.4 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                        >
                          <Trash2 size={11} /> Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Sunken 3D Notification Alert Well */}
                  <div
                    className="notifications-container"
                    style={{
                      flex: 1,
                      height: '100%',
                      minWidth: 0,
                      position: 'relative',
                      padding: '7px 8px',
                      borderRadius: 16,
                      background: 'linear-gradient(180deg, #090a0f 0%, #0e1017 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.95)',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      boxSizing: 'border-box'
                    }}
                  >
                    {/* Undo Notification Toast */}
                    {undoToast && (
                      <div className="notification-undo-toast" style={{
                        background: 'linear-gradient(180deg, #162436 0%, #0d1724 100%)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.75)'
                      }}>
                        <span style={{ color: '#ffffff', opacity: 0.9 }}>{undoToast.message}</span>
                        <button
                          type="button"
                          onClick={handleUndoDismiss}
                          style={{
                            background: 'rgba(56, 189, 248, 0.18)',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            borderRadius: 6,
                            color: '#38bdf8',
                            padding: '2px 8px',
                            fontSize: 10.5,
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Undo
                        </button>
                      </div>
                    )}

                    {/* Incoming Call Card */}
                    {notificationSnapshot.incomingCall && notificationFilter !== 'snoozed' && notificationFilter !== 'history' && (
                      <div className="notification-call-card" style={{
                        background: 'linear-gradient(180deg, #0f291c 0%, #091911 100%)',
                        border: '1px solid rgba(37, 211, 102, 0.4)',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.15)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="notification-call-pulsing-icon">
                            <PhoneIncoming size={15} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#25d366', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Incoming {notificationSnapshot.incomingCall.callType || 'Voice'} Call
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                              {notificationSnapshot.incomingCall.title || notificationSnapshot.incomingCall.applicationName}
                            </span>
                            <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.7)' }}>
                              {notificationSnapshot.incomingCall.body}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleExecuteAction(notificationSnapshot.incomingCall.id, 'open', { appId: notificationSnapshot.incomingCall.applicationId })}
                            style={{
                              background: '#25d366',
                              border: 'none',
                              borderRadius: 8,
                              color: '#ffffff',
                              padding: '6px 12px',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <Phone size={11} /> Answer
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExecuteAction(notificationSnapshot.incomingCall.id, 'dismiss')}
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: 'none',
                              borderRadius: 8,
                              color: '#ffffff',
                              padding: '6px 9px',
                              fontSize: 12,
                              cursor: 'pointer'
                            }}
                            title="Dismiss"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Main Content Area based on Filter */}
                    {notificationFilter === 'snoozed' ? (
                      notificationSnapshot.snoozed.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.55, fontSize: 12 }}>
                          <Clock size={22} color="#f59e0b" style={{ marginBottom: 5, opacity: 0.8 }} />
                          <p style={{ margin: 0, fontWeight: 600 }}>No snoozed notifications</p>
                        </div>
                      ) : (
                        notificationSnapshot.snoozed.map((notif) => (
                          <div key={notif.id} className="notification-card" style={{
                            background: 'linear-gradient(180deg, #1b1d26 0%, #12131a 100%)',
                            border: '1px solid rgba(245, 158, 11, 0.22)',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.1)'
                          }}>
                            {notif.applicationIcon ? (
                              <img src={notif.applicationIcon} className="notification-icon" alt="" />
                            ) : (
                              <div className="notification-icon" style={{ backgroundColor: '#090a0f', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bell size={14} color="#f59e0b" />
                              </div>
                            )}
                            <div className="notification-content">
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span className="notification-app-name">{notif.applicationName}</span>
                                <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>
                                  Until {notif.snoozedUntil ? new Date(notif.snoozedUntil).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'due'}
                                </span>
                              </div>
                              <span className="notification-title">{notif.title}</span>
                              <span className="notification-body">{notif.body}</span>
                              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                <button
                                  type="button"
                                  className="notification-action-btn"
                                  onClick={() => handleCancelSnooze(notif.id)}
                                >
                                  <BellRing size={11} /> Wake Now
                                </button>
                                <button
                                  type="button"
                                  className="notification-action-btn"
                                  onClick={() => handleExecuteAction(notif.id, 'dismiss')}
                                >
                                  <X size={11} /> Dismiss
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )
                    ) : notificationFilter === 'history' ? (
                      notificationSnapshot.history.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.55, fontSize: 12 }}>
                          <List size={22} color="#a855f7" style={{ marginBottom: 5, opacity: 0.8 }} />
                          <p style={{ margin: 0, fontWeight: 600 }}>No notification history</p>
                        </div>
                      ) : (
                        notificationSnapshot.history.map((notif) => (
                          <div key={notif.id} className="notification-card" style={{
                            opacity: 0.82,
                            background: 'linear-gradient(180deg, #181922 0%, #101117 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.65), inset 0 1px 1px rgba(255,255,255,0.08)'
                          }}>
                            {notif.applicationIcon ? (
                              <img src={notif.applicationIcon} className="notification-icon" alt="" />
                            ) : (
                              <div className="notification-icon" style={{ backgroundColor: '#090a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bell size={14} color="#a855f7" />
                              </div>
                            )}
                            <div className="notification-content">
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span className="notification-app-name">{notif.applicationName}</span>
                                <span style={{ fontSize: 9, opacity: 0.5 }}>
                                  {notif.dismissedAt ? formatRelativeTime(notif.dismissedAt) : ''}
                                </span>
                              </div>
                              <span className="notification-title">{notif.title}</span>
                              <span className="notification-body">{notif.body}</span>
                            </div>
                            {notif.applicationId && (
                              <button
                                type="button"
                                className="notification-action-btn"
                                style={{ alignSelf: 'center' }}
                                onClick={() => handleExecuteAction(notif.id, 'open', { appId: notif.applicationId })}
                                title="Open App"
                              >
                                <ExternalLink size={12} />
                              </button>
                            )}
                          </div>
                        ))
                      )
                    ) : (
                      (() => {
                        const rawItems = Array.isArray(notificationSnapshot.active) && notificationSnapshot.active.length > 0
                          ? notificationSnapshot.active
                          : [
                              ...(notificationSnapshot.standalone || []),
                              ...(notificationSnapshot.groups?.flatMap(g => g.items) || [])
                            ];

                        const validItems = rawItems.filter(item => {
                          if (!item) return false;
                          if (!item.title?.trim() && !item.body?.trim()) return false;
                          if (notificationFilter === 'unread') return !item.localReviewed;
                          return true;
                        });

                        if (validItems.length === 0 && !notificationSnapshot.incomingCall) {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.58, fontSize: 12 }}>
                              <Bell size={22} color="#38bdf8" style={{ marginBottom: 5, opacity: 0.85 }} />
                              <p style={{ margin: 0, fontWeight: 600 }}>{notificationFilter === 'unread' ? 'All notifications reviewed' : 'No new notifications'}</p>
                            </div>
                          );
                        }

                        const renderCardItem = (notif) => {
                          if (!notif || (!notif.title?.trim() && !notif.body?.trim())) return null;
                          const isMessaging = (notif.applicationName || "").toLowerCase().match(/whatsapp|telegram|slack|discord|signal|teams/);
                          const hasReply = notif.capabilities?.some(c => c.type === 'reply' && c.supported);
                          const currentActionStatus = actionStatuses[notif.id];
                          const isSnoozeOpen = snoozeMenuOpenId === notif.id;

                          return (
                            <div
                              key={notif.id}
                              className="notification-card"
                              onClick={() => {
                                if (notif.applicationId || notif.appId) {
                                  handleExecuteAction(notif.id, 'open', { appId: notif.applicationId || notif.appId });
                                }
                                if (!notif.localReviewed) {
                                  window.electronAPI?.notifications?.markReviewed?.(notif.id);
                                }
                              }}
                              style={{
                                cursor: (notif.applicationId || notif.appId) ? 'pointer' : 'default',
                                background: 'linear-gradient(180deg, #1b1d26 0%, #12131a 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.09)',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.12)'
                              }}
                            >
                              <span className={`notification-priority-dot ${notif.priority || 'normal'}`} />

                              {notif.applicationIcon || notif.icon ? (
                                <img src={notif.applicationIcon || notif.icon} className="notification-icon" alt="" />
                              ) : (
                                <div className="notification-icon" style={{ backgroundColor: '#090a0f', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Bell size={14} color="#38bdf8" />
                                </div>
                              )}

                              <div className="notification-content">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span className="notification-app-name">{notif.applicationName || notif.appName}</span>
                                  <span style={{ fontSize: 9, opacity: 0.5 }}>
                                    {formatRelativeTime(notif.receivedAt || notif.timestamp)}
                                  </span>
                                </div>

                                <span className="notification-title">{notif.title}</span>
                                <span className="notification-body">{notif.body}</span>

                                {currentActionStatus && (
                                  <div style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: currentActionStatus.status === 'success' ? '#22c55e' : currentActionStatus.status === 'pending' ? '#38bdf8' : '#ef4444',
                                    marginTop: 4
                                  }}>
                                    {currentActionStatus.message}
                                  </div>
                                )}

                                {(isMessaging || hasReply) && (
                                  <div
                                    className="notification-reply-container"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="text"
                                      className="notification-reply-input"
                                      placeholder={notif.senderName ? `Reply to ${notif.senderName}…` : "Type a reply…"}
                                      value={replyInputs[notif.id] || ""}
                                      onChange={(e) => setReplyInputs({ ...replyInputs, [notif.id]: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleSendReply(notif.id);
                                        }
                                      }}
                                      style={{
                                        background: '#08090d',
                                        border: '1px solid rgba(56, 189, 248, 0.25)',
                                        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.9)'
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="notification-action-btn"
                                      onClick={() => handleSendReply(notif.id)}
                                      title="Send reply"
                                      style={{ padding: '4px 8px' }}
                                    >
                                      <Send size={11} />
                                    </button>
                                  </div>
                                )}

                                <div
                                  style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {(notif.applicationId || notif.appId) && (
                                    <button
                                      type="button"
                                      className="notification-action-btn"
                                      onClick={() => handleExecuteAction(notif.id, 'open', { appId: notif.applicationId || notif.appId })}
                                    >
                                      <ExternalLink size={10} /> Open
                                    </button>
                                  )}

                                  <div style={{ position: 'relative' }}>
                                    <button
                                      type="button"
                                      className="notification-action-btn"
                                      onClick={() => setSnoozeMenuOpenId(isSnoozeOpen ? null : notif.id)}
                                    >
                                      <Clock size={10} /> Snooze <ChevronDown size={9} />
                                    </button>
                                    {isSnoozeOpen && (
                                      <div style={{
                                        position: 'absolute',
                                        bottom: '100%',
                                        left: 0,
                                        marginBottom: 4,
                                        background: '#0e0f15',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        borderRadius: 8,
                                        padding: 4,
                                        display: 'flex',
                                        gap: 4,
                                        zIndex: 999,
                                        boxShadow: '0 6px 16px rgba(0,0,0,0.85)'
                                      }}>
                                        {[5, 15, 30, 60].map(mins => (
                                          <button
                                            type="button"
                                            key={mins}
                                            onClick={() => handleSnooze(notif.id, mins)}
                                            style={{
                                              background: 'rgba(255,255,255,0.08)',
                                              border: 'none',
                                              color: '#ffffff',
                                              fontSize: 10,
                                              fontWeight: 600,
                                              padding: '3px 6px',
                                              borderRadius: 4,
                                              cursor: 'pointer'
                                            }}
                                          >
                                            {mins < 60 ? `${mins}m` : '1h'}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                className="notification-dismiss"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExecuteAction(notif.id, 'dismiss');
                                }}
                                title="Dismiss notification"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          );
                        };

                        return (
                          <>
                            {notificationSnapshot.lowPrioritySummary?.count > 0 && notificationFilter === 'all' && (
                              <div style={{
                                marginBottom: 8,
                                padding: '6px 10px',
                                background: '#0e1017',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.8)',
                                borderRadius: 10,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flex: 1 }}
                                    onClick={() => setLowPriorityExpanded(prev => !prev)}
                                  >
                                    <SlidersHorizontal size={12} opacity={0.6} />
                                    <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>
                                      {notificationSnapshot.lowPrioritySummary.count} low-priority {notificationSnapshot.lowPrioritySummary.count === 1 ? 'alert' : 'alerts'}
                                    </span>
                                    {lowPriorityExpanded ? <ChevronUp size={12} opacity={0.6} /> : <ChevronDown size={12} opacity={0.6} />}
                                  </div>
                                  <button
                                    type="button"
                                    className="notification-header-btn"
                                    onClick={() => {
                                      notificationSnapshot.lowPrioritySummary.items.forEach(i => handleExecuteAction(i.id, 'dismiss'));
                                    }}
                                    title="Dismiss low-priority alerts"
                                  >
                                    Dismiss All
                                  </button>
                                </div>

                                {lowPriorityExpanded && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                                    {notificationSnapshot.lowPrioritySummary.items.map(item => (
                                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                          <span style={{ fontSize: 10, fontWeight: 600 }}>{item.applicationName}: {item.title}</span>
                                          <span style={{ fontSize: 9, opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.body}</span>
                                        </div>
                                        <button
                                          type="button"
                                          className="notification-dismiss"
                                          onClick={() => handleExecuteAction(item.id, 'dismiss')}
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {validItems.map(notif => renderCardItem(notif))}
                          </>
                        );
                      })()
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Game / System Performance Overlay Tab (3 Circular 3D Instrument Dial Gauges) */}
            {currentTab === 6 && (
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-around',
                width: '100%',
                height: '100%',
                padding: '10px 22px',
                boxSizing: 'border-box',
                userSelect: 'none'
              }}>
                <ThreeDInstrumentDial
                  label="CPU"
                  sublabel="LOAD"
                  value={systemStats.cpu}
                  accentColor="#0a84ff"
                  size={116}
                />
                <ThreeDInstrumentDial
                  label="RAM"
                  sublabel="MEMORY"
                  value={systemStats.ram}
                  accentColor="#a855f7"
                  size={116}
                />
                <ThreeDInstrumentDial
                  label="BAT"
                  sublabel={charging ? "CHARGING" : "POWER"}
                  value={percent !== null ? percent : 0}
                  accentColor={(percent || 0) <= 20 ? '#ff453a' : '#30d158'}
                  size={116}
                />
              </div>
            )}

            {/* Clipboard Tab (Left 3D Vault Summary Pod + Right Sunken Clip Cards — Indigo Accent) */}
            {currentTab === 7 && (() => {
              const iosFontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Rounded", "OpenRunde", system-ui, sans-serif';
              return (
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
                    gap: 14,
                    userSelect: 'none',
                    fontFamily: iosFontStack
                  }}
                >
                  {/* Left Column: 3D Vault Summary Pod */}
                  <div
                    style={{
                      width: 152,
                      height: '100%',
                      flexShrink: 0,
                      borderRadius: 16,
                      padding: '9px 11px',
                      boxSizing: 'border-box',
                      background: 'linear-gradient(165deg, #1d1d2c 0%, #12121d 60%, #0b0b12 100%)',
                      border: '1px solid rgba(129, 140, 248, 0.24)',
                      boxShadow: `
                        0 8px 18px rgba(0, 0, 0, 0.8),
                        inset 0 1px 1px rgba(255, 255, 255, 0.14),
                        inset 0 -2px 4px rgba(0, 0, 0, 0.85)
                      `,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 6,
                              background: 'linear-gradient(180deg, #27245d 0%, #161438 100%)',
                              border: '1px solid rgba(129, 140, 248, 0.45)',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.7)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <List size={11} color="#818cf8" />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>
                            Clip Vault
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 9.5,
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: 999,
                            background: '#09090f',
                            border: '1px solid rgba(129, 140, 248, 0.35)',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.9)',
                            color: '#818cf8'
                          }}
                        >
                          {clipboard.length}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: 9.5,
                          color: 'rgba(255, 255, 255, 0.5)',
                          marginTop: 6,
                          lineHeight: 1.3
                        }}
                      >
                        {clipboard.length === 0
                          ? "Copy any text to capture it here."
                          : `${clipboard.length} snippet${clipboard.length === 1 ? '' : 's'} stored in memory`}
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.03, filter: 'brightness(1.1)' }}
                      whileTap={{ scale: 0.96 }}
                      onClick={clearAllClipboard}
                      disabled={clipboard.length === 0}
                      style={{
                        width: '100%',
                        height: 30,
                        borderRadius: 999,
                        background: 'linear-gradient(180deg, #231f4e 0%, #141130 100%)',
                        border: '1px solid rgba(129, 140, 248, 0.36)',
                        boxShadow: `
                          0 4px 10px rgba(0, 0, 0, 0.75),
                          inset 0 1px 1px rgba(255, 255, 255, 0.16),
                          inset 0 -1px 2px rgba(0, 0, 0, 0.85)
                        `,
                        color: '#818cf8',
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: iosFontStack,
                        cursor: clipboard.length === 0 ? 'not-allowed' : 'pointer',
                        opacity: clipboard.length === 0 ? 0.45 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5
                      }}
                    >
                      <Trash2 size={11} /> Clear Vault
                    </motion.button>
                  </div>

                  {/* Right Column: Sunken 3D Clip Cards List */}
                  <div
                    id="clipboard"
                    style={{
                      flex: 1,
                      height: '100%',
                      minWidth: 0,
                      padding: '6px 8px',
                      borderRadius: 16,
                      background: 'linear-gradient(180deg, #09090e 0%, #0f0f17 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.95)',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      boxSizing: 'border-box',
                      animation: 'none'
                    }}
                  >
                    {clipboard.length === 0 ? (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.55 }}>
                        <List size={22} color="#818cf8" style={{ marginBottom: 4 }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>Clipboard Vault Empty</span>
                      </div>
                    ) : (
                      clipboard.map((item, index) => (
                        <div
                          className="clipboard-row"
                          key={index}
                          style={{
                            background: 'linear-gradient(180deg, #1b1b26 0%, #12121a 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.09)',
                            borderRadius: 11,
                            padding: '7px 10px',
                            marginBottom: 6,
                            boxShadow: '0 4px 10px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.12)'
                          }}
                        >
                          <p className="clipboard-content" style={{ paddingRight: '62px', color: '#ffffff', fontSize: 12, fontFamily: iosFontStack }}>{item}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(item);
                              const btn = e.currentTarget;
                              btn.innerText = "Copied!";
                              btn.style.color = '#34d399';
                              btn.style.borderColor = 'rgba(52, 211, 153, 0.5)';
                              setTimeout(() => {
                                btn.innerText = "Copy";
                                btn.style.color = '#818cf8';
                                btn.style.borderColor = 'rgba(129, 140, 248, 0.38)';
                              }, 1500);
                            }}
                            style={{
                              position: 'absolute',
                              top: '7px',
                              right: '8px',
                              zIndex: 10,
                              background: 'linear-gradient(180deg, #231f4e 0%, #141130 100%)',
                              border: '1px solid rgba(129, 140, 248, 0.38)',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.75), inset 0 1px 1px rgba(255,255,255,0.16)',
                              borderRadius: '999px',
                              color: '#818cf8',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              padding: '3px 10px',
                              cursor: 'pointer'
                            }}
                          >
                            Copy
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Tasks / Reminders Tab (Left 3D Console & Input Trough + Right Sunken Task Well — Amber & Emerald Accents) */}
            {currentTab === 8 && (
              <ErrorBoundary tabName="Tasks" onGoHome={() => setTabState([2, -1])}>
                {(() => {
                  const iosFontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Rounded", "OpenRunde", system-ui, sans-serif';
                  return (
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
                    gap: 14,
                    userSelect: 'none',
                    fontFamily: iosFontStack
                  }}
                >
                  {/* Left Column: 3D Reminders Console + Sunken Quick-Add Trough */}
                  <div
                    style={{
                      width: 170,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      flexShrink: 0,
                      gap: 7
                    }}
                  >
                    {/* Top 3D Beveled Reminders Header Card */}
                    <div style={{
                      flex: 1,
                      background: 'linear-gradient(165deg, #261e16 0%, #15120e 60%, #0c0a08 100%)',
                      border: '1px solid rgba(255, 159, 10, 0.24)',
                      borderRadius: 15,
                      padding: '8px 10px',
                      boxShadow: `
                        0 8px 18px rgba(0, 0, 0, 0.8),
                        inset 0 1px 1px rgba(255, 255, 255, 0.14),
                        inset 0 -2px 4px rgba(0, 0, 0, 0.85)
                      `,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            background: 'linear-gradient(180deg, #ff9f0a 0%, #d97706 100%)',
                            boxShadow: '0 2px 6px rgba(255, 159, 10, 0.45)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff'
                          }}>
                            <Check size={12} strokeWidth={3} />
                          </div>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#ffffff' }}>
                            Reminders
                          </span>
                        </div>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '1px 7px',
                          borderRadius: 999,
                          background: '#090807',
                          border: `1px solid ${tasks.length > 0 ? 'rgba(255, 159, 10, 0.4)' : 'rgba(52, 199, 89, 0.4)'}`,
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.9)',
                          color: tasks.length > 0 ? '#ff9f0a' : '#34c759'
                        }}>
                          {tasks.length}
                        </span>
                      </div>
                      <span style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.55)' }}>
                        {tasks.length === 0 ? "All tasks completed" : `${tasks.length} active reminder${tasks.length === 1 ? '' : 's'}`}
                      </span>
                    </div>

                    {/* Bottom Sunken 3D Quick-Add Input Trough */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'nowrap',
                        alignItems: 'center',
                        gap: 5,
                        width: '100%',
                        height: 34,
                        background: '#09080b',
                        border: '1px solid rgba(255, 159, 10, 0.24)',
                        boxShadow: 'inset 0 3px 8px rgba(0, 0, 0, 0.94), 0 3px 8px rgba(0, 0, 0, 0.6)',
                        borderRadius: 11,
                        padding: '0 4px 0 9px',
                        boxSizing: 'border-box',
                        minWidth: 0
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
                          width: '100%',
                          minWidth: 0,
                          height: 26,
                          background: 'none',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: 11.5,
                          fontWeight: 500,
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: iosFontStack
                        }}
                      />

                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => addTask()}
                        style={{
                          height: 25,
                          padding: '0 10px',
                          background: 'linear-gradient(180deg, #35210d 0%, #221407 100%)',
                          border: '1px solid rgba(255, 159, 10, 0.38)',
                          boxShadow: '0 3px 7px rgba(0,0,0,0.75), inset 0 1px 1px rgba(255,195,100,0.22)',
                          color: '#FF9F0A',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: iosFontStack,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Add
                      </motion.button>
                    </div>
                  </div>

                  {/* Right Column: Sunken 3D Task Well */}
                  <div
                    id="task-list"
                    className="task-list-scrollable"
                    style={{
                      flex: 1,
                      height: '100%',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 5,
                      minWidth: 0,
                      margin: 0,
                      padding: '6px 8px',
                      borderRadius: 16,
                      background: 'linear-gradient(180deg, #09090d 0%, #0e0e14 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.95)',
                      boxSizing: 'border-box'
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
                            color: '#ffffff',
                            userSelect: 'none'
                          }}
                        >
                          <CheckCircle2 size={24} color="#34c759" style={{ opacity: 0.9, marginBottom: 4, filter: 'drop-shadow(0 0 8px rgba(52,199,89,0.4))' }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>No pending tasks</span>
                          <span style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.45)', marginTop: 2 }}>You're all caught up!</span>
                        </motion.div>
                      ) : (
                        tasks.map((task, index) => {
                          const taskTitle = typeof task === "string" ? task : (task?.title || task?.text || task?.name || "Untitled Task");
                          const taskKey = typeof task === "object" && task?.id ? task.id : `task-${taskTitle}-${index}`;

                          return (
                            <motion.div
                              key={taskKey}
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
                                borderRadius: 11,
                                background: 'linear-gradient(180deg, #1b1b23 0%, #121218 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.09)',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.12)',
                                boxSizing: 'border-box',
                                flexShrink: 0,
                                userSelect: 'none'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                                {/* Recessed 3D Circular Check Well */}
                                <motion.button
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() => removeTask(index)}
                                  style={{
                                    width: 17,
                                    height: 17,
                                    borderRadius: '50%',
                                    border: '1.5px solid rgba(255, 159, 10, 0.5)',
                                    background: '#08080b',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.9)',
                                    cursor: 'pointer',
                                    padding: 0,
                                    flexShrink: 0,
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#34c759';
                                    e.currentTarget.style.background = 'rgba(52, 199, 89, 0.25)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255, 159, 10, 0.5)';
                                    e.currentTarget.style.background = '#08080b';
                                  }}
                                  title="Mark as completed"
                                />

                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: '#ffffff',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    fontFamily: iosFontStack
                                  }}
                                >
                                  {taskTitle}
                                </span>
                              </div>

                              <motion.button
                                whileHover={{ opacity: 1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => removeTask(index)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#f87171',
                                  opacity: 0.45,
                                  cursor: 'pointer',
                                  padding: 2,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: 4
                                }}
                                title="Delete task"
                              >
                                <Trash2 size={13} />
                              </motion.button>
                            </motion.div>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })()}
          </ErrorBoundary>
        )}

            {/* Timer Tab (State 1: img1 3D Horizontal Tick-Ruler + Right Presets | State 2: 3D Dark Active Countdown) */}
            {currentTab === 10 && (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 16px',
                boxSizing: 'border-box',
                userSelect: 'none'
              }}>
                {!isTimerRunning && timerSeconds === 0 ? (
                  <TimerTickRulerSelector
                    customTimerSetup={customTimerSetup}
                    setCustomTimerSetup={setCustomTimerSetup}
                    onStartCustom={(secs) => {
                      setTimerTotalDuration(secs);
                      startTimer(secs);
                    }}
                    onStartPreset={(secs) => {
                      setTimerTotalDuration(secs);
                      startTimer(secs);
                    }}
                  />
                ) : (
                  /* STATE 2: Active / Running / Paused Timer Screen with 3D Dark Depth */
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 18,
                      padding: '8px 20px',
                      boxSizing: 'border-box',
                      background: 'linear-gradient(180deg, #131216 0%, #0a0a0d 100%)',
                      border: '1px solid rgba(255, 159, 10, 0.2)',
                      boxShadow: `
                        0 8px 20px rgba(0, 0, 0, 0.8),
                        inset 0 4px 12px rgba(0, 0, 0, 0.94),
                        inset 0 1px 1px rgba(255, 255, 255, 0.06)
                      `,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    {/* Top Center: Sunken Bell / Total Duration Pill */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '2px 10px',
                        borderRadius: 999,
                        background: '#08080b',
                        border: '1px solid rgba(255, 159, 10, 0.25)',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.9)'
                      }}
                    >
                      <BellOff size={11} color="#FF9F0A" />
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255, 255, 255, 0.78)', fontFamily: 'OpenRunde, system-ui, sans-serif' }}>
                        {formatTimerMMSS(timerTotalDuration)}
                      </span>
                    </div>

                    {/* Center Section: Left 3D Pause/Play | Center Giant Time | Right 3D Cancel */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 6px' }}>
                      {/* Left: Tactile 3D Dark-Amber Pause/Play Button */}
                      <motion.button
                        whileHover={{ scale: 1.07 }}
                        whileTap={{ scale: 0.93 }}
                        onClick={toggleTimer}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: 'linear-gradient(180deg, #35210d 0%, #221407 100%)',
                          border: '1px solid rgba(255, 159, 10, 0.45)',
                          boxShadow: `
                            0 6px 16px rgba(0, 0, 0, 0.85),
                            0 0 12px rgba(255, 159, 10, 0.2),
                            inset 0 1.5px 2px rgba(255, 195, 100, 0.25),
                            inset 0 -2px 4px rgba(0, 0, 0, 0.9)
                          `,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        {isTimerRunning ? (
                          <Pause size={19} color="#FF9F0A" fill="#FF9F0A" />
                        ) : (
                          <Play size={19} color="#FF9F0A" fill="#FF9F0A" style={{ marginLeft: 2 }} />
                        )}
                      </motion.button>

                      {/* Center: Giant 3D Countdown Display & Subtitle */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{
                          fontSize: 38,
                          fontWeight: 700,
                          color: '#FF9F0A',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "OpenRunde", system-ui, sans-serif',
                          letterSpacing: '-1.2px',
                          lineHeight: 1,
                          fontVariantNumeric: 'tabular-nums',
                          textShadow: '0 3px 12px rgba(255, 159, 10, 0.35), 0 3px 6px rgba(0, 0, 0, 0.9)'
                        }}>
                          {formatTimerMMSS(timerSeconds)}
                        </div>
                        <div style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'rgba(255, 255, 255, 0.48)',
                          letterSpacing: '0.6px',
                          textTransform: 'uppercase',
                          marginTop: 3
                        }}>
                          {isTimerRunning ? 'Counting Down' : 'Paused'}
                        </div>
                      </div>

                      {/* Right: Tactile 3D Dark-Crimson Cancel/Reset Button */}
                      <motion.button
                        whileHover={{ scale: 1.07 }}
                        whileTap={{ scale: 0.93 }}
                        onClick={resetTimer}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: 'linear-gradient(180deg, #381210 0%, #220a09 100%)',
                          border: '1px solid rgba(255, 69, 58, 0.48)',
                          boxShadow: `
                            0 6px 16px rgba(0, 0, 0, 0.85),
                            0 0 12px rgba(255, 69, 58, 0.2),
                            inset 0 1.5px 2px rgba(255, 130, 120, 0.25),
                            inset 0 -2px 4px rgba(0, 0, 0, 0.9)
                          `,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={20} color="#ff453a" />
                      </motion.button>
                    </div>

                    <div style={{ height: 2 }} />
                  </div>
                )}
              </div>
            )}

            {/* Settings Overhaul - Apple macOS System Settings Architecture (3D Dark Beveled Wells) */}
            {currentTab === 9 && (() => {
              const iosFontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Rounded", "OpenRunde", system-ui, sans-serif';
              const categories = [
                { id: 'general', label: 'General', icon: SlidersHorizontal },
                { id: 'appearance', label: 'Appearance', icon: Palette },
                { id: 'position', label: 'Position', icon: Compass },
                { id: 'tabs', label: 'Tabs', icon: Layers },
                { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
                { id: 'features', label: 'Features', icon: Zap },
                { id: 'weather', label: 'Weather', icon: CloudSun },
                { id: 'updates', label: 'Updates', icon: RefreshCw, hasBadge: (updateStatus === 'available' || updateStatus === 'downloaded') }
              ];

              const appleSelectStyle = {
                background: '#090a0f',
                border: '1px solid rgba(10, 132, 255, 0.28)',
                boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.92), 0 1px 1px rgba(255, 255, 255, 0.06)',
                borderRadius: 8,
                padding: '4px 8px',
                color: '#ffffff',
                fontSize: 11.5,
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                fontFamily: iosFontStack
              };

              const settingsGroupCardStyle = {
                background: 'linear-gradient(180deg, #161822 0%, #0e1017 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                boxShadow: `
                  0 6px 14px rgba(0, 0, 0, 0.78),
                  inset 0 1px 1px rgba(255, 255, 255, 0.12),
                  inset 0 -1.5px 3px rgba(0, 0, 0, 0.9)
                `,
                overflow: 'hidden'
              };

              const settingsInputTroughStyle = {
                padding: '3px 8px',
                fontSize: 11,
                background: '#08090d',
                borderRadius: 7,
                color: textColor,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.92)',
                outline: 'none',
                fontFamily: iosFontStack
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
                    padding: '8px 12px',
                    gap: 10,
                    margin: 0,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    userSelect: 'none',
                    fontFamily: iosFontStack
                  }}
                >
                  {/* Left Sidebar: Sunken 3D Category Navigation Well */}
                  <div
                    id="settings-sidebar"
                    className="settings-sidebar settings-sidebar-scrollable"
                    data-scrollable="true"
                    style={{
                      width: 128,
                      height: '100%',
                      borderRadius: 14,
                      border: '1px solid rgba(10, 132, 255, 0.18)',
                      background: 'linear-gradient(180deg, #090a0f 0%, #10121a 100%)',
                      boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.94), 0 4px 12px rgba(0, 0, 0, 0.6)',
                      padding: '6px',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      flexShrink: 0,
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'color-mix(in srgb, var(--island-text-color), transparent 80%) transparent'
                    }}
                  >
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
                            gap: 7,
                            padding: '5.5px 8px',
                            borderRadius: 9,
                            background: isActive
                              ? 'linear-gradient(180deg, #132a4a 0%, #0b182b 100%)'
                              : 'transparent',
                            border: isActive
                              ? '1px solid rgba(10, 132, 255, 0.42)'
                              : '1px solid transparent',
                            boxShadow: isActive
                              ? '0 3px 8px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.16)'
                              : 'none',
                            color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.62)',
                            fontSize: 11.5,
                            fontWeight: isActive ? 700 : 600,
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                            fontFamily: iosFontStack
                          }}
                        >
                          <IconComp size={13} color={isActive ? '#38bdf8' : 'currentColor'} />
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

                  {/* Right Content Area: Sunken 3D Grouped Settings Well */}
                  <div
                    id="settings-content"
                    className="settings-content settings-content-scrollable"
                    data-scrollable="true"
                    style={{
                      flex: 1,
                      height: '100%',
                      borderRadius: 14,
                      background: 'linear-gradient(180deg, #090a0f 0%, #101219 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.94), 0 4px 12px rgba(0, 0, 0, 0.6)',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      padding: '8px 12px',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'color-mix(in srgb, var(--island-text-color), transparent 80%) transparent'
                    }}
                  >
                    {/* CATEGORY: GENERAL */}
                    {settingsTab === 'general' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          General Preferences
                        </div>
                        <div style={settingsGroupCardStyle}>
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
                                  <option key={d.id} value={d.id} style={{ background: '#11131a', color: '#fff' }}>{d.label}</option>
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
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          Appearance & Theme
                        </div>
                        <div style={settingsGroupCardStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Theme</span>
                            <select
                              value={theme}
                              onChange={(e) => setTheme(e.target.value)}
                              style={appleSelectStyle}
                            >
                              <option value="none" style={{ background: '#11131a', color: '#fff' }}>Default</option>
                              <option value="sleek-black" style={{ background: '#11131a', color: '#fff' }}>Sleek Black</option>
                              <option value="win95" style={{ background: '#11131a', color: '#fff' }}>Windows 95</option>
                            </select>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Always on Top</span>
                              <span style={{ fontSize: 9.5, opacity: 0.6, color: textColor }}>Stay above other windows at all times</span>
                            </div>
                            <AppleSwitch
                              checked={alwaysOnTopEnabled}
                              onChange={(checked) => handleAlwaysOnTopChange({ target: { value: checked ? "true" : "false" } })}
                            />
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
                              <div style={{ width: 13, height: 13, borderRadius: '50%', background: bgColor, border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)' }} />
                              <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Island Color</span>
                            </div>
                            <input
                              className="select-input"
                              style={{ ...settingsInputTroughStyle, width: 85 }}
                              placeholder="#000000"
                              value={bgColor}
                              onChange={handleBgColorChange}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 13, height: 13, borderRadius: '50%', background: textColor, border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)' }} />
                              <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Text Color</span>
                            </div>
                            <input
                              className="select-input"
                              style={{ ...settingsInputTroughStyle, width: 85 }}
                              placeholder="#FAFAFA"
                              value={textColor}
                              onChange={handleTextColorChange}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '7px 12px' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Background Image URL</span>
                            <input
                              className="select-input"
                              style={{ ...settingsInputTroughStyle, width: '100%' }}
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
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          Position & Placement
                        </div>
                        <div style={{
                          ...settingsGroupCardStyle,
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
                                    borderRadius: 8,
                                    background: isSel
                                      ? 'linear-gradient(180deg, #14325c 0%, #0b1b33 100%)'
                                      : 'linear-gradient(180deg, #1c1f2b 0%, #12141c 100%)',
                                    border: isSel
                                      ? '1px solid rgba(10, 132, 255, 0.55)'
                                      : '1px solid rgba(255, 255, 255, 0.08)',
                                    boxShadow: isSel
                                      ? '0 3px 8px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
                                      : '0 2px 5px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
                                    color: isSel ? '#60a5fa' : 'rgba(255, 255, 255, 0.72)',
                                    fontSize: 10.5,
                                    fontWeight: isSel ? 700 : 600,
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
                                  style={{ flex: 1, accentColor: '#0a84ff' }}
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
                                  style={{ flex: 1, accentColor: '#0a84ff' }}
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
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            Tab Management
                          </span>
                          <span style={{ fontSize: 9.5, opacity: 0.5 }}>Drag or use arrows</span>
                        </div>
                        <div style={{
                          ...settingsGroupCardStyle,
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

                    {/* CATEGORY: SHORTCUTS */}
                    {settingsTab === 'shortcuts' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                              Tab Shortcuts
                            </div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
                              Press Alt + [Letter] to open any tab instantly. Ctrl is reserved for Click-Through.
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleResetShortcuts}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 8px',
                              background: 'linear-gradient(180deg, #1e212e 0%, #13151e 100%)',
                              border: '1px solid rgba(255, 255, 255, 0.14)',
                              boxShadow: '0 3px 8px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.14)',
                              borderRadius: 7,
                              color: 'rgba(255, 255, 255, 0.85)',
                              fontSize: 10.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title="Reset all tab shortcuts to defaults"
                          >
                            <RotateCcw size={11} />
                            <span>Reset Defaults</span>
                          </button>
                        </div>

                        {recordingConflict && (
                          <div style={{
                            padding: '5px 10px',
                            borderRadius: 8,
                            fontSize: 10.5,
                            fontWeight: 600,
                            background: recordingConflict.includes('Ctrl') ? 'rgba(239, 68, 68, 0.18)' : 'rgba(56, 189, 248, 0.18)',
                            border: recordingConflict.includes('Ctrl') ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(56, 189, 248, 0.35)',
                            color: recordingConflict.includes('Ctrl') ? '#fca5a5' : '#7dd3fc',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}>
                            {recordingConflict.includes('Ctrl') ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                            <span>{recordingConflict}</span>
                          </div>
                        )}

                        <div style={{
                          ...settingsGroupCardStyle,
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          {TABS.map((tab, i) => {
                            const isRecording = recordingTabId === tab.id;
                            const currentShortcut = tabShortcuts[tab.id] || "";
                            const parts = currentShortcut ? currentShortcut.split("+") : [];

                            return (
                              <div
                                key={tab.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '6px 12px',
                                  borderBottom: i < TABS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                  background: isRecording ? 'rgba(10, 132, 255, 0.14)' : 'transparent',
                                  transition: 'background 0.15s ease'
                                }}
                              >
                                {/* Left: Icon & Tab Name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, flex: 1 }}>
                                  <div style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 7,
                                    background: '#090a0f',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    boxShadow: 'inset 0 2px 5px rgba(0, 0, 0, 0.9)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    {tab.icon("#38bdf8")}
                                  </div>
                                  <span style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: textColor,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {tab.name}
                                  </span>
                                </div>

                                {/* Right: Key Badge & Action */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {isRecording ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      <span style={{
                                        padding: '3px 8px',
                                        borderRadius: 6,
                                        fontSize: 10.5,
                                        fontWeight: 700,
                                        color: '#ffffff',
                                        background: '#0a84ff',
                                        boxShadow: '0 0 10px rgba(10, 132, 255, 0.5)',
                                        letterSpacing: '0.02em'
                                      }}>
                                        Press letter...
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRecordingTabId(null);
                                          setRecordingConflict(null);
                                        }}
                                        style={{
                                          padding: '3px 6px',
                                          borderRadius: 6,
                                          background: 'rgba(255,255,255,0.1)',
                                          border: 'none',
                                          color: 'rgba(255,255,255,0.7)',
                                          fontSize: 10,
                                          cursor: 'pointer'
                                        }}
                                        title="Cancel"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRecordingTabId(tab.id);
                                        setRecordingConflict(null);
                                      }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '3px 7px',
                                        background: '#090a0f',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        boxShadow: 'inset 0 2px 5px rgba(0, 0, 0, 0.9)',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                      }}
                                      title="Click to customize shortcut"
                                    >
                                      {parts.length > 0 ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                          {parts.map((p, pIdx) => (
                                            <span
                                              key={pIdx}
                                              style={{
                                                fontSize: 10.5,
                                                fontWeight: 700,
                                                padding: '1px 5px',
                                                borderRadius: 4,
                                                background: p === 'Alt' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(10, 132, 255, 0.25)',
                                                color: p === 'Alt' ? 'rgba(255, 255, 255, 0.85)' : '#60a5fa',
                                                fontFamily: 'monospace',
                                                letterSpacing: '0.04em'
                                              }}
                                            >
                                              {p === 'Alt' ? '⌥ Alt' : p}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                                          None (Click to record)
                                        </span>
                                      )}
                                    </button>
                                  )}
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
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          Features & Alerts
                        </div>
                        <div style={settingsGroupCardStyle}>
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
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Show Info When Idle</span>
                            <AppleSwitch
                              checked={showInfoWhenIdleEnabled}
                              onChange={(checked) => handleShowInfoWhenIdleChange({ target: { value: checked ? "true" : "false" } })}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Hide Notification Previews</span>
                            <AppleSwitch
                              checked={Boolean(notificationSnapshot?.settings?.hidePreviews)}
                              onChange={() => handleTogglePrivacy()}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CATEGORY: WEATHER */}
                    {settingsTab === 'weather' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          Weather Preferences
                        </div>
                        <div style={settingsGroupCardStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Location</span>
                            <input
                              className="select-input"
                              style={{ ...settingsInputTroughStyle, width: 140 }}
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
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          Software Updates
                        </div>
                        <div className="settings-update-card" style={{ ...settingsGroupCardStyle, padding: '8px 10px' }}>
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
                                Update <strong>v{updateInfo?.version}</strong> downloaded! {autoDownloadInstallEnabled ? 'Installing silently in the background...' : ''}
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
                          ...settingsGroupCardStyle,
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: textColor }}>Auto-Download & Install</span>
                              <span style={{ fontSize: 9.5, opacity: 0.6, color: textColor }}>Automatically apply updates in background</span>
                            </div>
                            <AppleSwitch
                              checked={autoDownloadInstallEnabled}
                              onChange={(checked) => handleAutoDownloadInstallToggle(checked)}
                            />
                          </div>
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
      </div>

    </motion.div >
  );
}
