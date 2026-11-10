import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, RefreshCw } from "lucide-react";

// Standard prayers definition
const PRAYER_LIST = [
  { key: "Fajr", name: "Fajr", x: 25, y: 50 },
  { key: "Dhuhr", name: "Dhuhr", x: 80, y: 17 },
  { key: "Asr", name: "Asr", x: 135, y: 7 },
  { key: "Maghrib", name: "Maghrib", x: 190, y: 21 },
  { key: "Isha", name: "Isha", x: 235, y: 50 },
];

function parseToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export default function Prayer({ 
  accentColor = "#38bdf8", 
  locationName = "Rangpur",
  onPrayerAlert
}) {
  const [timings, setTimings] = useState(() => {
    try {
      const cached = localStorage.getItem("quick_pill_prayer_timings");
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return {
      Fajr: "04:59",
      Dhuhr: "11:47",
      Asr: "14:55",
      Maghrib: "17:16",
      Isha: "18:35"
    };
  });

  const [resolvedCity, setResolvedCity] = useState(() => {
    return localStorage.getItem("location") || locationName || "Rangpur";
  });
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Keep current time updated every 5 seconds for smooth countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Fetch timings from IPC or API whenever location changes
  useEffect(() => {
    let isMounted = true;
    const activeLoc = localStorage.getItem("location") || locationName || "Rangpur";
    setResolvedCity(activeLoc);

    async function loadTimings() {
      setIsLoading(true);
      try {
        let res = null;
        if (window.electronAPI?.prayer?.getTimings) {
          res = await window.electronAPI.prayer.getTimings(activeLoc);
        } else {
          // Direct web fallback when testing in browser
          const resp = await fetch(`http://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(activeLoc)}&method=1`);
          const json = await resp.json();
          if (json?.data?.timings) {
            const t = json.data.timings;
            res = {
              city: activeLoc,
              timings: {
                Fajr: t.Fajr?.slice(0, 5) || "04:59",
                Dhuhr: t.Dhuhr?.slice(0, 5) || "11:47",
                Asr: t.Asr?.slice(0, 5) || "14:55",
                Maghrib: t.Maghrib?.slice(0, 5) || "17:16",
                Isha: t.Isha?.slice(0, 5) || "18:35"
              }
            };
          }
        }

        if (isMounted && res?.timings) {
          setTimings(res.timings);
          try {
            localStorage.setItem("quick_pill_prayer_timings", JSON.stringify(res.timings));
          } catch (_) {}
        }
      } catch (err) {
        console.error("Prayer timing fetch error:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadTimings();
    return () => { isMounted = false; };
  }, [locationName]);

  // Compute next prayer, time difference, countdown, and progress
  const prayerState = useMemo(() => {
    const currentMin = currentTime.getHours() * 60 + currentTime.getMinutes();

    let nextIndex = -1;
    for (let i = 0; i < PRAYER_LIST.length; i++) {
      const pTime = timings[PRAYER_LIST[i].key] || "12:00";
      const pMin = parseToMinutes(pTime);
      if (pMin > currentMin) {
        nextIndex = i;
        break;
      }
    }

    let next;
    let prev;
    if (nextIndex !== -1) {
      next = PRAYER_LIST[nextIndex];
      prev = nextIndex > 0 ? PRAYER_LIST[nextIndex - 1] : PRAYER_LIST[PRAYER_LIST.length - 1];
    } else {
      // Past Isha -> Next is tomorrow Fajr
      next = PRAYER_LIST[0];
      prev = PRAYER_LIST[PRAYER_LIST.length - 1];
    }

    const nextTime = timings[next.key] || "12:00";
    const nextMin = parseToMinutes(nextTime);
    let diff = nextMin - currentMin;
    if (diff < 0) diff += 24 * 60;

    const h = Math.floor(diff / 60);
    const m = diff % 60;
    const countdown = h > 0 ? `in ${h} h ${m} min` : `in ${m} min`;

    // Progress within the prayer interval
    const prevTime = timings[prev.key] || "05:00";
    const prevMin = parseToMinutes(prevTime);
    let intervalSpan = nextMin - prevMin;
    if (intervalSpan <= 0) intervalSpan += 24 * 60;
    let elapsed = currentMin - prevMin;
    if (elapsed < 0) elapsed += 24 * 60;
    const progress = Math.min(1, Math.max(0, elapsed / intervalSpan));

    // Check if right at prayer time (within 1 minute)
    const isNow = diff === 0;

    return {
      next,
      nextTime,
      countdown,
      diffMinutes: diff,
      progress,
      isNow
    };
  }, [timings, currentTime]);

  return (
    <div 
      className="prayer-container"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        padding: "8px 14px 10px 14px",
        boxSizing: "border-box",
        position: "relative"
      }}
    >
      {/* Header bar: "Prayer", City badge, Status */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
        paddingLeft: 4,
        paddingRight: 4
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.01em",
            textShadow: "0 1px 3px rgba(0,0,0,0.5)"
          }}>
            Prayer
          </span>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 999,
            padding: "2px 8px",
            color: "#9ca3af",
            fontSize: 11,
            fontWeight: 500
          }}>
            <MapPin size={10} color="#9ca3af" />
            <span>{resolvedCity}</span>
            {isLoading && (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <RefreshCw size={9} color="#9ca3af" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Center / Status indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.75 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#10b981",
            boxShadow: "0 0 8px rgba(16, 185, 129, 0.6)"
          }} />
          <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>
            {currentTime.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
          </span>
        </div>
      </div>

      {/* Main Content: Split into Left Hero and Right Celestial Arc */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        minHeight: 0,
        gap: 12
      }}>
        {/* Left Section: Next Prayer Hero */}
        <div style={{
          flex: "0 0 170px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: 6
        }}>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#9ca3af",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 2
          }}>
            Next
          </span>

          <span style={{
            fontSize: 25,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            marginBottom: 4,
            textShadow: "0 2px 6px rgba(0,0,0,0.6)"
          }}>
            {prayerState.next.name}
          </span>

          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
            <span style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "-0.01em"
            }}>
              {prayerState.nextTime}
            </span>
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: accentColor,
              letterSpacing: "-0.01em"
            }}>
              {prayerState.countdown}
            </span>
          </div>

          {/* Progress bar line */}
          <div style={{
            width: 150,
            height: 3.5,
            borderRadius: 2,
            background: "rgba(255, 255, 255, 0.08)",
            overflow: "hidden"
          }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(prayerState.progress * 100)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)",
                borderRadius: 2
              }}
            />
          </div>
        </div>

        {/* Vertical Divider */}
        <div style={{
          width: 1,
          height: "80%",
          background: "rgba(255, 255, 255, 0.08)",
          flexShrink: 0
        }} />

        {/* Right Section: Celestial Arc */}
        <div style={{
          flex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          position: "relative"
        }}>
          <svg 
            viewBox="0 0 260 72" 
            style={{ width: "100%", height: 72, overflow: "visible" }}
          >
            {/* Baseline */}
            <line 
              x1="10" 
              y1="56" 
              x2="250" 
              y2="56" 
              stroke="rgba(255, 255, 255, 0.08)" 
              strokeWidth="1" 
            />

            {/* Parabolic Celestial Sun Arc */}
            <path 
              d="M 15 56 Q 130 -8 245 56" 
              fill="none" 
              stroke="rgba(255, 255, 255, 0.22)" 
              strokeWidth="1.5" 
            />

            {/* 5 Prayer Points on Arc */}
            {PRAYER_LIST.map((item) => {
              const isNext = prayerState.next.key === item.key;
              const time = timings[item.key] || "--:--";

              return (
                <g key={item.key}>
                  {/* Glowing Ring for Next Prayer */}
                  {isNext && (
                    <circle 
                      cx={item.x} 
                      cy={item.y} 
                      r="8" 
                      fill="none" 
                      stroke="rgba(56, 189, 248, 0.4)" 
                      strokeWidth="1.5" 
                    />
                  )}

                  {/* Dot Node on Curve */}
                  <circle 
                    cx={item.x} 
                    cy={item.y} 
                    r={isNext ? 4.5 : 3} 
                    fill={isNext ? "#ffffff" : "#6b7280"} 
                    stroke={isNext ? accentColor : "#1f2937"} 
                    strokeWidth={isNext ? 1.5 : 1}
                    style={{
                      filter: isNext ? "drop-shadow(0 0 5px rgba(255, 255, 255, 0.9))" : "none"
                    }}
                  />

                  {/* Prayer Name Below */}
                  <text
                    x={item.x}
                    y="66"
                    textAnchor="middle"
                    fill={isNext ? "#ffffff" : "#6b7280"}
                    fontSize={isNext ? "9.5" : "9"}
                    fontWeight={isNext ? "700" : "500"}
                  >
                    {item.name}
                  </text>

                  {/* Prayer Time Below Name */}
                  <text
                    x={item.x}
                    y="76"
                    textAnchor="middle"
                    fill={isNext ? "#d1d5db" : "#4b5563"}
                    fontSize="8.5"
                    fontWeight={isNext ? "600" : "400"}
                  >
                    {time}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
