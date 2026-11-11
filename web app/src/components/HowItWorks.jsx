import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Layers } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const MODES = [
  {
    numeral: '01',
    name:    'Still Mode',
    tagline: 'The quiet sentinel.',
    desc:    'A minimal semicircular capsule resting flush against the top bezel of your display. Zero screen footprint, zero battery drain, and zero cognitive load. Always silently within reach.',
    imgSrc:  'still-mode.jpg',
    alt:     'Quick Pill Still Mode - Minimalist idle capsule at the top of desktop screen',
  },
  {
    numeral: '02',
    name:    'Quick Mode',
    tagline: 'Hover to reveal.',
    desc:    'Brush your cursor over the capsule and it expands with 60 FPS spring physics to reveal the time, weather forecast, battery diagnostics, and active media scrubber — in under 200ms.',
    imgSrc:  'quick-mode.jpg',
    alt:     'Quick Pill Quick Mode - Dynamic spring expansion with clock, weather, battery and media info',
  },
  {
    numeral: '03',
    name:    'Large Mode',
    tagline: 'Click to command.',
    desc:    'A full interactive control center unfolds with 16 modular feature tabs. Control per-app audio, capture quick notes, stage files, and check system vitals without leaving your active workspace.',
    imgSrc:  'large-mode.jpg',
    alt:     'Quick Pill Large Mode - Full interactive 16-tab desktop productivity dashboard',
  },
];

export default function HowItWorks() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cols = sectionRef.current.querySelectorAll('.mode-col');
      cols.forEach((col, i) => {
        gsap.fromTo(col,
          { y: 40, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.65, ease: 'power3.out',
            scrollTrigger: {
              trigger: col,
              start: 'top 82%',
              toggleActions: 'play none none none',
            },
          }
        );
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section className="how-it-works section" id="how-it-works" ref={sectionRef} aria-label="How Quick Pill Works">
      <div className="container">
        <div className="how-header">
          <div className="how-badge">
            <Layers size={11} className="how-badge-icon" />
            <span>ADAPTIVE DYNAMICS</span>
          </div>
          <h2 className="how-headline">
            Three Modes. <span className="how-headline--dim">Infinite Utility.</span>
          </h2>
          <p className="how-subline">
            Fluid geometry that seamlessly expands and contracts based on cursor intent and keyboard hotkeys.
          </p>
        </div>

        <div className="modes-grid">
          {MODES.map(({ numeral, name, tagline, desc, imgSrc, alt }) => (
            <article className="mode-col" key={name}>
              <div className="mode-top">
                <div className="mode-header-meta">
                  <span className="mode-numeral" aria-hidden="true">{numeral}</span>
                  <span className="mode-tagline">{tagline}</span>
                </div>
                <h3 className="mode-name">{name}</h3>
                <p className="mode-desc">{desc}</p>
              </div>

              <div className="mode-mockup-frame">
                <div className="mode-mockup-bar">
                  <div className="mode-mockup-dots" aria-hidden="true">
                    <span className="dot red" />
                    <span className="dot yellow" />
                    <span className="dot green" />
                  </div>
                  <span className="mode-mockup-label">{name}</span>
                </div>
                <div className="mode-mockup-screen">
                  <img
                    src={imgSrc}
                    alt={alt}
                    title={name}
                    className="mode-img"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
