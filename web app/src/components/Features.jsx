import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Music, Bell, Timer, CheckSquare, Clipboard, Cloud,
  Clock, Cpu, Rocket, Settings, Shield, Search, Calendar,
  Sliders, Activity, BatteryCharging, Compass, FileText
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    Icon: Compass,
    name: 'Quick App Launcher & Workspaces',
    desc: 'Instant search across installed applications with real icons, running-window switcher with Win32 activation, favorites, and configurable productivity workspaces with safe launch profiles.',
    imgSrc: 'media-tab.jpg',
    alt: 'Quick Pill App Launcher & Workspace Switcher on Windows',
  },
  {
    Icon: FileText,
    name: 'Quick Notes & Contextual Capture',
    desc: 'High-speed note capture with dirty-state autosave and crash recovery, searchable inbox with tags, contextual clipboard capture with large-content guard, and direct task conversion.',
    imgSrc: 'tasks-tab.jpg',
    alt: 'Quick Pill Quick Notes and Contextual Capture',
  },
  {
    Icon: Bell,
    name: 'Smart Notification Actions',
    desc: 'Real application icons, WhatsApp/VoIP call cards with answer/dismiss, inline replies, local snooze presets, grouped stacks, and privacy masking.',
    imgSrc: 'notifications-tab.jpg',
    alt: 'Quick Pill Smart Notification Actions Tab on Windows desktop',
  },
  {
    Icon: Sliders,
    name: 'Per-App Audio Mixer',
    desc: 'Control individual application volume levels, mute/unmute audio streams, monitor live peak audio meters, and switch audio output devices via native Windows WASAPI.',
    imgSrc: 'media-tab.jpg',
    alt: 'Quick Pill Per-App Audio Mixer for Windows applications',
  },
  {
    Icon: Activity,
    name: 'Universal Progress Island',
    desc: 'Consolidates background file operations, download tasks, and app update progress into an intelligent top-anchored Dynamic Island.',
    imgSrc: 'quick-mode.jpg',
    alt: 'Quick Pill Universal Progress Island on Windows desktop',
  },
  {
    Icon: BatteryCharging,
    name: 'Apple Battery Hub',
    desc: 'Fluid 60 FPS liquid wave canvas physics engine, buoyant micro-bubbles, discharge drain diagnostics, and real-time duration forecasting.',
    imgSrc: 'still-mode.jpg',
    alt: 'Quick Pill Apple Dynamic Island Battery Hub',
  },
  {
    Icon: Timer,
    name: 'Preset Timer & Depleting Glow',
    desc: 'One-tap presets: 15m, 30m, 60m, 100m. A glowing SVG border traces the island edge and depletes as time counts down.',
    imgSrc: 'timer-tab.jpg',
    alt: 'Quick Pill Productivity Timer with Edge Depleting Glow animation',
  },
  {
    Icon: CheckSquare,
    name: 'Minimalist Tasks',
    desc: 'Apple/Things 3 style task list with circular check controls, capsule input bar, and local persistence across restarts.',
    imgSrc: 'tasks-tab.jpg',
    alt: 'Quick Pill Minimalist Task Manager with circular checkboxes',
  },
  {
    Icon: Clipboard,
    name: 'Clipboard History',
    desc: 'Automatically captures up to 50 clipboard entries. One-click restore to active clipboard with visual confirmation.',
    imgSrc: 'clipboard-tab.jpg',
    alt: 'Quick Pill Clipboard History Manager with 50 saved clipboard snippets',
  },
  {
    Icon: Cloud,
    name: 'Weather & 3D Forecast',
    desc: 'Real-time conditions, humidity, wind speed, precipitation, and a 3-day sky-glass forecast. Full °C and °F support.',
    imgSrc: 'weather-tab.jpg',
    alt: 'Quick Pill Real-time Weather widget with 3-day sky-glass forecast',
  },
  {
    Icon: Clock,
    name: 'Split-Flap Flip Clock',
    desc: 'Mechanical 3D split-flap clock with glowing orange colon dots and a live date display — pure retro aesthetic.',
    imgSrc: 'flipclock-tab.jpg',
    alt: 'Quick Pill Mechanical 3D Split-Flap Flip Clock widget',
  },
  {
    Icon: Calendar,
    name: 'Interactive Calendar',
    desc: 'Full month calendar view with highlighted today indicator and smooth navigation.',
    imgSrc: 'calender-tab.jpg',
    alt: 'Quick Pill Interactive Full Month Calendar widget',
  },
  {
    Icon: Search,
    name: 'Universal Search & Launcher',
    desc: 'Instant search across applications, web queries, and quick actions directly from your island capsule.',
    imgSrc: 'search-tab.jpg',
    alt: 'Quick Pill Universal App Search and Web Launcher',
  },
  {
    Icon: Settings,
    name: 'Comprehensive Settings',
    desc: 'Themes, positioning, drag-to-reorder tab manager, per-tab visibility, multi-monitor selector, and auto-launch.',
    imgSrc: 'settings-tab.jpg',
    alt: 'Quick Pill Customization and Multi-Monitor Settings dashboard',
  },
  {
    Icon: Shield,
    name: 'Privacy Dot Monitoring',
    desc: 'Always-on camera (green) and microphone (orange) active-use indicator dots. Know exactly what is accessing your hardware.',
    imgSrc: 'privacydot-tab.jpg',
    alt: 'Quick Pill Camera and Microphone Privacy Dot Hardware Indicators',
  },
  {
    Icon: Cpu,
    name: 'System Metrics',
    desc: 'Real-time CPU load and RAM utilization bars. Battery percentage with a dynamic charging glow accent.',
    imgSrc: 'system.jpg',
    alt: 'Quick Pill Live CPU Load and RAM utilization hardware metrics',
  },
  {
    Icon: Music,
    name: 'Media Controller & Scrubber',
    desc: 'Full-bleed album art, marquee titles, and an interactive waveform scrubber. Auto-recognizes Spotify, Apple Music, browsers.',
    imgSrc: 'media-tab.jpg',
    alt: 'Quick Pill Desktop Media Controller with album art and audio scrubber',
  },
];

export default function Features() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.feature-card',
        { y: 50, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.6,
          stagger: { amount: 0.8, from: 'start' },
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
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
          <h2 className="features-headline">11 Features.</h2>
          <p className="features-subline">One capsule.</p>
        </div>
        <div className="features-grid">
          {FEATURES.map(({ Icon, name, desc, imgSrc, alt }) => (
            <article className="feature-card" key={name}>
              <div className="feature-card-header">
                <Icon size={20} strokeWidth={1.5} className="feature-icon" aria-hidden="true" />
                <h3 className="feature-name">{name}</h3>
              </div>
              <p className="feature-desc">{desc}</p>
              {imgSrc && (
                <div className="feature-img-box">
                  <img
                    src={imgSrc}
                    alt={alt || name}
                    title={name}
                    className="feature-card-img"
                    loading="lazy"
                    decoding="async"
                    width="400"
                    height="200"
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
