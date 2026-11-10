import { useState, useEffect } from 'react';

const DEFAULT_RELEASE = {
  version: '5.6.0',
  name: 'Quick Pill 5.6.0',
  releaseDate: '2026-11-11',
  changelog: [
    'Drop Shelf (Tab 16, Alt+F): Floating staging area to drop files directly into the notch until system restart, with native Windows drag-out and quick open.',
    'Prayer Times & Celestial Arc (Tab 17, Alt+P): Location-synchronized prayer timings with offline astronomical calculation fallback, next prayer countdown hero, celestial sun arc, and collapsed time-to-pray notification banner with chime.',
    'Weather Pod Redesign: Modern glassmorphic 3D depth aesthetic with automatic Day (#FFD801) and Night (#061E40) dynamic accent theme, 7-day forecast cards, and sunrise/sunset metrics.',
    'Search Command Bar: Redesigned with Google Red accent (#DA3A28), Claude.ai quick launcher integration, and crisp official SVG branding for Google, YouTube, GitHub, ChatGPT, and Claude.',
    'App Launcher Auto-Collapse: Smart auto-collapse when cursor leaves the notch and automatic dismissal upon launching an application.',
    'Quick Notes & Task Manager: Seamless note-to-task conversion with defensive normalization, pinned/starred notes, and action shortcuts.',
    'Crash Shield & Error Boundary: Component-level ErrorBoundary wrapping across all interactive tabs and root window preventing render crashes.',
    'Self-Healing Tab Sync: Automatic migration and sync ensuring newly added tabs consistently display on the pill and in Settings.'
  ],
  platforms: {
    'win32-x64': {
      url: 'https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Windows-v5.6.0-Setup.exe',
      sha256: 'd94727749da4d7499c296bf62df12587b52f557a0f8c02977bd72c747ac8d81e',
      size: 135165124,
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
    version: releaseInfo.version || '5.6.0',
    windowsUrl,
    changelog: releaseInfo.changelog || [],
    isLoading
  };
}
