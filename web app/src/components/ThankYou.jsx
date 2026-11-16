import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Github,
  MessageSquare,
  ShieldCheck,
  MousePointer,
  Layers,
  Keyboard,
  Settings
} from 'lucide-react';
import LinuxLogo from './LinuxLogo';
import { useReleaseInfo } from '../hooks/useReleaseInfo';

const GITHUB_URL  = 'https://github.com/nabil24024004/Quick-Pill-Dynamic-Island-for-Windows';
const DISCORD_URL = 'https://discord.gg/a2xzVkxFVg';

function parseTargetFromLocation() {
  const hash = window.location.hash || '';
  const qIndex = hash.indexOf('?');
  const params = new URLSearchParams(
    qIndex !== -1 ? hash.slice(qIndex) : window.location.search
  );
  const rawOs = (params.get('os') || '').toLowerCase();
  const rawFormat = (params.get('format') || '').toLowerCase();
  if (rawOs === 'linux') {
    const format = ['appimage', 'deb', 'rpm'].includes(rawFormat) ? rawFormat : 'appimage';
    return { os: 'linux', format };
  }
  return { os: 'windows', format: 'exe' };
}

export default function ThankYou({ onBackToHome, onPrivacyClick }) {
  const downloadInitiatedRef = useRef(false);
  const { version, windowsUrl, linuxAppImageUrl, linuxDebUrl, linuxRpmUrl, isLoading } = useReleaseInfo();
  const [target, setTarget] = useState(() => parseTargetFromLocation());

  const activePackage = (() => {
    if (target.os === 'linux') {
      if (target.format === 'deb') {
        return {
          os: 'linux',
          format: 'deb',
          label: 'Ubuntu / Debian (.deb)',
          url: linuxDebUrl,
          fileName: `QuickPill-Linux-v${version}.deb`,
        };
      }
      if (target.format === 'rpm') {
        return {
          os: 'linux',
          format: 'rpm',
          label: 'Fedora / RHEL (.rpm)',
          url: linuxRpmUrl,
          fileName: `QuickPill-Linux-v${version}.rpm`,
        };
      }
      return {
        os: 'linux',
        format: 'appimage',
        label: 'Linux Universal (.AppImage)',
        url: linuxAppImageUrl,
        fileName: `QuickPill-Linux-v${version}.AppImage`,
      };
    }
    return {
      os: 'windows',
      format: 'exe',
      label: 'Windows Setup (.exe)',
      url: windowsUrl,
      fileName: `QuickPill-Windows-v${version}-Setup.exe`,
    };
  })();

  const triggerDownload = (pkg) => {
    const link = document.createElement('a');
    link.href = pkg.url;
    link.setAttribute('download', pkg.fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleManualDownload = (e) => {
    if (e?.preventDefault) e.preventDefault();
    triggerDownload(activePackage);
  };

  const handleSelectPackage = (os, format) => {
    setTarget({ os, format });
    const nextHash = os === 'linux' ? `#/thank-you?os=linux&format=${format}` : '#/thank-you';
    window.history.replaceState({}, '', nextHash);
    const nextUrl =
      os === 'linux'
        ? format === 'deb'
          ? linuxDebUrl
          : format === 'rpm'
          ? linuxRpmUrl
          : linuxAppImageUrl
        : windowsUrl;
    const nextFile =
      os === 'linux'
        ? format === 'deb'
          ? `QuickPill-Linux-v${version}.deb`
          : format === 'rpm'
          ? `QuickPill-Linux-v${version}.rpm`
          : `QuickPill-Linux-v${version}.AppImage`
        : `QuickPill-Windows-v${version}-Setup.exe`;
    triggerDownload({ url: nextUrl, fileName: nextFile });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (!downloadInitiatedRef.current) {
        downloadInitiatedRef.current = true;
        triggerDownload(activePackage);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [isLoading, activePackage.url]);

  return (
    <div className="thankyou-page">
      {/* Background ambient lighting */}
      <div className="thankyou-bg-glow" aria-hidden="true" />

      {/* Header bar */}
      <header className="thankyou-header">
        <div className="container thankyou-header-inner">
          <button
            onClick={onBackToHome}
            className="thankyou-back-btn"
            title="Return to Quick Pill Homepage"
            aria-label="Return to Quick Pill Homepage"
          >
            <ArrowLeft size={14} />
            <span>Back to Home</span>
          </button>

          <a href="#hero" onClick={onBackToHome} className="navbar-logo">
            <img
              src="/icon.png"
              alt="Quick Pill Logo"
              width="22"
              height="22"
              style={{ width: 22, height: 22, borderRadius: 5 }}
            />
            Quick Pill
          </a>
        </div>
      </header>

      <main className="container thankyou-main">
        {/* Hero Thank You Title */}
        <motion.div
          className="thankyou-hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="hero-eyebrow">QUICK PILL v{version} · OPEN SOURCE</div>

          <h1 className="thankyou-title">
            Thank You for Downloading<br /><em>Quick Pill.</em>
          </h1>

          <p className="thankyou-subtitle">
            Your <strong>{activePackage.label}</strong> download will begin automatically in a few seconds.<br />
            If it didn&apos;t start,{' '}
            <a href={activePackage.url} onClick={handleManualDownload} className="thankyou-link">
              click here to download manually
            </a>
            .
          </p>

          <div className="thankyou-format-bar" role="group" aria-label="Switch download package">
            <button
              type="button"
              className={`linux-format-chip ${target.os === 'windows' ? 'is-active' : ''}`}
              onClick={() => handleSelectPackage('windows', 'exe')}
            >
              Windows (.exe)
            </button>
            <button
              type="button"
              className={`linux-format-chip ${target.os === 'linux' && target.format === 'appimage' ? 'is-active' : ''}`}
              onClick={() => handleSelectPackage('linux', 'appimage')}
            >
              Linux (.AppImage)
            </button>
            <button
              type="button"
              className={`linux-format-chip ${target.os === 'linux' && target.format === 'deb' ? 'is-active' : ''}`}
              onClick={() => handleSelectPackage('linux', 'deb')}
            >
              Ubuntu / Debian (.deb)
            </button>
            <button
              type="button"
              className={`linux-format-chip ${target.os === 'linux' && target.format === 'rpm' ? 'is-active' : ''}`}
              onClick={() => handleSelectPackage('linux', 'rpm')}
            >
              Fedora / RPM (.rpm)
            </button>
          </div>
        </motion.div>

        {target.os === 'linux' ? (
          <motion.section
            className="smartscreen-section"
            aria-label="Linux Installation Guide"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
          >
            <div className="smartscreen-header">
              <h2 className="smartscreen-title">
                <LinuxLogo height={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                Linux Installation Guide (X11 &amp; Wayland)
              </h2>
              <p className="smartscreen-intro">
                Quick Pill supports X11, GNOME, KDE Plasma, Hyprland, Sway, and i3 with PipeWire/PulseAudio mixer, MPRIS2 media controls, D-Bus notifications, and XDG app discovery.
              </p>
            </div>

            <div className="smartscreen-steps-grid">
              <article className="smartscreen-step-card">
                <div className="step-numeral" aria-hidden="true">I</div>
                <h3 className="step-card-title">AppImage (Universal)</h3>
                <p className="step-card-desc">
                  Mark the file executable and run directly — auto-updates replace your AppImage in place:
                </p>
                <pre className="linux-cmd-block">{`chmod +x QuickPill-Linux-v${version}.AppImage\n./QuickPill-Linux-v${version}.AppImage`}</pre>
              </article>

              <article className="smartscreen-step-card">
                <div className="step-numeral" aria-hidden="true">II</div>
                <h3 className="step-card-title">Native Packages (.deb / .rpm)</h3>
                <p className="step-card-desc">
                  Or install system-wide via your distro package manager:
                </p>
                <pre className="linux-cmd-block">{`# Debian / Ubuntu / Pop!_OS\nsudo apt install ./QuickPill-Linux-v${version}.deb\n\n# Fedora / RHEL / openSUSE\nsudo dnf install ./QuickPill-Linux-v${version}.rpm`}</pre>
              </article>
            </div>

            <div className="smartscreen-trust-banner">
              <ShieldCheck size={18} strokeWidth={1.5} className="trust-icon" />
              <div className="trust-text">
                <strong>Open-Source &amp; Verified:</strong> Quick Pill contains zero trackers or telemetry. Full source code and build workflows are public on{' '}
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="thankyou-link">
                  GitHub
                </a>.
              </div>
            </div>
          </motion.section>
        ) : (
        <motion.section
          className="smartscreen-section"
          aria-label="Windows Installation and SmartScreen Guide"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        >
          <div className="smartscreen-header">
            <h2 className="smartscreen-title">
              Windows Installation, SmartScreen &amp; Smart App Control Guide
            </h2>
            <p className="smartscreen-intro">
              If Microsoft Defender SmartScreen prompts an unrecognized app notice while installing an unsigned preview or newly released build, follow these two steps (for Windows 11 <strong>Smart App Control</strong>, signed release builds and Microsoft reputation indexing are required):
            </p>
          </div>

          {/* Step-by-step visual cards */}
          <div className="smartscreen-steps-grid">
            {/* Step 1 */}
            <article className="smartscreen-step-card">
              <div className="step-numeral" aria-hidden="true">I</div>
              <h3 className="step-card-title">Click &quot;More info&quot;</h3>
              <p className="step-card-desc">
                On the blue <em>&quot;Windows protected your PC&quot;</em> window, click the underlined{' '}
                <strong>&quot;More info&quot;</strong> link.
              </p>
              <div className="step-image-frame">
                <img
                  src="/smartscreen-step1.png"
                  alt="Windows protected your PC dialog with More info link circled in red"
                  title="Click 'More info' on the Windows SmartScreen alert"
                  className="smartscreen-img"
                  loading="lazy"
                  decoding="async"
                  width="500"
                  height="450"
                />
              </div>
            </article>

            {/* Step 2 */}
            <article className="smartscreen-step-card">
              <div className="step-numeral" aria-hidden="true">II</div>
              <h3 className="step-card-title">Click &quot;Run anyway&quot;</h3>
              <p className="step-card-desc">
                Click the <strong>&quot;Run anyway&quot;</strong> button at the bottom left to launch the setup.
              </p>
              <div className="step-image-frame">
                <img
                  src="/smartscreen-step2.jpg"
                  alt="Windows protected your PC dialog showing Run anyway button circled in red"
                  title="Click 'Run anyway' to launch Quick Pill setup"
                  className="smartscreen-img"
                  loading="lazy"
                  decoding="async"
                  width="500"
                  height="450"
                />
              </div>
            </article>
          </div>

          {/* Reassurance Banner */}
          <div className="smartscreen-trust-banner">
            <ShieldCheck size={18} strokeWidth={1.5} className="trust-icon" />
            <div className="trust-text">
              <strong>Open-Source &amp; Verified:</strong> Quick Pill contains zero trackers or telemetry. All source code is completely public on{' '}
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="thankyou-link">
                GitHub
              </a>.
            </div>
          </div>
        </motion.section>
        )}

        {/* First Steps Guide */}
        <motion.section
          className="first-steps-section"
          aria-label="Getting Started with Quick Pill"
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
        >
          <div className="first-steps-header">
            <h2 className="first-steps-title">Quick Start: Mastering Your Island</h2>
            <p className="first-steps-subtitle">Here is how to get the most out of Quick Pill right after launch:</p>
          </div>

          <div className="first-steps-grid">
            <div className="first-step-card">
              <MousePointer size={20} className="first-step-icon" />
              <h4>Hover for Quick Mode</h4>
              <p>Move your cursor over the capsule to check live time, weather, battery, and current music playback controls.</p>
            </div>

            <div className="first-step-card">
              <Layers size={20} className="first-step-icon" />
              <h4>Click for Large Mode</h4>
              <p>Click the capsule to open the full 16-tab workspace for tasks, timers, audio mixer, drop shelf, notes, and flip clock.</p>
            </div>

            <div className="first-step-card">
              <Keyboard size={20} className="first-step-icon" />
              <h4>Keyboard Shortcuts</h4>
              <p>Press global shortcuts like <kbd>Alt + O</kbd>, <kbd>Alt + M</kbd>, <kbd>Alt + N</kbd>, or <kbd>Alt + F</kbd> to jump straight into any tab.</p>
            </div>

            <div className="first-step-card">
              <Settings size={20} className="first-step-icon" />
              <h4>Customize Settings</h4>
              <p>Visit the Settings tab to pick your display monitor, adjust spring physics, choose themes, and enable launch on startup.</p>
            </div>
          </div>
        </motion.section>

        {/* Community & Links Section */}
        <motion.section
          className="thankyou-community-section"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease: 'easeOut' }}
        >
          <div className="community-box">
            <div className="community-content">
              <h3>Join the Quick Pill Community</h3>
              <p>Share feedback, request features, report bugs, or chat with fellow power users.</p>
            </div>
            <div className="community-buttons">
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--outline-white"
                title="Join Quick Pill Discord Server"
              >
                <MessageSquare size={14} />
                Join Discord
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--ghost-white"
                title="Star Quick Pill on GitHub"
              >
                <Github size={14} />
                Star on GitHub
              </a>
            </div>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="footer thankyou-footer" role="contentinfo">
        <div className="container">
          <div className="footer-inner">
            <div>
              <a href="#hero" onClick={onBackToHome} className="footer-logo">Quick Pill</a>
              <p className="footer-tagline">Dynamic Island, but for everyone.</p>
            </div>
            <div className="footer-right">
              <div className="footer-links">
                <a href="#hero" onClick={onBackToHome}>Home</a>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
                <a href={`${GITHUB_URL}/releases`} target="_blank" rel="noopener noreferrer">All Releases</a>
                <a href={`${GITHUB_URL}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">MIT License</a>
                <a href="#/privacy" onClick={onPrivacyClick}>Privacy Policy</a>
              </div>
              <p className="footer-copy">
                © {new Date().getFullYear()} Abrar Nabil. Open-source under MIT License.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
