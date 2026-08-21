import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SHORTCUTS = [
  { key: 'Ctrl + 1 – 8',     action: 'Jump directly to Tab 1 through 8 in Large Mode' },
  { key: '← / →',            action: 'Navigate to previous or next tab' },
  { key: 'Mouse Wheel',       action: 'Scroll horizontally across active tabs' },
  { key: 'Ctrl + Hover',      action: '85% translucency + full click-through passthrough' },
  { key: 'Click',             action: 'Toggle between Large Mode and Still / Quick Mode' },
];

export default function Shortcuts() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Headline slides in from left
      gsap.fromTo('.shortcuts-headline',
        { x: -40, opacity: 0 },
        {
          x: 0, opacity: 1, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', toggleActions: 'play none none none' },
        }
      );
      // Rows cascade from right
      gsap.fromTo('.shortcut-row',
        { x: 30, opacity: 0 },
        {
          x: 0, opacity: 1, duration: 0.45,
          stagger: 0.09,
          ease: 'power2.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 78%', toggleActions: 'play none none none' },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section className="shortcuts section" id="shortcuts" ref={sectionRef} aria-label="Keyboard shortcuts and gestures">
      <div className="container">
        <div className="shortcuts-inner">
          <div>
            <h2 className="shortcuts-headline">
              Speed at Your<br /><em>Fingertips.</em>
            </h2>
          </div>
          <div className="shortcut-table" role="table" aria-label="Quick Pill keyboard shortcuts table">
            {SHORTCUTS.map(({ key, action }) => (
              <div className="shortcut-row" key={key} role="row">
                <kbd className="shortcut-key">{key}</kbd>
                <span className="shortcut-action">{action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
