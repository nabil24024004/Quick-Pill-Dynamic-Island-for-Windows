import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Download as DownloadIcon, Github, ExternalLink } from 'lucide-react';

import { useReleaseInfo } from '../hooks/useReleaseInfo';

gsap.registerPlugin(ScrollTrigger);

const GITHUB_URL  = 'https://github.com/nabil24024004/Quick-Pill';
const HEADLINE = 'Download.';

export default function Download({ onDownloadClick }) {
  const sectionRef  = useRef(null);
  const headlineRef = useRef(null);
  const { version, windowsUrl } = useReleaseInfo();

  useEffect(() => {
    const ctx = gsap.context(() => {
      const chars = headlineRef.current.querySelectorAll('.char');
      gsap.fromTo(chars,
        { y: 130, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: 0.85,
          stagger: 0.055,
          ease: 'power4.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );

      gsap.fromTo('.download-subtitle',
        { y: 20, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.6, ease: 'power2.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%', toggleActions: 'play none none none' },
        }
      );

      gsap.fromTo('.download-platforms .btn',
        { y: 20, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 65%', toggleActions: 'play none none none' },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const handleDownload = (e) => {
    if (onDownloadClick) {
      e.preventDefault();
      onDownloadClick();
    }
  };

  return (
    <section className="download" id="download" ref={sectionRef} aria-label="Download Quick Pill">
      <div className="container">
        <div className="download-eyebrow">Open Source · MIT License · v{version}</div>

        {/* Character-split animated headline */}
        <h2 className="download-headline" ref={headlineRef} aria-label={HEADLINE}>
          {HEADLINE.split('').map((ch, i) => (
            <span className="char" key={i} aria-hidden="true">
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          ))}
        </h2>

        <p className="download-subtitle">
          Free and open-source. Built for Windows 10 &amp; 11. No account required.
        </p>

        {/* Windows Download button */}
        <div className="download-platforms">
          <a
            href="#/thank-you"
            onClick={handleDownload}
            className="btn btn--primary"
            id="dl-windows"
            title={`Download Quick Pill v${version} Setup for Windows 10/11 (.exe)`}
            aria-label={`Download Quick Pill v${version} Setup for Windows 10/11 64-bit installer`}
          >
            <DownloadIcon size={14} strokeWidth={2} aria-hidden="true" />
            Download for Windows (.exe)
          </a>
        </div>

        {/* Footer meta row */}
        <div className="download-meta">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="View Quick Pill repository on GitHub"
            aria-label="View Quick Pill repository on GitHub"
          >
            <Github size={13} strokeWidth={1.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} aria-hidden="true" />
            Source on GitHub
          </a>
          <a
            href={`${GITHUB_URL}/releases`}
            target="_blank"
            rel="noopener noreferrer"
            title="View all Quick Pill releases on GitHub"
            aria-label="View all Quick Pill releases on GitHub"
          >
            <ExternalLink size={13} strokeWidth={1.5} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} aria-hidden="true" />
            All Releases
          </a>
          <span className="download-version-badge">MIT License</span>
        </div>
      </div>
    </section>
  );
}
