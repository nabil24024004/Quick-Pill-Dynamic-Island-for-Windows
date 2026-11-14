import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Lock, HardDrive, Globe } from 'lucide-react';

const GITHUB_URL = 'https://github.com/nabil24024004/Quick-Pill';

export default function PrivacyPolicy({ onBackToHome }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="thankyou-page">
      <div className="thankyou-bg-glow" aria-hidden="true" />

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
        <motion.div
          className="thankyou-hero"
          style={{ marginBottom: '3rem' }}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div className="hero-eyebrow">LEGAL · EFFECTIVE NOVEMBER 14, 2026</div>
          <h1 className="thankyou-title">
            Privacy <em>Policy.</em>
          </h1>
          <p className="thankyou-subtitle" style={{ marginBottom: 0 }}>
            Quick Pill is built by NeoSparkX as an open-source, offline-first Windows utility.
            Your data stays strictly on your computer.
          </p>
        </motion.div>

        <section className="smartscreen-section" aria-label="Privacy Commitments">
          <div className="first-steps-grid" style={{ marginBottom: '2.5rem' }}>
            <article className="first-step-card">
              <HardDrive size={20} className="first-step-icon" />
              <h4>1. Local-Only Storage</h4>
              <p>
                Notes, checklists, clipboard history, workspace pins, drop shelf file paths, and
                preferences are stored strictly on your device in your Windows AppData directory and
                Edge WebView2 local storage. We operate no cloud database or user accounts.
              </p>
            </article>

            <article className="first-step-card">
              <Lock size={20} className="first-step-icon" />
              <h4>2. Zero Telemetry &amp; Ads</h4>
              <p>
                Quick Pill contains zero analytics SDKs, crash-reporting trackers, usage profiling,
                or advertising identifiers. We do not collect, sell, rent, or transmit personal
                information or desktop activity.
              </p>
            </article>

            <article className="first-step-card">
              <ShieldCheck size={20} className="first-step-icon" />
              <h4>3. On-Device Windows APIs</h4>
              <p>
                Access to system media controls (SMTC), Windows toast notifications, WASAPI per-app
                audio sessions, CPU/RAM/Battery stats, and camera/microphone privacy indicators is
                processed solely in memory on your PC and never leaves your machine.
              </p>
            </article>

            <article className="first-step-card">
              <Globe size={20} className="first-step-icon" />
              <h4>4. Optional Network Calls</h4>
              <p>
                Network requests occur only for user-visible features: Weather forecasts
                (Open-Meteo), Prayer timings (Aladhan API), and optional version checks on direct
                `.exe` installs. Microsoft Store editions receive updates solely via Microsoft Store.
              </p>
            </article>
          </div>

          <div className="smartscreen-trust-banner">
            <ShieldCheck size={18} strokeWidth={1.5} className="trust-icon" />
            <div className="trust-text">
              <strong>Questions or Data Deletion:</strong> Because Quick Pill stores everything locally,
              uninstalling Quick Pill or clearing its AppData folder removes 100% of stored app data.
              For support or privacy inquiries, email{' '}
              <a href="mailto:abrar@neosparkx.com" className="thankyou-link">
                abrar@neosparkx.com
              </a>{' '}
              or audit our{' '}
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="thankyou-link">
                public MIT source code on GitHub
              </a>.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
