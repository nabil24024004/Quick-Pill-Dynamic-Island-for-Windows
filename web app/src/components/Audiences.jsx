import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useScrollReveal } from '../hooks/useScrollReveal';

const AUDIENCES = [
  {
    category:  'Developers & Power Users',
    title:     'Command your machine.',
    tagline:   '"All your vitals, zero window switches."',
    points: [
      'CPU/RAM monitor accessible without opening Task Manager',
      'Clipboard history for rapid code-snippet recall',
      'Ctrl + 1–8 keyboard shortcuts to jump directly to any tab',
      'Click-through translucency to interact behind the island',
    ],
  },
  {
    category:  'Content Creators & Remote Workers',
    title:     'Stay private. Stay in flow.',
    tagline:   '"You\'ll know the moment someone is watching."',
    points: [
      'Persistent camera (green) and mic (orange) active-use dots',
      'Media scrubber for background music without alt-tabbing',
      'Live notifications without ever opening a messaging app',
      'Timer presets for recording sessions and focus blocks',
    ],
  },
  {
    category:  'Students & Professionals',
    title:     'Focus, then act.',
    tagline:   '"Your to-do list is always one glance away."',
    points: [
      '15m / 30m / 60m Pomodoro focus timers in two clicks',
      'Minimalist task list that persists between sessions',
      'Flip clock and weather — always at the top of your screen',
      'Quick App Launcher for your four most-used tools',
    ],
  },
];

const cardVariants = {
  hidden: { y: 50, opacity: 0 },
  visible: (i) => ({
    y: 0, opacity: 1,
    transition: { type: 'spring', stiffness: 200, damping: 25, delay: i * 0.12 },
  }),
};

export default function Audiences() {
  const sectionRef = useRef(null);
  useScrollReveal(sectionRef, '.audiences-header', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 });

  return (
    <section className="audiences section" id="audiences" ref={sectionRef} aria-label="Who Quick Pill is built for">
      <div className="container">
        <div className="audiences-header">
          <h2 className="audiences-headline">Built for You.</h2>
        </div>
        <div className="audiences-grid">
          {AUDIENCES.map(({ category, title, tagline, points }, i) => (
            <motion.div
              key={category}
              className="audience-card"
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={cardVariants}
            >
              <div className="audience-category">{category}</div>
              <h3 className="audience-title">{title}</h3>
              <div className="audience-tagline">{tagline}</div>
              <ul className="audience-list">
                {points.map(p => <li key={p}>{p}</li>)}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
