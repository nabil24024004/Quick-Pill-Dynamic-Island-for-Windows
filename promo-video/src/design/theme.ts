/**
 * Editorial Monochrome design tokens aligned with quickpill.neosparkx.com
 * and video-layout.md safe-area & typography minimums for 1080x1920 vertical video.
 */
export const EDITORIAL_THEME = {
  colors: {
    bg: '#000000',
    surfaceDark: '#070707',
    surfaceCard: '#0c0c0c',
    fg: '#ffffff',
    fgSecondary: 'rgba(255, 255, 255, 0.72)',
    fgMuted: 'rgba(255, 255, 255, 0.46)',
    hairline: 'rgba(255, 255, 255, 0.14)',
    hairlineBright: 'rgba(255, 255, 255, 0.32)',
    ruleStrong: '#ffffff',
    glassFill:
      'linear-gradient(145deg, rgba(255, 255, 255, 0.075) 0%, rgba(255, 255, 255, 0.015) 100%)',
    glassBorder: 'rgba(255, 255, 255, 0.18)',
  },
  layout: {
    width: 1080,
    height: 1920,
    safeX: 80,
    safeY: 100,
    contentWidth: 920, // 1080 - 2 * 80
  },
  typeScale: {
    heroDisplay: 98, // >= 84px minimum
    sceneHeadline: 86, // >= 84px minimum
    supportCopy: 44, // >= 44px minimum
    eyebrowMono: 24,
    keycapMono: 24,
    chromeMeta: 20,
  },
} as const;
