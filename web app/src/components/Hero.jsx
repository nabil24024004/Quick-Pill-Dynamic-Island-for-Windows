import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Download, Github, Play, Pause } from 'lucide-react';
import Beams from './Beams';
import { useReleaseInfo } from '../hooks/useReleaseInfo';

export default function Hero({ onDownloadClick }) {
  const headlineRef = useRef(null);
  const subtitleRef = useRef(null);
  const ctaRef      = useRef(null);
  const eyebrowRef  = useRef(null);
  const videoRef    = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const { version } = useReleaseInfo();

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(video);
    return () => observer.disconnect();
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

  const handleDownload = (e) => {
    if (onDownloadClick) {
      e.preventDefault();
      onDownloadClick();
    }
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
        <div ref={eyebrowRef} className="hero-eyebrow">QUICK PILL v{version}</div>

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
            href="#/thank-you"
            onClick={handleDownload}
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

        <div className="hero-platforms">Windows 10 / 11</div>
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
          poster="/large-mode.jpg"
          preload="metadata"
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
