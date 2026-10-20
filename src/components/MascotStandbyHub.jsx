import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Droplet,
  Battery,
  BatteryCharging,
  CheckSquare,
  Compass,
  Sparkles,
  Zap,
  Pause,
  Heart,
  Activity,
  MessageSquare,
  Inbox
} from "lucide-react";

/**
 * MascotStandbyHub: "Obsidian Visor-Cat / Cyber Spirit"
 * 
 * Standby Layout & Visuals:
 * - 20px bottom clearance preventing any overlap with pagination dots.
 * - Ultra-sleek top mini status bar (Time & Date on left, Battery & CPU on right).
 * - Organic squircle obsidian cat head/body silhouette with visor screen, gloss sheen, inner ears & underglow aura.
 * - Big, ultra-expressive glowing eyes with real-time cursor tracking.
 * - Refined glassmorphic smart status card with clean typography (pill-free header & sleek borderless action link).
 */
export default function MascotStandbyHub({
  time = "--:--",
  percent = 100,
  charging = false,
  systemStats = { cpu: 0, ram: 0 },
  spotifyTrack = null,
  isPlaying = false,
  pomodoroState = { isRunning: false, secondsLeft: 1500, totalSeconds: 1500, mode: "focus" },
  waterIntake = 0,
  waterGoal = 1500,
  onAddWater,
  tasks = [],
  shelfFiles = [],
  visibleTabs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16],
  onSwitchTab,
  onToggleMedia,
  onTogglePomodoro,
  onOpenLyrics
}) {
  // Eye tracking offsets (-8px to +8px)
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isPoked, setIsPoked] = useState(false);
  const [isGulping, setIsGulping] = useState(false);
  const [particles, setParticles] = useState([]);
  const [manualMoodCycle, setManualMoodCycle] = useState(0);

  const containerRef = useRef(null);
  const mascotStageRef = useRef(null);
  const pokeTimerRef = useRef(null);
  const gulpTimerRef = useRef(null);

  // Time & Date format for Top Mini Status Bar
  const dateFormatted = useMemo(() => {
    const d = new Date();
    const day = d.toLocaleDateString([], { weekday: "short" });
    const dayNum = d.getDate();
    const month = d.toLocaleDateString([], { month: "short" });
    return `${day}, ${dayNum} ${month}`;
  }, []);

  // Compute pending tasks and shelf count
  const pendingCount = useMemo(() => {
    if (!Array.isArray(tasks)) return 0;
    return tasks.filter(t => (typeof t === "object" ? !(t.completed || t.done) : true)).length;
  }, [tasks]);

  const shelfCount = useMemo(() => {
    return Array.isArray(shelfFiles) ? shelfFiles.length : 0;
  }, [shelfFiles]);

  // Pomodoro formatted time (MM:SS)
  const formattedPomodoroTime = useMemo(() => {
    const sec = pomodoroState?.secondsLeft || 0;
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [pomodoroState?.secondsLeft]);

  // Natural Blinking Loop
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 140);
    }, 3200 + Math.random() * 2500);

    return () => clearInterval(blinkInterval);
  }, []);

  // Real-Time Mouse Tracking (looks at cursor inside visor)
  const handleMouseMove = useCallback((e) => {
    if (!mascotStageRef.current) return;
    const rect = mascotStageRef.current.getBoundingClientRect();
    const mascotCenterX = rect.left + rect.width * 0.48;
    const mascotCenterY = rect.top + rect.height * 0.52;

    const diffX = e.clientX - mascotCenterX;
    const diffY = e.clientY - mascotCenterY;

    // Smooth clamp: x within [-8, 8], y within [-5, 5]
    const x = Math.max(-8, Math.min(8, Math.round(diffX / 14)));
    const y = Math.max(-5, Math.min(5, Math.round(diffY / 12)));

    setEyeOffset({ x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setEyeOffset({ x: 0, y: 0 });
  }, []);

  // Available candidate moods based on live system state and active modules
  const availableInsights = useMemo(() => {
    const list = [];

    // 1. Pomodoro Focusing Check (active focus state) - Tab 10
    if (visibleTabs.includes(10) && pomodoroState?.isRunning) {
      list.push("focusing");
    }

    // 2. Media / Music Playing Check (active entertainment state) - Tab 3
    if (visibleTabs.includes(3) && isPlaying) {
      list.push("vibing");
    }

    // 3. Battery Check (charging or low) - Tab 11
    if (visibleTabs.includes(11)) {
      if (charging) {
        list.push("charging");
      } else if (percent !== null && percent < 25) {
        list.push("low-battery");
      }
    }

    // 4. Tasks & Shelf Check (only if module enabled and items exist) - Tab 8 / 13
    const hasTasks = pendingCount > 0 && visibleTabs.includes(8);
    const hasShelf = shelfCount > 0 && visibleTabs.includes(13);
    if (hasTasks || hasShelf) {
      list.push("busy-tasks");
    }

    // 5. Thirsty Check (only if water reminder enabled and logged hydration that hasn't reached goal) - Tab 1
    if (visibleTabs.includes(1) && waterIntake > 0 && waterIntake < waterGoal) {
      list.push("thirsty");
    }

    // 6. Chill Default (always available baseline)
    list.push("chill");

    return list;
  }, [waterIntake, waterGoal, pomodoroState?.isRunning, isPlaying, charging, percent, pendingCount, shelfCount, visibleTabs]);

  // Active mood resolved from priorities and manual cycling
  const activeMood = useMemo(() => {
    if (isGulping && visibleTabs.includes(1)) return "gulping";
    if (availableInsights.length === 0) return "chill";
    const idx = Math.abs(manualMoodCycle) % availableInsights.length;
    return availableInsights[idx];
  }, [availableInsights, manualMoodCycle, isGulping, visibleTabs]);

  // Click / Poke Mascot Interaction
  const handlePokeMascot = useCallback(() => {
    setIsPoked(true);
    if (pokeTimerRef.current) clearTimeout(pokeTimerRef.current);
    pokeTimerRef.current = setTimeout(() => {
      setIsPoked(false);
    }, 1500);

    // Spawn floating heart / sparkle particle burst
    const newParticles = [
      { id: Date.now() + 1, type: "sparkle", x: 38 + Math.random() * 16, y: 16 },
      { id: Date.now() + 2, type: "heart", x: 48 + Math.random() * 20, y: 12 },
      { id: Date.now() + 3, type: "sparkle", x: 58 + Math.random() * 16, y: 18 }
    ];
    setParticles(prev => [...newParticles, ...prev.slice(0, 4)]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1200);

    // Cycle to next status insight
    setManualMoodCycle(prev => prev + 1);
  }, []);

  // 1-Click Action: Drink Water
  const handleDrinkWater = useCallback((e) => {
    e.stopPropagation();
    if (!visibleTabs.includes(1)) return;
    if (typeof onAddWater === "function") {
      onAddWater();
    }
    setIsGulping(true);
    if (gulpTimerRef.current) clearTimeout(gulpTimerRef.current);
    gulpTimerRef.current = setTimeout(() => {
      setIsGulping(false);
    }, 1600);
  }, [onAddWater, visibleTabs]);

  // Mood-Specific Content Configurations (Pill-Free Badges & Clean Text Action Links)
  const moodConfig = useMemo(() => {
    const litersIntake = (waterIntake / 1000).toFixed(1);
    const litersGoal = (waterGoal / 1000).toFixed(1);
    const trackTitle = spotifyTrack?.name || "Music Track";
    const trackArtist = spotifyTrack?.artist || "";

    switch (activeMood) {
      case "gulping":
        return {
          badgeText: "💧 Segar!",
          badgeColor: "#38bdf8",
          glowColor: "rgba(56, 189, 248, 0.55)",
          rimColor: "rgba(56, 189, 248, 0.4)",
          message: "+250ml tercatat • Tetap terhidrasi!",
          actionBtn: visibleTabs.includes(1) ? (
            <button
              onClick={() => onSwitchTab?.(1)}
              className="mascot-action-link"
              style={{ color: "#38bdf8" }}
            >
              <span>Detail Hidrasi →</span>
            </button>
          ) : null
        };

      case "thirsty":
        return {
          badgeText: "💧 Hidrasi",
          badgeColor: "#38bdf8",
          glowColor: "rgba(56, 189, 248, 0.45)",
          rimColor: "rgba(56, 189, 248, 0.3)",
          message: `${litersIntake}L / ${litersGoal}L • Waktunya minum air!`,
          actionBtn: visibleTabs.includes(1) ? (
            <button
              onClick={handleDrinkWater}
              className="mascot-action-link"
              style={{ color: "#38bdf8" }}
            >
              <Droplet size={11} color="#38bdf8" />
              <span>Minum (+250ml) →</span>
            </button>
          ) : null
        };

      case "focusing":
        return {
          badgeText: "🔥 Fokus",
          badgeColor: "#fb7185",
          glowColor: "rgba(244, 63, 94, 0.5)",
          rimColor: "rgba(244, 63, 94, 0.4)",
          message: `Sisa ${formattedPomodoroTime} • Tetap fokus!`,
          actionBtn: visibleTabs.includes(10) ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePomodoro?.();
                }}
                className="mascot-action-link"
                style={{ color: "#fb7185" }}
              >
                <Pause size={10} />
                <span>Pause</span>
              </button>
              <button
                onClick={() => onSwitchTab?.(10)}
                className="mascot-action-link"
                style={{ color: "rgba(255, 255, 255, 0.65)" }}
              >
                <span>Pomodoro →</span>
              </button>
            </div>
          ) : null
        };

      case "vibing":
        return {
          badgeText: "🎵 Musik",
          badgeColor: "#c084fc",
          glowColor: "rgba(168, 85, 247, 0.45)",
          rimColor: "rgba(168, 85, 247, 0.35)",
          message: `${trackTitle}${trackArtist ? ` • ${trackArtist}` : ""}`,
          actionBtn: visibleTabs.includes(3) ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMedia?.();
                }}
                className="mascot-action-link"
                style={{ color: "#c084fc" }}
              >
                <Pause size={10} />
                <span>Pause</span>
              </button>
              <button
                onClick={() => {
                  onOpenLyrics?.();
                  onSwitchTab?.(3);
                }}
                className="mascot-action-link"
                style={{ color: "rgba(255, 255, 255, 0.65)" }}
              >
                <MessageSquare size={10} />
                <span>Lirik →</span>
              </button>
            </div>
          ) : null
        };

      case "charging":
        return {
          badgeText: "⚡ Charging",
          badgeColor: "#22c55e",
          glowColor: "rgba(34, 197, 94, 0.5)",
          rimColor: "rgba(34, 197, 94, 0.35)",
          message: `Baterai ${percent}% • Pengisian aktif`,
          actionBtn: visibleTabs.includes(11) ? (
            <button
              onClick={() => onSwitchTab?.(11)}
              className="mascot-action-link"
              style={{ color: "#22c55e" }}
            >
              <BatteryCharging size={11} />
              <span>Battery Hub →</span>
            </button>
          ) : null
        };

      case "low-battery":
        return {
          badgeText: "🔋 Low Power",
          badgeColor: "#f43f5e",
          glowColor: "rgba(244, 63, 94, 0.5)",
          rimColor: "rgba(244, 63, 94, 0.35)",
          message: `Tersisa ${percent}% • Perlu charger!`,
          actionBtn: visibleTabs.includes(11) ? (
            <button
              onClick={() => onSwitchTab?.(11)}
              className="mascot-action-link"
              style={{ color: "#f43f5e" }}
            >
              <span>Periksa Baterai →</span>
            </button>
          ) : null
        };

      case "busy-tasks":
        const canOpenTasks = pendingCount > 0 && visibleTabs.includes(8);
        const canOpenShelf = shelfCount > 0 && visibleTabs.includes(13);
        return {
          badgeText: canOpenTasks
            ? `📝 ${pendingCount} Tugas`
            : `📦 ${shelfCount} File`,
          badgeColor: "#fbbf24",
          glowColor: "rgba(251, 191, 36, 0.45)",
          rimColor: "rgba(251, 191, 36, 0.35)",
          message: canOpenTasks && canOpenShelf
            ? `${pendingCount} tugas pending • ${shelfCount} di Shelf`
            : canOpenTasks
            ? `${pendingCount} tugas to-do belum selesai`
            : `${shelfCount} file tersimpan di Shelf`,
          actionBtn: canOpenTasks ? (
            <button
              onClick={() => onSwitchTab?.(8)}
              className="mascot-action-link"
              style={{ color: "#fbbf24" }}
            >
              <CheckSquare size={11} />
              <span>Buka To-Do →</span>
            </button>
          ) : canOpenShelf ? (
            <button
              onClick={() => onSwitchTab?.(13)}
              className="mascot-action-link"
              style={{ color: "#fbbf24" }}
            >
              <Inbox size={11} />
              <span>Buka Shelf →</span>
            </button>
          ) : null
        };

      case "chill":
      default:
        const candidateTab = [14, 16, 15, 0, 4, 7].find(id => visibleTabs.includes(id));
        let chillBtn = null;
        if (candidateTab === 14) {
          chillBtn = (
            <button
              onClick={() => onSwitchTab?.(14)}
              className="mascot-action-link"
              style={{ color: "#818cf8" }}
            >
              <Compass size={11} />
              <span>App Launcher →</span>
            </button>
          );
        } else if (candidateTab === 16) {
          chillBtn = (
            <button
              onClick={() => onSwitchTab?.(16)}
              className="mascot-action-link"
              style={{ color: "#a855f7" }}
            >
              <Sparkles size={11} />
              <span>Ask AI →</span>
            </button>
          );
        } else if (candidateTab === 15) {
          chillBtn = (
            <button
              onClick={() => onSwitchTab?.(15)}
              className="mascot-action-link"
              style={{ color: "#38bdf8" }}
            >
              <span>Quick Notes →</span>
            </button>
          );
        } else if (candidateTab !== undefined) {
          chillBtn = (
            <button
              onClick={() => onSwitchTab?.(candidateTab)}
              className="mascot-action-link"
              style={{ color: "#818cf8" }}
            >
              <span>Buka Modul →</span>
            </button>
          );
        }

        return {
          badgeText: "✨ All Good",
          badgeColor: "#818cf8",
          glowColor: "rgba(129, 140, 248, 0.45)",
          rimColor: "rgba(255, 255, 255, 0.15)",
          message: "Semua aman! Klik aku untuk bermain.",
          actionBtn: chillBtn
        };
    }
  }, [
    activeMood,
    waterIntake,
    waterGoal,
    spotifyTrack,
    percent,
    pendingCount,
    shelfCount,
    formattedPomodoroTime,
    visibleTabs,
    handleDrinkWater,
    onSwitchTab,
    onToggleMedia,
    onTogglePomodoro,
    onOpenLyrics
  ]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "6px 34px 20px 34px", // 20px clean bottom clearance reserving space for pagination dots
        boxSizing: "border-box",
        userSelect: "none",
        position: "relative"
      }}
    >
      {/* =========================================================================
          1. TOP MINI STATUS BAR (height: 20px)
          Ultra-sleek: Left (Time & Date) | Right (Battery & CPU Load)
          ========================================================================= */}
      <div
        style={{
          width: "100%",
          height: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxSizing: "border-box",
          flexShrink: 0,
          fontSize: 11,
          color: "rgba(255, 255, 255, 0.55)"
        }}
      >
        {/* Left: 8:04 • Tue, 20 Oct */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontWeight: 700, color: "rgba(255, 255, 255, 0.9)" }}>
            {time}
          </span>
          <span style={{ opacity: 0.35 }}>•</span>
          <span>{dateFormatted}</span>
        </div>

        {/* Right: ⚡ 57% • CPU 0% */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            onClick={visibleTabs.includes(11) ? () => onSwitchTab?.(11) : undefined}
            title={visibleTabs.includes(11) ? "Open Battery Hub" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              cursor: visibleTabs.includes(11) ? "pointer" : "default"
            }}
          >
            {charging ? (
              <Zap size={10} color="#22c55e" />
            ) : (
              <Battery size={10} color={percent < 25 ? "#ef4444" : "#22c55e"} />
            )}
            <span
              style={{
                fontWeight: 600,
                color: charging ? "#22c55e" : percent < 25 ? "#ef4444" : "rgba(255, 255, 255, 0.85)"
              }}
            >
              {percent}%
            </span>
          </div>

          <span style={{ opacity: 0.3 }}>•</span>

          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Activity size={10} color="#38bdf8" />
            <span>CPU {systemStats?.cpu || 0}%</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. MAIN BODY ROW: Mascot Stage (Left) + Smart Status Card (Right)
          ========================================================================= */}
      <div
        style={{
          width: "100%",
          height: 98,
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxSizing: "border-box",
          flex: 1
        }}
      >
        {/* =======================================================================
            2A. OBSIDIAN VISOR-CAT MASCOT STAGE (width: 110px, height: 98px)
            ======================================================================= */}
        <div
          ref={mascotStageRef}
          onClick={handlePokeMascot}
          className={`mascot-stage-container ${isPoked ? "mascot-jelly-poked" : ""}`}
          title="Elus / klik Obsidian Cat untuk cek status atau bermain! ✨"
          style={{
            width: 110,
            height: "100%",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: "pointer"
          }}
        >
          {/* Glowing Radial Aura Underneath (Replaces legs/feet) */}
          <div
            className="mascot-underglow-aura"
            style={{
              position: "absolute",
              bottom: 4,
              left: "50%",
              width: 78,
              height: 18,
              borderRadius: "50%",
              background: `radial-gradient(ellipse at center, ${moodConfig.glowColor}, transparent 70%)`,
              pointerEvents: "none",
              transition: "background 300ms ease"
            }}
          />

          {/* Floating Gulping +250ml Badge on Drink */}
          {isGulping && (
            <div className="mascot-gulp-badge">
              +250ml 💧
            </div>
          )}

          {/* Floating Sparkles & Hearts Particle Layer */}
          {particles.map(p => (
            <div
              key={p.id}
              className={p.type === "heart" ? "mascot-particle-heart" : "mascot-particle-sparkle"}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                pointerEvents: "none",
                zIndex: 10
              }}
            >
              {p.type === "heart" ? (
                <Heart size={12} color="#ec4899" fill="#ec4899" />
              ) : (
                <Sparkles size={11} color="#fbbf24" fill="#fbbf24" />
              )}
            </div>
          ))}

          {/* Obsidian Visor-Cat Layered SVG with Gentle Levitation */}
          <div className="mascot-floating-body">
            <svg
              width="86"
              height="74"
              viewBox="0 0 86 74"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                overflow: "visible",
                transform: isPoked ? "none" : activeMood === "vibing" ? "translateY(-1px)" : "none",
                animation: activeMood === "vibing" ? "mascotHeadBob 600ms infinite alternate ease-in-out" : "none"
              }}
            >
              <defs>
                {/* Deep Obsidian Cat Gradient */}
                <linearGradient id="obsidianCatGrad" x1="43" y1="6" x2="43" y2="72" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#1e2230" />
                  <stop offset="40%" stopColor="#11141e" />
                  <stop offset="100%" stopColor="#090a0f" />
                </linearGradient>

                {/* Deep Glossy Visor Screen Gradient */}
                <linearGradient id="visorScreenGrad" x1="43" y1="24" x2="43" y2="62" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#090c14" />
                  <stop offset="100%" stopColor="#030407" />
                </linearGradient>

                {/* Glowing Eye Filters for Cyber Look */}
                <filter id="eyeGlowCyan" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="eyeGlowRed" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="eyeGlowGreen" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="eyeGlowAmber" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* LAYER 1: Sleek Silhouette with Seamless Curved Cat Ears */}
              <path
                d="M 43,71
                   C 64,71 74,68 76,52
                   C 77,40 76,32 75,26
                   C 74,21 75,13 71,9
                   C 68,6 64,11 58,19
                   C 52,22 47,22 43,22
                   C 39,22 34,22 28,19
                   C 22,11 18,6 15,9
                   C 11,13 12,21 11,26
                   C 10,32 9,40 10,52
                   C 12,68 22,71 43,71 Z"
                fill="url(#obsidianCatGrad)"
                stroke={moodConfig.rimColor || "rgba(255, 255, 255, 0.14)"}
                strokeWidth="1.2"
                style={{ transition: "stroke 300ms ease" }}
              />

              {/* Inner Ear Delicate Cyber Grooves */}
              <path d="M 17,14 L 23,20" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeLinecap="round" />
              <path d="M 69,14 L 63,20" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeLinecap="round" />

              {/* LAYER 2: Large Glossy Glass Visor Screen (80% Face Area) */}
              <rect
                x="16"
                y="25"
                width="54"
                height="36"
                rx="17"
                fill="url(#visorScreenGrad)"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="1"
              />

              {/* Top Curved Specular Gloss Highlight */}
              <path
                d="M 23,29 Q 43,25 63,29"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
              />

              {/* Diagonal Glass Sheen Streak Across Top-Left */}
              <path
                d="M 20,38 L 29,27 L 33,27 L 23,40 Z"
                fill="rgba(255, 255, 255, 0.05)"
              />

              {/* LAYER 3: Vibing Mood Headphones (over cat ears) */}
              {activeMood === "vibing" && (
                <g id="cat-headphones">
                  <path d="M 12,32 C 12,12 74,12 74,32" stroke="#38bdf8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <rect x="8" y="24" width="7" height="18" rx="3.5" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" filter="url(#eyeGlowCyan)" />
                  <rect x="71" y="24" width="7" height="18" rx="3.5" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" filter="url(#eyeGlowCyan)" />
                  <text x="12" y="16" fill="#38bdf8" fontSize="10" className="mascot-note-1">♪</text>
                  <text x="70" y="14" fill="#c084fc" fontSize="11" className="mascot-note-2">♫</text>
                </g>
              )}

              {/* LAYER 4: Focusing Mood Headband */}
              {activeMood === "focusing" && (
                <g id="cat-focus-band">
                  <path d="M 16,26 Q 43,22 70,26" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" fill="none" filter="url(#eyeGlowRed)" />
                  <circle cx="43" cy="24" r="2.5" fill="#fb7185" filter="url(#eyeGlowRed)" />
                </g>
              )}

              {/* LAYER 5: Tasks Mood Minimalist Holographic Badge */}
              {activeMood === "busy-tasks" && (
                <g className="floating-checklist" style={{ filter: "drop-shadow(0 0 5px rgba(251, 191, 36, 0.65))" }}>
                  <circle cx="73" cy="15" r="5.5" fill="rgba(251, 191, 36, 0.18)" stroke="#fbbf24" strokeWidth="1" />
                  <path d="M 70.8,15 L 72.3,16.5 L 75.3,13.5" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </g>
              )}

              {/* LAYER 6: Big Ultra-Expressive Eyes (with Real-Time Cursor Tracking) */}
              <g
                id="cat-eyes"
                style={{
                  transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
                  transition: "transform 80ms ease-out"
                }}
              >
                {/* Natural Blinking State */}
                {isBlinking ? (
                  <>
                    <rect
                      x="27.5"
                      y="42"
                      width="11"
                      height="2.5"
                      rx="1.25"
                      fill="#ffffff"
                      style={{ filter: "drop-shadow(0 0 6px rgba(56, 189, 248, 0.8))" }}
                    />
                    <rect
                      x="47.5"
                      y="42"
                      width="11"
                      height="2.5"
                      rx="1.25"
                      fill="#ffffff"
                      style={{ filter: "drop-shadow(0 0 6px rgba(56, 189, 248, 0.8))" }}
                    />
                  </>
                ) : isPoked || isGulping ? (
                  /* Petted / Happy / Gulping: Upward Joyful Arcs (^  ^) + Cute Cat Mouth (ω) + Blushes */
                  <>
                    <path
                      d="M 27,45 Q 33,35 39,45"
                      stroke="#38bdf8"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                      style={{ filter: "drop-shadow(0 0 6px rgba(56, 189, 248, 0.85))" }}
                    />
                    <path
                      d="M 47,45 Q 53,35 59,45"
                      stroke="#38bdf8"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                      style={{ filter: "drop-shadow(0 0 6px rgba(56, 189, 248, 0.85))" }}
                    />
                    {/* Cute cat mouth (ω) */}
                    <path d="M 40,50 Q 41.5,52 43,50 Q 44.5,52 46,50" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                    {/* Pink Cheek Blushes */}
                    <ellipse cx="23" cy="51" rx="4" ry="2" fill="rgba(244, 114, 182, 0.75)" />
                    <ellipse cx="63" cy="51" rx="4" ry="2" fill="rgba(244, 114, 182, 0.75)" />
                  </>
                ) : activeMood === "thirsty" ? (
                  /* Thirsty / Droopy Eyes + Shimmering Animated Water Droplet + Soft Wavy Mouth */
                  <>
                    <path
                      d="M 28,40 C 28,47 38,47 38,40"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                      style={{ filter: "drop-shadow(0 0 6px rgba(56, 189, 248, 0.8))" }}
                    />
                    <path
                      d="M 48,40 C 48,47 58,47 58,40"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                      style={{ filter: "drop-shadow(0 0 6px rgba(56, 189, 248, 0.8))" }}
                    />
                    {/* Wavy mouth (~) */}
                    <path d="M 40,51 Q 43,49 46,51" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                    {/* Sliding Blue Sweat Droplet on Visor */}
                    <path
                      d="M 64.5,37 C 63.5,39.5 62.5,41 62.5,42.5 C 62.5,44 63.4,45 64.5,45 C 65.6,45 66.5,44 66.5,42.5 C 66.5,41 65.5,39.5 64.5,37 Z"
                      fill="#38bdf8"
                      style={{ filter: "drop-shadow(0 0 4px #38bdf8)" }}
                      className="cat-sweat-droplet"
                    />
                  </>
                ) : activeMood === "focusing" ? (
                  /* Focusing Determined Angled Cyber-Eyes */
                  <>
                    <polygon
                      points="28,37 39,43 29,47"
                      fill="#fb7185"
                      style={{ filter: "drop-shadow(0 0 6px rgba(244, 63, 94, 0.85))" }}
                    />
                    <polygon
                      points="58,37 47,43 57,47"
                      fill="#fb7185"
                      style={{ filter: "drop-shadow(0 0 6px rgba(244, 63, 94, 0.85))" }}
                    />
                  </>
                ) : activeMood === "charging" ? (
                  /* Charging Electric Green Lightning Bolt Eyes (⚡) */
                  <>
                    <path
                      d="M 34,34 L 29,42 L 33,42 L 31,50 L 38,40 L 34,40 Z"
                      fill="#22c55e"
                      style={{ filter: "drop-shadow(0 0 6px rgba(34, 197, 94, 0.85))" }}
                    />
                    <path
                      d="M 54,34 L 49,42 L 53,42 L 51,50 L 58,40 L 54,40 Z"
                      fill="#22c55e"
                      style={{ filter: "drop-shadow(0 0 6px rgba(34, 197, 94, 0.85))" }}
                    />
                  </>
                ) : activeMood === "low-battery" ? (
                  /* Sleepy (= =) Eyes + Floating Zzz */
                  <>
                    <rect x="27" y="42" width="11" height="2.5" rx="1.25" fill="#f43f5e" opacity="0.85" />
                    <rect x="48" y="42" width="11" height="2.5" rx="1.25" fill="#f43f5e" opacity="0.85" />
                    <text x="68" y="28" fill="#f43f5e" fontSize="9" fontWeight="700" className="mascot-zzz">Zzz</text>
                  </>
                ) : activeMood === "busy-tasks" ? (
                  /* Focused Amber/Gold Eyes with Specular Catchlights */
                  <>
                    <rect
                      x="28"
                      y="35"
                      width="10"
                      height="16"
                      rx="5"
                      fill="#fbbf24"
                      style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.85))" }}
                    />
                    <rect
                      x="48"
                      y="35"
                      width="10"
                      height="16"
                      rx="5"
                      fill="#fbbf24"
                      style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.85))" }}
                    />
                    <circle cx="31" cy="39" r="1.5" fill="#ffffff" />
                    <circle cx="51" cy="39" r="1.5" fill="#ffffff" />
                  </>
                ) : (
                  /* Chill / All-Good: Big Pill-Rounded Glowing Eyes + Specular Catchlights + Blushes */
                  <>
                    <rect
                      x="27.5"
                      y="34"
                      width="11"
                      height="18"
                      rx="5.5"
                      fill="#ffffff"
                      style={{ filter: "drop-shadow(0 0 6px rgba(56, 189, 248, 0.8))" }}
                    />
                    <rect
                      x="47.5"
                      y="34"
                      width="11"
                      height="18"
                      rx="5.5"
                      fill="#ffffff"
                      style={{ filter: "drop-shadow(0 0 6px rgba(56, 189, 248, 0.8))" }}
                    />
                    {/* Specular Catchlights */}
                    <circle cx="31" cy="38" r="1.5" fill="#ffffff" />
                    <circle cx="51" cy="38" r="1.5" fill="#ffffff" />
                    {/* Pink/Cyan Blushes */}
                    <ellipse cx="23" cy="51" rx="4" ry="2" fill="rgba(244, 114, 182, 0.55)" />
                    <ellipse cx="63" cy="51" rx="4" ry="2" fill="rgba(244, 114, 182, 0.55)" />
                  </>
                )}
              </g>
            </svg>
          </div>
        </div>

        {/* =======================================================================
            2B. REFINED RIGHT-SIDE SMART STATUS CARD (flex: 1)
            Clean typography: pill-free header and sleek borderless action link
            ======================================================================= */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            height: "100%",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(12px)",
            borderRadius: 14,
            padding: "8px 12px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative"
          }}
        >
          {/* Subtle Left Triangular Speech Pointer */}
          <div
            style={{
              position: "absolute",
              left: -5,
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderTop: "5px solid transparent",
              borderBottom: "5px solid transparent",
              borderRight: "5px solid rgba(255, 255, 255, 0.08)"
            }}
          />

          {/* Top Row: Clean Pill-Free Mood Header + Minimalist Pet Button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              flexShrink: 0
            }}
          >
            {/* Clean borderless header text - NO pill badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: moodConfig.badgeColor,
                  letterSpacing: "0.02em"
                }}
              >
                {moodConfig.badgeText}
              </span>
            </div>

            {/* Minimalist Pet / Cycle Button - Clean icon */}
            <button
              type="button"
              onClick={handlePokeMascot}
              title="Elus / klik kucing untuk ganti status 🐾"
              style={{
                background: "transparent",
                border: "none",
                padding: "0 2px",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontSize: 10,
                color: "rgba(255, 255, 255, 0.45)",
                cursor: "pointer",
                transition: "opacity 150ms ease"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.45")}
            >
              <span>🐾</span>
            </button>
          </div>

          {/* Center: Crisp Dynamic Status Message (single line, zero vertical clipping) */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "rgba(255, 255, 255, 0.88)",
              lineHeight: 1.25,
              margin: "2px 0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
            title={moodConfig.message}
          >
            {moodConfig.message}
          </div>

          {/* Bottom: Sleek Pill-Free Action Link */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              flexShrink: 0
            }}
          >
            {moodConfig.actionBtn}
          </div>
        </div>
      </div>
    </div>
  );
}
