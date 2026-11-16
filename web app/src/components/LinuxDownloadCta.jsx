import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ExternalLink, Check } from 'lucide-react';
import LinuxLogo from './LinuxLogo';

const GITHUB_RELEASES_URL =
  'https://github.com/nabil24024004/Quick-Pill-Dynamic-Island-for-Windows/releases';

const LINUX_OPTIONS = [
  {
    format: 'appimage',
    platformKey: 'linux-x64',
    title: 'AppImage',
    ext: '.AppImage',
    subtitle: 'Universal · Portable · All distros',
  },
  {
    format: 'deb',
    platformKey: 'linux-deb',
    title: 'Debian / Ubuntu',
    ext: '.deb',
    subtitle: 'APT · Ubuntu · Pop!_OS · Mint',
  },
  {
    format: 'rpm',
    platformKey: 'linux-rpm',
    title: 'Fedora / RHEL',
    ext: '.rpm',
    subtitle: 'DNF · Fedora · openSUSE · RHEL',
  },
];

function formatSizeMb(bytes) {
  if (!bytes || typeof bytes !== 'number') return null;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LinuxDownloadCta({
  id = 'dl-linux',
  version,
  platforms,
  defaultFormat = 'appimage',
  onSelectDownload,
}) {
  const [open, setOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState(defaultFormat);
  const wrapRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const handleOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleOptionClick = (e, format) => {
    setSelectedFormat(format);
    setOpen(false);
    if (onSelectDownload) {
      e.preventDefault();
      onSelectDownload({ os: 'linux', format });
    }
  };

  return (
    <div
      ref={wrapRef}
      className={`linux-cta-wrap ${open ? 'is-open' : ''}`}
    >
      <button
        type="button"
        id={id}
        className="btn btn--outline-white linux-cta-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Choose Quick Pill v${version} Linux package format (.AppImage, .deb, .rpm)`}
        title="Choose Linux package format (.AppImage, .deb, .rpm)"
        onClick={() => setOpen((prev) => !prev)}
      >
        <LinuxLogo height={30} />
        <span>Download for Linux</span>
        <ChevronDown size={18} strokeWidth={2.4} className="linux-cta-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          className="linux-cta-menu"
          role="menu"
          aria-label="Linux package formats"
        >
          <div className="linux-cta-menu-header">
            Select Linux Format · v{version}
          </div>

          {LINUX_OPTIONS.map((opt) => {
            const isSelected = opt.format === selectedFormat;
            const sizeLabel = formatSizeMb(platforms?.[opt.platformKey]?.size);
            return (
              <a
                key={opt.format}
                href={`#/thank-you?os=linux&format=${opt.format}`}
                role="menuitemradio"
                aria-checked={isSelected}
                className={`linux-cta-item ${isSelected ? 'is-selected' : ''}`}
                onClick={(e) => handleOptionClick(e, opt.format)}
              >
                <div className="linux-cta-item-top">
                  <span className="linux-cta-item-title">
                    {opt.title}
                    <span className="linux-cta-item-ext">{opt.ext}</span>
                  </span>
                  <span className="linux-cta-item-meta">
                    {sizeLabel && <span className="linux-cta-item-size">{sizeLabel}</span>}
                    {isSelected && <Check size={13} strokeWidth={2.5} aria-hidden="true" />}
                  </span>
                </div>
                <span className="linux-cta-item-sub">{opt.subtitle}</span>
              </a>
            );
          })}

          <div className="linux-cta-menu-divider" />

          <a
            href={GITHUB_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            className="linux-cta-item linux-cta-item--external"
            onClick={() => setOpen(false)}
          >
            <div className="linux-cta-item-top">
              <span className="linux-cta-item-title">Other Distros / Checksums</span>
              <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
            </div>
            <span className="linux-cta-item-sub">Source, .sha256 &amp; all GitHub Releases</span>
          </a>
        </div>
      )}
    </div>
  );
}
