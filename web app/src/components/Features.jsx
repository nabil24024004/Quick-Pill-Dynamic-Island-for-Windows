import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Clock, Music, Timer, FolderDown, Rocket, FileText,
  Cloud, Search, Calendar, Sliders, Compass, Bell,
  Cpu, Clipboard, CheckSquare, Settings
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const ALL_FEATURES = [
  {
    num: '01',
    Icon: Clock,
    tag: 'StandBy',
    name: 'StandBy Flip Clock & Quotes',
    desc: '3D split-flap mechanical clock display with curated reflections and subtle pulsing time colon.',
  },
  {
    num: '02',
    Icon: Music,
    tag: 'Media',
    name: 'Media Controller & Waveform',
    desc: 'Universal media controls with active waveform scrubber, track metadata, and volume slider.',
  },
  {
    num: '03',
    Icon: Timer,
    tag: 'Focus',
    name: 'Deep Work Focus Timer',
    desc: 'Pomodoro presets with an edge-depleting glowing perimeter synchronized to wall-clock time.',
  },
  {
    num: '04',
    Icon: FolderDown,
    tag: 'Staging',
    name: 'Universal File Shelf',
    desc: 'Drag-and-drop temporary staging area at your screen crown for files, links, and background downloads.',
  },
  {
    num: '05',
    Icon: Rocket,
    tag: 'Workspaces',
    name: 'App Launcher & Workspaces',
    desc: 'Instant application search, Win32 window switching, and dedicated contextual workspace groups.',
  },
  {
    num: '06',
    Icon: FileText,
    tag: 'Scratchpad',
    name: 'Quick Notes & Scratchpad',
    desc: 'Frictionless notepad with automatic dirty-state autosave, clipboard protection, and one-click task export.',
  },
  {
    num: '07',
    Icon: Cloud,
    tag: 'Atmosphere',
    name: 'Weather & 3D Sky Glass',
    desc: 'Real-time atmospheric conditions, ambient temperatures, and 3-day sky glass forecast.',
  },
  {
    num: '08',
    Icon: Search,
    tag: 'Omnibar',
    name: 'Browser Search & URL Launcher',
    desc: 'Instant omnibar to query search engines or jump directly into localhost dev servers and local IPs.',
  },
  {
    num: '09',
    Icon: Calendar,
    tag: 'Calendar',
    name: 'Compact Monthly Calendar',
    desc: 'Horizontal monthly calendar grid tailored flush against your top bezel for rapid date and sprint checks.',
  },
  {
    num: '10',
    Icon: Sliders,
    tag: 'WASAPI',
    name: 'Per-App WASAPI Audio Mixer',
    desc: 'Native Windows WASAPI mixer to adjust individual app volumes and toggle playback output devices.',
  },
  {
    num: '11',
    Icon: Compass,
    tag: 'Solar Arc',
    name: 'Offline Prayer Times (Salah)',
    desc: 'Astronomical solar arc calculating local prayer windows completely offline with pre-prayer alerts.',
  },
  {
    num: '12',
    Icon: Bell,
    tag: 'Alerts',
    name: 'Smart Action Notifications',
    desc: 'Action cards for WhatsApp and VoIP calls with inline quick replies and screen-share privacy masking.',
  },
  {
    num: '13',
    Icon: Cpu,
    tag: 'Diagnostics',
    name: 'Hardware Monitor & Privacy Dots',
    desc: 'Real-time CPU/RAM gauges and persistent privacy indicators whenever camera or mic is active.',
  },
  {
    num: '14',
    Icon: Clipboard,
    tag: 'Buffer',
    name: '50-Item Clipboard Buffer',
    desc: 'Persistent 50-item clipboard history buffer to restore snippets, hex colors, and URLs in one click.',
  },
  {
    num: '15',
    Icon: CheckSquare,
    tag: 'Tasks',
    name: 'Minimalist Task Checklist',
    desc: 'Apple-inspired to-do checklist with circular checkboxes, capsule input bar, and local persistence.',
  },
  {
    num: '16',
    Icon: Settings,
    tag: 'Preferences',
    name: 'Preferences & Customization',
    desc: 'Drag-and-drop tab reordering, multi-monitor notch positioning, aesthetic themes, and hotkeys.',
  },
];

export default function Features() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.feature-list-card',
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.035,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section className="features section" id="features" ref={sectionRef} aria-label="Quick Pill Features">
      <div className="features-container">
        <div className="features-header">
          <h2 className="features-headline">
            16 Features. <span className="features-headline--dim">One Capsule.</span>
          </h2>
          <p className="features-subline">
            Engineered with fluid spring physics, native Win32/WASAPI performance, and zero cognitive load.
          </p>
        </div>

        <div className="features-list">
          {ALL_FEATURES.map(({ num, Icon, tag, name, desc }) => (
            <article className="feature-list-card" key={name}>
              <div className="feature-list-left">
                <span className="feature-list-num" aria-hidden="true">{num}</span>
                <div className="feature-list-icon-wrapper">
                  <Icon size={16} strokeWidth={1.8} className="feature-list-icon" aria-hidden="true" />
                </div>
                <div className="feature-list-title-wrap">
                  <h3 className="feature-list-name">{name}</h3>
                  <span className="feature-list-tag">{tag}</span>
                </div>
              </div>

              <div className="feature-list-right">
                <p className="feature-list-desc">{desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
