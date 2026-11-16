import { useState, useEffect } from 'react';

const DEFAULT_RELEASE = {
  version: '6.1.1',
  name: 'Quick Pill 6.1.1',
  releaseDate: '2026-11-16',
  storeProductId: '9N371MQB4BS7',
  msStoreUrl: 'https://apps.microsoft.com/detail/9N371MQB4BS7?mode=direct',
  changelog: [
    'Compact Overlay, Lower Memory & Instant Visibility: Fixed Windows overlay opacity initialization for immediate Store/setup visibility, eliminated hover resize/redraw glitching, and trimmed idle WebView2 footprint.',
    'Single-Instance & Ctrl+Hover Click-Through: Enforced single-instance locking and fixed OS-level Ctrl+Hover click-through (instant fade/passthrough even when unfocused, clean release restoration, and text-input protection).',
    'Media Control & Scrubber Fixes: Fixed Windows SMTC command checks with Play/Pause + media-key fallbacks, clamped seek bounds, prevented missing thumbnail caching, and added smooth drag scrubbing.',
    'Cross-Platform Linux & Microsoft Store MSIX: Rebuilt Windows NSIS Setup, Dual-Mode MSIX (6.1.1.0 / 9N371MQB4BS7), and Linux VM bundling pipeline (.AppImage, .deb, .rpm).'
  ],
  platforms: {
    'win32-x64': {
      url: 'https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Windows-v6.1.1-Setup.exe',
      sha256: '606dfa5df49ab351bd01fb55109804d6a1e8696a972ad4fcccaa50177a665c9f',
      size: 4264420,
      installerType: 'nsis'
    },
    'linux-x64': {
      url: 'https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Linux-v6.1.1.AppImage',
      installerType: 'appimage'
    },
    'linux-deb': {
      url: 'https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Linux-v6.1.1.deb',
      installerType: 'deb'
    },
    'linux-rpm': {
      url: 'https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Linux-v6.1.1.rpm',
      installerType: 'rpm'
    }
  }
};

function detectClientOs() {
  if (typeof navigator === 'undefined') return 'windows';
  const ua = `${navigator.platform || ''} ${navigator.userAgent || ''}`.toLowerCase();
  if (ua.includes('linux') && !ua.includes('android')) return 'linux';
  return 'windows';
}

export function useReleaseInfo() {
  const [releaseInfo, setReleaseInfo] = useState(DEFAULT_RELEASE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch('/version.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (isMounted && data && data.version) {
          setReleaseInfo(data);
        }
      })
      .catch(err => {
        console.warn('Could not fetch version.json, using defaults:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const windowsUrl = releaseInfo.platforms?.['win32-x64']?.url || DEFAULT_RELEASE.platforms['win32-x64'].url;
  const linuxAppImageUrl = releaseInfo.platforms?.['linux-x64']?.url || DEFAULT_RELEASE.platforms['linux-x64'].url;
  const linuxDebUrl = releaseInfo.platforms?.['linux-deb']?.url || DEFAULT_RELEASE.platforms['linux-deb'].url;
  const linuxRpmUrl = releaseInfo.platforms?.['linux-rpm']?.url || DEFAULT_RELEASE.platforms['linux-rpm'].url;
  const storeProductId = (releaseInfo.storeProductId || releaseInfo.platforms?.['ms-store']?.productId || '').trim();
  const msStoreUrl = storeProductId
    ? `https://apps.microsoft.com/detail/${storeProductId}?mode=direct`
    : (releaseInfo.msStoreUrl || releaseInfo.platforms?.['ms-store']?.url || DEFAULT_RELEASE.msStoreUrl);

  return {
    releaseInfo,
    version: releaseInfo.version || '6.1.1',
    windowsUrl,
    linuxAppImageUrl,
    linuxDebUrl,
    linuxRpmUrl,
    detectedOs: detectClientOs(),
    storeProductId,
    msStoreUrl,
    storeDirectReady: Boolean(storeProductId),
    changelog: releaseInfo.changelog || [],
    isLoading
  };
}
