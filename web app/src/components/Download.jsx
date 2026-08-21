import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Download as DownloadIcon, Github, ExternalLink } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/*
 * ─── Cloudflare R2 Download URLs ───────────────────────────────────────────
 * Replace the placeholder bucket ID with your actual R2 public URL.
 *
 * Quick setup:
 *  1. dash.cloudflare.com → R2 → Create Bucket (name: "quick-pill-releases")
 *  2. Upload your QuickPill-Windows-v5.0.0-Setup.exe file
 *  3. Settings → Public Access → Enable
 *  4. Copy the public URL: https://pub-XXXX.r2.dev/filename
 *  5. Paste it below and replace the placeholder
 * ───────────────────────────────────────────────────────────────────────────
 */
const WINDOWS_URL = 'https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Windows-v5.0.0-Setup.exe';
const GITHUB_URL  = 'https://github.com/nabil24024004/Quick-Pill';

const HEADLINE = 'Download.';

export default function Download({ onDownloadClick }) {
  const sectionRef  = useRef(null);
  const headlineRef = useRef(null);

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
        <div className="download-eyebrow">Open Source · MIT License · v5.0.0</div>

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
            title="Download Quick Pill v5.0.0 Setup for Windows 10/11 (.exe)"
            aria-label="Download Quick Pill v5.0.0 Setup for Windows 10/11 64-bit installer"
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

        {/* Cloudflare R2 setup guide */}
        {WINDOWS_URL.includes('REPLACE_BUCKET_ID') && (
          <div className="r2-note">
            <strong>⚠ Developer note — Cloudflare R2 setup required:</strong><br />
            1. Go to <strong>dash.cloudflare.com → R2</strong> → Create Bucket named <strong>quick-pill-releases</strong><br />
            2. Upload your <strong>QuickPill-Windows-v5.0.0-Setup.exe</strong><br />
            3. Bucket Settings → <strong>Public Access → Enable</strong><br />
            4. Copy the public URL format: <strong>https://pub-YOUR_ID.r2.dev/QuickPill-Windows-v5.0.0-Setup.exe</strong><br />
            5. Replace <strong>REPLACE_BUCKET_ID</strong> in <code>Download.jsx</code> with your actual bucket public ID
          </div>
        )}
      </div>
    </section>
  );
}
