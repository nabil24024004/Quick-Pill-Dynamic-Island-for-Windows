import { useState, useEffect } from 'react';

const DEFAULT_RELEASE = {
  version: '5.0.0',
  name: 'Quick Pill 5.0.0',
  releaseDate: '2026-08-25',
  changelog: [
    'Added automatic update checking and in-app installer.',
    'Improved media controller responsiveness.',
    'Performance and stability improvements.'
  ],
  platforms: {
    'win32-x64': {
      url: 'https://pub-ec47b1fa4cbf4c5ba82408a738fb69d3.r2.dev/QuickPill-Windows-v5.0.0-Setup.exe',
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
    version: releaseInfo.version || '5.0.0',
    windowsUrl,
    changelog: releaseInfo.changelog || [],
    isLoading
  };
}
