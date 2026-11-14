import React from 'react';
import {
  Interactive,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {CameraRig} from '../components/CameraRig';
import {EditorialCanvas} from '../components/EditorialCanvas';
import {EditorialHeader, SupportSubtitle} from '../components/KineticText';
import {STUDIO_EASING, STUDIO_SPRINGS} from '../design/physics';
import {EDITORIAL_THEME} from '../design/theme';
import {FONTS} from '../design/typography';

type ArchitectureProofSceneProps = {
  readonly headline: string;
  readonly subtitle: string;
};

const ArchitectureProofSceneInner: React.FC<ArchitectureProofSceneProps> = ({
  headline,
  subtitle,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const counterProgress = interpolate(frame, [18, 92], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: STUDIO_EASING.expoOut,
  });
  const installerMb = interpolate(counterProgress, [0, 1], [128.9, 3.93], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const barPercent = interpolate(counterProgress, [0, 1], [100, 3.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const metricSpring = spring({
    frame: Math.max(0, frame - 8),
    fps,
    config: STUDIO_SPRINGS.cinematicHero,
  });

  const specSpring = spring({
    frame: Math.max(0, frame - 36),
    fps,
    config: STUDIO_SPRINGS.cinematicHero,
  });

  return (
    <EditorialCanvas showChrome={false}>
      <CameraRig
        startZoom={0.99}
        targetZoom={1.03}
        startTiltX={0.6}
        tiltX={0}
        startTiltY={0}
        tiltY={0}
      >
        {/* Minimal monumental typography centered in vertical middle */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            paddingLeft: EDITORIAL_THEME.layout.safeX,
            paddingRight: EDITORIAL_THEME.layout.safeX,
            paddingBottom: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 56,
          }}
        >
          <div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 8}}>
            <EditorialHeader
              eyebrow="RUST + TAURI V2 ARCHITECTURE"
              headline={headline}
              italicWords={['Rust.']}
              startFrame={4}
              baseFontSize={90}
            />
          </div>

          {/* Floating sculptural size benchmark */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 24,
              width: '100%',
              transform: `translate3d(0px, ${interpolate(
                metricSpring,
                [0, 1],
                [42, 0],
                {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
              )}px, 0px)`,
              filter: `blur(${interpolate(metricSpring, [0, 1], [10, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}px)`,
              opacity: interpolate(metricSpring, [0, 0.5, 1], [0, 1, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center',
                gap: 22,
                fontFamily: FONTS.mono,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span
                style={{
                  fontSize: 164,
                  fontWeight: 700,
                  letterSpacing: '-0.05em',
                  lineHeight: 0.92,
                  color: '#ffffff',
                  textShadow: '0 0 60px rgba(255,255,255,0.22)',
                }}
              >
                {installerMb.toFixed(2)}
              </span>
              <span
                style={{
                  fontSize: 44,
                  fontWeight: 600,
                  color: EDITORIAL_THEME.colors.fgSecondary,
                }}
              >
                MiB
              </span>
            </div>

            {/* Razor-thin glowing beam meter */}
            <div
              style={{
                width: 680,
                height: 6,
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.12)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${barPercent}%`,
                  height: '100%',
                  borderRadius: 999,
                  backgroundColor: '#ffffff',
                  boxShadow: '0 0 24px #ffffff',
                }}
              />
            </div>

            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 22,
                letterSpacing: '0.16em',
                color: EDITORIAL_THEME.colors.fgMuted,
              }}
            >
              97% SMALLER THAN ELECTRON (128.9 MiB)
            </span>
          </div>

          <div style={{maxWidth: 780}}>
            <SupportSubtitle
              text={subtitle}
              startFrame={24}
              fontSize={EDITORIAL_THEME.typeScale.supportCopy}
              align="center"
            />
          </div>

          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 22,
              letterSpacing: '0.2em',
              color: 'rgba(255,255,255,0.58)',
              opacity: interpolate(specSpring, [0, 1], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            WIN32 · WINRT · WASAPI · ZERO BLOAT
          </div>
        </div>
      </CameraRig>
    </EditorialCanvas>
  );
};

export const ArchitectureProofScene = Interactive.create({
  Component: ArchitectureProofSceneInner,
  layout: 'absolute-fill',
  schema: {
    headline: {
      type: 'string',
      default: 'Rebuilt in Rust.',
      description: 'Proof headline',
    },
    subtitle: {
      type: 'string',
      default: 'Native system speed with near-zero memory footprint.',
      description: 'Proof subtitle',
    },
  },
});
