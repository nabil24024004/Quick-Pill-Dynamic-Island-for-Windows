import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const MODES = [
  {
    numeral: 'I',
    name:    'Still Mode',
    tagline: 'The quiet sentinel.',
    desc:    'A minimal semicircular capsule resting at the top of your screen. Zero screen footprint. Zero distraction. Always within reach.',
    imgSrc:  'still-mode.jpg',
    alt:     'Quick Pill Still Mode - Minimalist idle capsule at the top of desktop screen',
  },
  {
    numeral: 'II',
    name:    'Quick Mode',
    tagline: 'Hover to reveal.',
    desc:    'Brush your cursor over the island and it expands with a spring to show the time, weather, battery, and now-playing track — in under 200ms.',
    imgSrc:  'quick-mode.jpg',
    alt:     'Quick Pill Quick Mode - Dynamic spring expansion with clock, weather, battery and media info',
  },
  {
    numeral: 'III',
    name:    'Large Mode',
    tagline: 'Click to command.',
    desc:    'A full interactive dashboard unfolds with 11 feature tabs. Control everything without leaving your current window.',
    imgSrc:  'large-mode.jpg',
    alt:     'Quick Pill Large Mode - Full interactive 11-tab desktop productivity dashboard',
  },
];

export default function HowItWorks() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cols = sectionRef.current.querySelectorAll('.mode-col');
      cols.forEach((col, i) => {
        gsap.fromTo(col,
          { x: i % 2 === 0 ? -40 : 40, opacity: 0 },
          {
            x: 0, opacity: 1, duration: 0.7, ease: 'power3.out',
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
          <h2 className="how-headline">Three Modes.</h2>
        </div>
        <div className="modes-grid">
          {MODES.map(({ numeral, name, tagline, desc, imgSrc, alt }) => (
            <article className="mode-col" key={name}>
              <div className="mode-numeral" aria-hidden="true">{numeral}</div>
              <h3 className="mode-name">{name}</h3>
              <div className="mode-tagline">{tagline}</div>
              <p className="mode-desc">{desc}</p>
              <div className="mode-img-wrapper">
                <img
                  src={imgSrc}
                  alt={alt}
                  title={name}
                  className="mode-img"
                  loading="lazy"
                  width="400"
                  height="220"
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
