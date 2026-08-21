import { useEffect, useRef } from 'react';
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

const WINDOWS_URL = 'https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Windows-v5.0.0-Setup.exe';
const GITHUB_URL  = 'https://github.com/nabil24024004/Quick-Pill';
const DISCORD_URL = 'https://discord.gg/a2xzVkxFVg';

export default function ThankYou({ onBackToHome }) {
  const downloadInitiatedRef = useRef(false);

  const startDownload = () => {
    // Create an invisible anchor to initiate the download without leaving the page
    const link = document.createElement('a');
    link.href = WINDOWS_URL;
    link.setAttribute('download', 'QuickPill-Windows-v5.0.0-Setup.exe');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Trigger auto-download shortly after arrival
    const timer = setTimeout(() => {
      if (!downloadInitiatedRef.current) {
        downloadInitiatedRef.current = true;
        startDownload();
      }
    }, 800);

    return () => clearTimeout(timer);
  }, []);

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
          <div className="hero-eyebrow">QUICK PILL v5.0.0 · OPEN SOURCE</div>

          <h1 className="thankyou-title">
            Thank You for Downloading<br /><em>Quick Pill.</em>
          </h1>

          <p className="thankyou-subtitle">
            Your download will begin automatically in a few seconds.<br />
            If it didn&apos;t start,{' '}
            <a href={WINDOWS_URL} onClick={startDownload} className="thankyou-link">
              click here to download manually
            </a>
            .
          </p>
        </motion.div>

        {/* Windows SmartScreen & Installation Guide */}
        <motion.section
          className="smartscreen-section"
          aria-label="Windows Installation and SmartScreen Guide"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        >
          <div className="smartscreen-header">
            <h2 className="smartscreen-title">
              Windows Installation &amp; SmartScreen Guide
            </h2>
            <p className="smartscreen-intro">
              Because Quick Pill is open-source and newly released, Microsoft Defender
              SmartScreen may prompt an unrecognized app notice. Follow these two steps:
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
                  loading="eager"
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
                  loading="eager"
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
              <p>Click the capsule to open the full 11-tab dashboard for tasks, timers, clipboard history, and flip clock.</p>
            </div>

            <div className="first-step-card">
              <Keyboard size={20} className="first-step-icon" />
              <h4>Keyboard Shortcuts</h4>
              <p>Press <kbd>Ctrl + 1</kbd> through <kbd>Ctrl + 8</kbd> to jump straight into any feature tab in milliseconds.</p>
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
