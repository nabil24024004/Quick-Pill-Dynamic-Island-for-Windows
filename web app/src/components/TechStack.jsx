import { useRef, useEffect } from 'react';

const BADGES = [
  'Electron 38+',
  'React 19',
  'Framer Motion 12',
  'Vite 5',
  'GSAP 3',
  'PowerShell / Win32 API',
  'AppleScript',
  'playerctl · Linux',
  'Lucide React',
  'Vanilla CSS',
  'Electron Forge 7',
];

// Double the list so the second copy creates a seamless tail
const DOUBLE = [...BADGES, ...BADGES];

export default function TechStack() {
  return (
    <section className="tech-strip" id="tech-stack" aria-label="Technology Stack">
      <div className="tech-label-center">Technology Stack</div>
      <div className="ticker-wrap">
        <div className="ticker-track ticker-animate">
          {DOUBLE.map((label, i) => (
            <div className="tech-badge" key={`${label}-${i}`}>
              <span
                style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.35)', flexShrink: 0,
                }}
              />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
