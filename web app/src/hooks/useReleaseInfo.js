import { useState, useEffect } from 'react';

const DEFAULT_RELEASE = {
  version: '6.0.0',
  name: 'Quick Pill 6.0.0',
  releaseDate: '2026-11-14',
  storeProductId: '9N371MQB4BS7',
  msStoreUrl: 'https://apps.microsoft.com/detail/9N371MQB4BS7?mode=direct',
  changelog: [
    'Native Rust & Tauri v2 Rewrite: Rebuilt Quick Pill from Electron to a native Rust backend + Edge WebView2 frontend for instant launch speed, minimal RAM footprint, and a dramatically smaller installer.',
    'Direct Win32 Overlay & Global Shortcuts: Native Windows topmost overlay positioning, Ctrl click-through passthrough, and global Alt+Key tab hotkeys handled directly in Rust.',
    'Native WinRT & WASAPI Engines: Replaced external PowerShell bridges with native WinRT SMTC media controls, live Windows toast notifications, and WASAPI per-app audio mixing.',
    'Authenticode Signing Pipeline & SAC Protection: Added Windows code-signing build hooks (PFX / Azure Trusted Signing / Cert Store) and Smart App Control policy error handling in the auto-updater.',
    'Full Feature Parity: Drop Shelf (Alt+F), Prayer Times & Celestial Arc (Alt+P), Weather Pod, Quick Notes, App Launcher & Workspaces, Timer, Clipboard History, Tasks, and Search Bar.'
  ],
  platforms: {
    'win32-x64': {
      url: 'https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Windows-v6.0.0-Setup.exe',
      sha256: '6c7a3216fe125efd42ad28b4301829387f19f98a60f1b9fccec79408fa950366',
      size: 4124348,
      installerType: 'nsis'
    }
  }
};

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
  const storeProductId = (releaseInfo.storeProductId || releaseInfo.platforms?.['ms-store']?.productId || '').trim();
  const msStoreUrl = storeProductId
    ? `https://apps.microsoft.com/detail/${storeProductId}?mode=direct`
    : (releaseInfo.msStoreUrl || releaseInfo.platforms?.['ms-store']?.url || DEFAULT_RELEASE.msStoreUrl);

  return {
    releaseInfo,
    version: releaseInfo.version || '6.0.0',
    windowsUrl,
    storeProductId,
    msStoreUrl,
    storeDirectReady: Boolean(storeProductId),
    changelog: releaseInfo.changelog || [],
    isLoading
  };
}
