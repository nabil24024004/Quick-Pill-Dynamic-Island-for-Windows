import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Github, ExternalLink } from 'lucide-react';
import LinuxDownloadCta from './LinuxDownloadCta';
import MicrosoftStoreBadge from './MicrosoftStoreBadge';
import WindowsLogo from './WindowsLogo';
import { useReleaseInfo } from '../hooks/useReleaseInfo';

gsap.registerPlugin(ScrollTrigger);

const GITHUB_URL  = 'https://github.com/nabil24024004/Quick-Pill-Dynamic-Island-for-Windows';
const HEADLINE = 'Download.';

export default function Download({ onDownloadClick }) {
  const sectionRef  = useRef(null);
  const headlineRef = useRef(null);
  const { version, msStoreUrl, releaseInfo } = useReleaseInfo();

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

      gsap.fromTo('.download-platforms > *',
        { y: 20, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 65%', toggleActions: 'play none none none' },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const handleDownload = (e, opts) => {
    if (onDownloadClick) {
      e.preventDefault();
      onDownloadClick(opts);
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
          Free and open-source. Built for Windows 10 &amp; 11 and Linux (X11 &amp; Wayland). No account required.
        </p>

        {/* Windows, Microsoft Store & Linux Download buttons */}
        <div className="download-platforms">
          <a
            href="#/thank-you"
            onClick={(e) => handleDownload(e, { os: 'windows' })}
            className="btn btn--primary"
            id="dl-windows"
            title={`Download Quick Pill v${version} Setup for Windows 10/11 (.exe)`}
            aria-label={`Download Quick Pill v${version} Setup for Windows 10/11 64-bit installer`}
          >
            <WindowsLogo size={26} />
            Download for Windows (.exe)
          </a>
          <MicrosoftStoreBadge
            id="dl-microsoft-store"
            href={msStoreUrl}
            title={`Get Quick Pill v${version} from Microsoft Store`}
            ariaLabel={`Get Quick Pill v${version} from Microsoft Store`}
          />
          <LinuxDownloadCta
            id="dl-linux-appimage"
            version={version}
            platforms={releaseInfo.platforms}
            onSelectDownload={handleDownload}
          />
        </div>

        <div className="download-linux-formats" aria-label="Additional Linux packages">
          <span className="download-linux-label">Linux Packages:</span>
          <a
            href="#/thank-you?os=linux&format=appimage"
            onClick={(e) => handleDownload(e, { os: 'linux', format: 'appimage' })}
            className="linux-format-chip"
          >
            .AppImage (Universal)
          </a>
          <a
            href="#/thank-you?os=linux&format=deb"
            onClick={(e) => handleDownload(e, { os: 'linux', format: 'deb' })}
            id="dl-linux-deb"
            className="linux-format-chip"
          >
            .deb (Ubuntu / Debian)
          </a>
          <a
            href="#/thank-you?os=linux&format=rpm"
            onClick={(e) => handleDownload(e, { os: 'linux', format: 'rpm' })}
            id="dl-linux-rpm"
            className="linux-format-chip"
          >
            .rpm (Fedora / RHEL)
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
