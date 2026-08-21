import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { Download, Github, Play, Pause } from 'lucide-react';
import Beams from './Beams';

const MODES = ['still', 'quick', 'large'];
const DURATIONS = { still: 2200, quick: 2500, large: 3000 };

/* Pill sizes per mode */
const PILL_SIZE = {
  still: { width: 160, height: 38,  borderRadius: 100 },
  quick: { width: 310, height: 62,  borderRadius: 100 },
  large: { width: 440, height: 220, borderRadius: 30  },
};

/* Content inside pill */
function PillContent({ mode }) {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return (
    <AnimatePresence mode="wait">
      {mode === 'still' && (
        <motion.div
          key="still"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', gap: '6px' }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.45)' }} />
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
        </motion.div>
      )}
      {mode === 'quick' && (
        <motion.div
          key="quick"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 1.25rem' }}
        >
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.9rem', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
            {time}
          </span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>22°C</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
          </div>
        </motion.div>
      )}
      {mode === 'large' && (
        <motion.div
          key="large"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '0.875rem 1.125rem', gap: '0.75rem' }}
        >
          {/* Tab strip */}
          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{
                height: 3, borderRadius: 2, background: i === 2 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.12)',
                width: i === 2 ? 28 : 20,
              }} />
            ))}
          </div>
          {/* Content blocks */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 6,
              }} />
            ))}
          </div>
          {/* Bottom row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }} />
            <div style={{ width: 30, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2 }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Hero() {
  const headlineRef = useRef(null);
  const subtitleRef = useRef(null);
  const ctaRef      = useRef(null);
  const eyebrowRef  = useRef(null);
  const videoRef    = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [modeIdx, setModeIdx]     = useState(0);
  const [modeLabel, setModeLabel] = useState('Still Mode');

  const MODE_LABELS = { still: 'Still Mode', quick: 'Quick Mode', large: 'Large Mode' };
  const currentMode = MODES[modeIdx];

  /* Cycle pill modes */
  useEffect(() => {
    const dur = DURATIONS[currentMode];
    const timer = setTimeout(() => {
      const next = (modeIdx + 1) % MODES.length;
      setModeIdx(next);
      setModeLabel(MODE_LABELS[MODES[next]]);
    }, dur);
    return () => clearTimeout(timer);
  }, [modeIdx]);

  /* GSAP entrance animation */
  useEffect(() => {
    const tl = gsap.timeline({ delay: 0.4 });
    tl.fromTo(eyebrowRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
    )
    .fromTo(
      headlineRef.current.querySelectorAll('.word'),
      { y: 90, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, stagger: 0.1, ease: 'power3.out' },
      '-=0.2'
    )
    .fromTo(subtitleRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' },
      '-=0.5'
    )
    .fromTo(
      ctaRef.current.children,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out' },
      '-=0.4'
    );
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <section className="hero" id="hero">
      {/* Atmospheric beam background */}
      <Beams
        beamWidth={2}
        beamHeight={15}
        beamNumber={12}
        lightColor="#ffffff"
        speed={2}
        noiseIntensity={1.75}
        scale={0.2}
        rotation={0}
      />

      {/* Main content */}
      <div className="hero-content">
        <div ref={eyebrowRef} className="hero-eyebrow">QUICK PILL v5.0.0</div>

        <h1 className="hero-headline" ref={headlineRef}>
          <span className="hero-line">
            {'Your Desktop,'.split(' ').map((w, i) => (
              <span key={i} className="word">{w}&nbsp;</span>
            ))}
          </span>
          <span className="hero-line hero-line--italic">
            {'Reimagined.'.split(' ').map((w, i) => (
              <span key={i} className="word">{w}</span>
            ))}
          </span>
        </h1>

        <p className="hero-subtitle" ref={subtitleRef}>
          A Dynamic Island for your desktop. Floating above your workflow with
          media controls, live notifications, tasks, timers, and more all in one capsule.
        </p>

        <div className="hero-cta" ref={ctaRef}>
          <a
            href="#download"
            className="btn btn--primary"
            title="Download Quick Pill for Windows 10 & 11"
            aria-label="Download Quick Pill for Windows 10 & 11"
          >
            <Download size={14} strokeWidth={2} aria-hidden="true" />
            Download
          </a>
          <a
            href="https://github.com/nabil24024004/Quick-Pill"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--ghost-white"
            title="View Quick Pill open-source repository on GitHub"
            aria-label="View Quick Pill open-source repository on GitHub"
          >
            <Github size={14} strokeWidth={1.5} aria-hidden="true" />
            View on GitHub
          </a>
        </div>

        <div className="hero-platforms">Windows 10 / 11 · macOS · Linux</div>
      </div>

      {/* Live Demo Video Showcase */}
      <figure className="hero-video-container" aria-label="Quick Pill Demonstration Video">
        <div className="hero-video-bezel">
          <div className="hero-video-dots" aria-hidden="true">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <figcaption className="hero-video-title">Quick Pill — Dynamic Island in Action</figcaption>
          <button
            className="hero-video-toggle"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause demonstration video' : 'Play demonstration video'}
            title={isPlaying ? 'Pause demo' : 'Play demo'}
          >
            {isPlaying ? <Pause size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
          </button>
        </div>
        <video
          ref={videoRef}
          src="demo.mp4"
          autoPlay
          loop
          muted
          playsInline
          title="Quick Pill Dynamic Island for Windows Demo"
          className="hero-video"
        />
      </figure>

      <div className="hero-rule" aria-hidden="true" />
    </section>
  );
}
