import { useState, useEffect } from 'react';

const DEFAULT_RELEASE = {
  version: '5.5.1',
  name: 'Quick Pill 5.5.1',
  releaseDate: '2026-10-18',
  changelog: [
    'Quick App Launcher 1.5x Enlargement: Expanded window size (885x278) for high-efficiency application switching, larger workspace profile editor, and instant catalog search.',
    'Settings & Tab Navigation: Smooth vertical scrolling in sidebar categories, wheel swipe protection, and customizable Alt-based tab shortcuts.',
    'Quick Notes & Contextual Capture with debounced autosave, crash recovery, tags, and non-destructive note-to-task conversion.',
    'Smart Notification Actions with WhatsApp/VoIP call cards, inline replies, local snooze presets, grouped stacks, and privacy masking.',
    'Universal Progress Island consolidating background operations, file tasks, and updates into the top Dynamic Island.',
    'Per-App Audio Mixer via native Windows Core Audio WASAPI to control individual application volumes and endpoints.',
    'Apple Dynamic Island Battery Hub with 60 FPS right-to-left fluid liquid wave canvas engine and battery duration forecasting.',
    'Enhanced Always-On-Top resilience with screen-saver priority and background lock-screen timers.',
    'Automatic background update downloads and silent background NSIS installation.'
  ],
  platforms: {
    'win32-x64': {
      url: 'https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Windows-v5.5.1-Setup.exe',
      sha256: '14acfabffd3ddb68d78583f18685c5038bbe67355eabcc284d7760c2cd15548d',
      size: 135151289,
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

  return {
    releaseInfo,
    version: releaseInfo.version || '5.5.1',
    windowsUrl,
    changelog: releaseInfo.changelog || [],
    isLoading
  };
}
