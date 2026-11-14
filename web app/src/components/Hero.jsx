import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Download, Github } from 'lucide-react';
import Beams from './Beams';
import InteractiveSandbox from './InteractiveSandbox';
import MicrosoftStoreBadge from './MicrosoftStoreBadge';
import { useReleaseInfo } from '../hooks/useReleaseInfo';

export default function Hero({ onDownloadClick }) {
  const headlineRef = useRef(null);
  const subtitleRef = useRef(null);
  const ctaRef      = useRef(null);
  const eyebrowRef  = useRef(null);
  const { version, msStoreUrl } = useReleaseInfo();

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
            {'Your Desktop'.split(' ').map((w, i) => (
              <span key={i} className="word">{w}&nbsp;</span>
            ))}
          </span>
          <span className="hero-line hero-line--italic">
            {'Reimagined'.split(' ').map((w, i) => (
              <span key={i} className="word">{w}</span>
            ))}
          </span>
        </h1>

        <p className="hero-subtitle" ref={subtitleRef}>
          A live notch for your desktop. Floating above your active workspace with
          per-app audio mixing, live notifications, focus timers, file staging and 16 utilities.
        </p>

        <div className="hero-cta" ref={ctaRef}>
          <a
            href="#/thank-you"
            onClick={handleDownload}
            className="btn btn--primary"
            title="Download Quick Pill for Windows 10 & 11"
            aria-label="Download Quick Pill for Windows 10 & 11"
          >
            <Download size={15} strokeWidth={2} aria-hidden="true" />
            Download for Windows
          </a>
          <MicrosoftStoreBadge
            href={msStoreUrl}
            title={`Get Quick Pill v${version} from Microsoft Store`}
            ariaLabel={`Get Quick Pill v${version} from Microsoft Store`}
          />
        </div>

        <div className="hero-platforms">
          <span>Windows 10 / 11 (64-bit)</span>
          <span aria-hidden="true">•</span>
          <span>100% Free &amp; Open Source</span>
          <span aria-hidden="true">•</span>
          <a
            href="https://github.com/nabil24024004/Quick-Pill-Dynamic-Island-for-Windows"
            target="_blank"
            rel="noopener noreferrer"
            className="hero-github-link"
            title="View Quick Pill open-source repository on GitHub"
            aria-label="View Quick Pill open-source repository on GitHub"
          >
            <Github size={13} strokeWidth={1.75} aria-hidden="true" />
            View on GitHub
          </a>
        </div>
      </div>

      {/* Interactive Sandbox Hero: Full-width simulated Windows 11 desktop viewport & 16-tab dock */}
      <InteractiveSandbox />

      <div className="hero-rule" aria-hidden="true" />
    </section>
  );
}
