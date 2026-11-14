import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {EDITORIAL_THEME} from '../design/theme';
import {FONTS} from '../design/typography';

type EditorialCanvasProps = {
  readonly sectionCode?: string;
  readonly sectionLabel?: string;
  readonly showChrome?: boolean;
  readonly children: React.ReactNode;
};

const BEAM_CONFIG = Array.from({length: 9}, (_, i) => ({
  baseRatio: (i + 0.5) / 9,
  phase: (i / 9) * Math.PI * 2,
  freq: 0.45 + (i % 4) * 0.16,
  width: 34 + (i % 3) * 26,
  alpha: 0.025 + (i % 4) * 0.014,
}));

/**
 * Deterministic Editorial Monochrome stage inspired by quickpill.neosparkx.com:
 * pitch black canvas, swaying monochrome vertical beams, subtle animated noise grain,
 * and crisp safe-area editorial header/footer hairlines.
 */
export const EditorialCanvas: React.FC<EditorialCanvasProps> = ({
  sectionCode = 'QP // 6.0',
  sectionLabel = 'DYNAMIC ISLAND FOR WINDOWS & LINUX',
  showChrome = false,
  children,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const t = frame / fps;
  const progress = Math.min(1, Math.max(0, frame / Math.max(1, durationInFrames - 1)));
  const grainFilterId = `qp-grain-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  // Deterministic noise offset so film grain stays alive and eliminates MP4 banding
  const grainOffsetX = Math.round(noise2D('grain-x', frame * 0.15, 0) * 40);
  const grainOffsetY = Math.round(noise2D('grain-y', 0, frame * 0.15) * 40);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: EDITORIAL_THEME.colors.bg,
        color: EDITORIAL_THEME.colors.fg,
        overflow: 'hidden',
      }}
    >
      {/* Subtle monochrome atmospheric light beams (deterministic Remotion port of Beams.jsx) */}
      <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
        {BEAM_CONFIG.map((beam, idx) => {
          const swayPx = Math.sin(t * beam.freq * 1.4 + beam.phase) * 42;
          const xCenter = beam.baseRatio * EDITORIAL_THEME.layout.width + swayPx;
          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: xCenter - beam.width / 2,
                top: -80,
                width: beam.width,
                height: EDITORIAL_THEME.layout.height + 160,
                background: `linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,${beam.alpha}) 38%, rgba(255,255,255,${beam.alpha * 0.7}) 65%, rgba(255,255,255,0) 100%)`,
                filter: 'blur(26px)',
              }}
            />
          );
        })}

        {/* Soft breathing center monochrome halo */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 960,
            height: 960,
            marginLeft: -480,
            marginTop: -480,
            borderRadius: '50%',
            transform: `scale(${1 + Math.sin(t * 0.8) * 0.04})`,
            background:
              'radial-gradient(circle, rgba(255,255,255,0.085) 0%, rgba(255,255,255,0.02) 45%, rgba(0,0,0,0) 74%)',
            filter: 'blur(42px)',
          }}
        />
      </AbsoluteFill>

      {/* Main scene content */}
      <AbsoluteFill>{children}</AbsoluteFill>

      {/* Top & bottom editorial chrome inside safe area (80px horizontal, 100px vertical) */}
      {showChrome && (
        <>
          <div
            style={{
              position: 'absolute',
              top: 84,
              left: EDITORIAL_THEME.layout.safeX,
              right: EDITORIAL_THEME.layout.safeX,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: 18,
              borderBottom: `1px solid ${EDITORIAL_THEME.colors.hairline}`,
              fontFamily: FONTS.mono,
              fontSize: 20,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: EDITORIAL_THEME.colors.fgMuted,
              pointerEvents: 'none',
            }}
          >
            <span>{sectionCode}</span>
            <span>{sectionLabel}</span>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 84,
              left: EDITORIAL_THEME.layout.safeX,
              right: EDITORIAL_THEME.layout.safeX,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              pointerEvents: 'none',
            }}
          >
            {/* Progress hairline */}
            <div
              style={{
                width: '100%',
                height: 2,
                backgroundColor: EDITORIAL_THEME.colors.hairline,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${progress * 100}%`,
                  backgroundColor: '#ffffff',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontFamily: FONTS.mono,
                fontSize: 18,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: EDITORIAL_THEME.colors.fgMuted,
              }}
            >
              <span>QUICKPILL.NEOSPARKX.COM</span>
              <span>TAURI V2 · RUST · WINDOWS & LINUX</span>
            </div>
          </div>
        </>
      )}

      {/* Subtle animated SVG film grain to eliminate H.264 dark-surface banding */}
      <svg
        width="100%"
        height="100%"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: -60,
          top: -60,
          width: EDITORIAL_THEME.layout.width + 120,
          height: EDITORIAL_THEME.layout.height + 120,
          opacity: 0.035,
          pointerEvents: 'none',
          transform: `translate3d(${grainOffsetX}px, ${grainOffsetY}px, 0)`,
        }}
      >
        <filter id={grainFilterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.82"
            numOctaves={3}
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${grainFilterId})`} />
      </svg>
    </AbsoluteFill>
  );
};
