import { Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer" role="contentinfo" aria-label="Footer">
      <div className="container">
        <div className="footer-inner">
          <div>
            <a href="#hero" className="footer-logo" title="Back to top">Quick Pill</a>
            <p className="footer-tagline">Dynamic Island, but for everyone.</p>
          </div>
          <div className="footer-right">
            <nav className="footer-links" aria-label="Footer links">
              <a
                href="https://github.com/nabil24024004/Quick-Pill"
                target="_blank"
                rel="noopener noreferrer"
                id="footer-github"
                title="Quick Pill repository on GitHub"
              >
                <Github size={13} strokeWidth={1.5} aria-hidden="true" />
                GitHub
              </a>
              <a
                href="https://github.com/nabil24024004/Quick-Pill/releases"
                target="_blank"
                rel="noopener noreferrer"
                title="Download previous releases"
              >
                Releases
              </a>
              <a
                href="https://github.com/nabil24024004/Quick-Pill/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                title="MIT License details"
              >
                MIT License
              </a>
            </nav>
            <p className="footer-copy">
              © {new Date().getFullYear()} Abrar Nabil. Open-source under MIT License.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
