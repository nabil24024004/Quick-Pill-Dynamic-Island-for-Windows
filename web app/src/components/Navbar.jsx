export default function Navbar() {
  return (
    <header>
      <nav className="navbar" aria-label="Main site navigation">
        <a href="#hero" className="navbar-logo" title="Quick Pill — Home">
          <img
            src="/icon.png"
            alt="Quick Pill Dynamic Island Logo"
            width="22"
            height="22"
            style={{ width: 22, height: 22, borderRadius: 5 }}
          />
          Quick Pill
        </a>
        <ul className="navbar-links">
          <li><a href="#features" title="Explore Quick Pill features">Features</a></li>
          <li><a href="#how-it-works" title="Learn how Quick Pill works">How it works</a></li>
          <li><a href="#download" title="Download Quick Pill for Windows">Download</a></li>
          <li>
            <a
              href="https://github.com/nabil24024004/Quick-Pill"
              target="_blank"
              rel="noopener noreferrer"
              title="Quick Pill open source repository on GitHub"
            >
              GitHub ↗
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
