import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Compass, FileText, Bell, Sliders, FolderDown,
  BatteryCharging, Timer, CheckSquare, Clipboard, Cloud,
  Clock, Calendar, Search, Cpu, Settings, Sparkles
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const ALL_FEATURES = [
  {
    Icon: Compass,
    tag: 'Navigation & Focus',
    name: 'Quick App Launcher & Workspaces',
    story: 'Your entire digital workshop, summoned in a heartbeat.',
    desc: 'Launch any installed application with real process icons, switch running windows with native Win32 window restoration, and toggle dedicated contextual workspaces with zero friction.',
  },
  {
    Icon: FileText,
    tag: 'Instant Capture',
    name: 'Quick Notes & Mind Capture',
    story: 'A quiet corner for fleeting thoughts before they fade.',
    desc: 'Jot down quick snippets, meeting takeaways, or code fragments in a friction-free scratchpad with automatic dirty-state save, clipboard protection, and one-click task conversion.',
  },
  {
    Icon: Bell,
    tag: 'Communications',
    name: 'Smart Notification Actions',
    story: 'Staying gently connected without breaking your flow.',
    desc: 'Receive beautifully formatted action cards for WhatsApp and VoIP calls, send inline replies, or snooze alerts with local presets—complete with automatic privacy masking when sharing your screen.',
  },
  {
    Icon: Sliders,
    tag: 'Acoustic Control',
    name: 'Per-App Audio Mixer',
    story: 'Acoustic balance for your everyday headspace.',
    desc: 'Powered by native Windows WASAPI, fine-tune individual application volume levels, mute/unmute audio streams, monitor live peak levels, and toggle output devices right from your screen crown.',
  },
  {
    Icon: FolderDown,
    tag: 'Workflow Staging',
    name: 'Universal File Shelf & Progress',
    story: 'A temporary desktop perch for things in motion.',
    desc: 'Drag screenshots, project PDFs, or design assets up to your screen bezel to hold them safely in place, then glide them into an email or chat. Background downloads anchor directly to the capsule.',
  },
  {
    Icon: BatteryCharging,
    tag: 'Hardware Vitality',
    name: 'Apple Battery Hub & Fluid Wave',
    story: 'A living, breathing pulse for your laptop.',
    desc: 'Engineered with 60 FPS HTML5 canvas physics, fluid liquid waves and buoyant micro-bubbles reflect your battery health, complete with real-time charge forecasting and discharge diagnostics.',
  },
  {
    Icon: Timer,
    tag: 'Deep Work',
    name: 'Focus Timer & Glowing Perimeter',
    story: 'Gentle pacing for deep work mornings.',
    desc: 'No harsh alarms. Choose effortless 15m, 30m, 60m, or 100m presets, and watch a glowing stroke trace and slowly deplete around your island edge. Synchronized with wall-clock time so it never drifts.',
  },
  {
    Icon: CheckSquare,
    tag: 'Daily Clarity',
    name: 'Minimalist Tasks & Checklists',
    story: 'Peace of mind, one small checkmark at a time.',
    desc: 'Organize daily priorities with satisfying circular check controls, a minimal capsule input bar, and reliable local storage that persists seamlessly between reboots.',
  },
  {
    Icon: Clipboard,
    tag: 'Safety Net',
    name: 'Clipboard History Buffer',
    story: 'A faithful memory that never lets snippets slip away.',
    desc: 'Quick Pill quietly preserves your last 50 clipboard items—code snippets, hex colors, links, and text fragments—ready to restore with a single click, saving countless frantic searches.',
  },
  {
    Icon: Cloud,
    tag: 'Atmosphere',
    name: 'Weather & 3D Sky Glass',
    story: 'A tiny window to the world outside.',
    desc: 'Glance up to see real-time ambient temperatures, humidity, wind, and a 3-day sky glass forecast so you always know when it’s the right moment for a refreshing break.',
  },
  {
    Icon: Clock,
    tag: 'Mechanical Charm',
    name: 'StandBy Flip Clock & Quotes',
    story: 'Nostalgic mechanical aesthetic at your screen’s edge.',
    desc: 'A 3D split-flap mechanical clock pairs with curated reflections of timeless wisdom. The subtle glowing colon pulsates softly to ground your workday with calm perspective.',
  },
  {
    Icon: Calendar,
    tag: 'Time Orientation',
    name: 'Compact Monthly Calendar',
    story: 'Your month in perspective, without bulky windows.',
    desc: 'A sleek, horizontal monthly grid tailored to your top screen bezel. Check dates, align team sprints, and verify weekdays in seconds without launching heavy calendar apps.',
  },
  {
    Icon: Search,
    tag: 'Instant Launch',
    name: 'Omnibar Browser & URL Launcher',
    story: 'The fastest gateway to wherever you need to go.',
    desc: 'An intuitive omnibar that gets out of your way. Type any query to search Google, or paste localhost:3000 or an internal IP to leap straight into your development server with zero tab hunting.',
  },
  {
    Icon: Compass,
    tag: 'Spiritual Balance',
    name: 'Daily Prayer Times (Salah)',
    story: 'Honoring spiritual balance in the digital rush.',
    desc: 'A gentle solar arc calculates local prayer windows completely offline, offering peaceful pre-prayer notifications and optional music auto-pause to create space for peace during busy workdays.',
  },
  {
    Icon: Cpu,
    tag: 'System Health',
    name: 'Hardware Monitor & Privacy Dots',
    story: 'Quiet confidence in your machine’s health and privacy.',
    desc: 'Live gauges monitor CPU loads and RAM utilization so you immediately spot rogue processes. Persistent green and orange privacy dots reassure you whenever your camera or microphone is accessed.',
  },
  {
    Icon: Settings,
    tag: 'Tailored Fit',
    name: 'Personalized Themes & Preferences',
    story: 'Crafted to feel like a natural extension of your workflow.',
    desc: 'Reorder your favorite tabs with drag-and-drop ease, customize notch positioning across multi-monitor setups, pick your preferred aesthetic themes, and fine-tune hotkeys to make Quick Pill feel like home.',
  },
];

export default function Features() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.feature-card--dark',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: { amount: 0.8, from: 'start' },
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section className="features section" id="features" ref={sectionRef} aria-label="Quick Pill Features">
      <div className="container">
        <div className="features-header">
          <div className="features-badge">
            <Sparkles size={11} className="features-badge-icon" />
            <span>16 MODULAR CAPABILITIES</span>
          </div>
          <h2 className="features-headline">
            16 Features. <span className="features-headline--dim">One Capsule.</span>
          </h2>
          <p className="features-subline">
            Engineered with fluid spring physics, native Win32/WASAPI performance, and zero cognitive load.
          </p>
        </div>

        <div className="features-grid features-grid--dark">
          {ALL_FEATURES.map(({ Icon, tag, name, story, desc }) => (
            <article className="feature-card feature-card--dark" key={name}>
              <div className="feature-card-top">
                <span className="feature-card-tag">{tag}</span>
                <div className="feature-icon-wrapper">
                  <Icon size={17} strokeWidth={1.75} className="feature-icon" aria-hidden="true" />
                </div>
              </div>

              <h3 className="feature-name">{name}</h3>
              <p className="feature-story">{story}</p>
              <p className="feature-desc">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
