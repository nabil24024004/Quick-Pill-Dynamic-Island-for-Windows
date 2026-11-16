import { useState, useEffect } from 'react';

const DEFAULT_RELEASE = {
  version: '6.1.0',
  name: 'Quick Pill 6.1.0',
  releaseDate: '2026-11-16',
  storeProductId: '9N371MQB4BS7',
  msStoreUrl: 'https://apps.microsoft.com/detail/9N371MQB4BS7?mode=direct',
  changelog: [
    'Cross-Platform Linux Support (X11 & Wayland): Added native Linux bundles (.AppImage, .deb, .rpm) with GTK3/GDK overlay positioning, PipeWire/PulseAudio mixer, MPRIS2 media controls, D-Bus notifications, and XDG app discovery.',
    'Drop Shelf Drag-Out & Portal File Transfer: Improved native Linux drop-in/drag-out across File Manager, Desktop, and sandboxed apps (Snap/Flatpak) via org.freedesktop.portal.FileTransfer and isolated clean-filename exports.',
    'Snappier Pill Physics & Scroll Switching: Tighter mode transition timing and faster mouse-wheel tab navigation inside Large Mode.',
    'Microsoft Store & Windows Direct Packages: Updated Dual-Mode MSIX (9N371MQB4BS7) and NSIS Setup installer pipeline to v6.1.0.'
  ],
  platforms: {
    'win32-x64': {
      url: 'https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Windows-v6.1.0-Setup.exe',
      sha256: '609893ce0372bde2e08a405ed211e8f49da74892480d544d1a19191f043e5e63',
      size: 4245513,
      installerType: 'nsis'
    },
    'linux-x64': {
      url: 'https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Linux-v6.1.0.AppImage',
      installerType: 'appimage'
    },
    'linux-deb': {
      url: 'https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Linux-v6.1.0.deb',
      installerType: 'deb'
    },
    'linux-rpm': {
      url: 'https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Linux-v6.1.0.rpm',
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
    version: releaseInfo.version || '6.1.0',
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
