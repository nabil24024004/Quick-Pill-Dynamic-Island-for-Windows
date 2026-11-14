import React from 'react';
import {
  Img,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {CameraRig} from '../components/CameraRig';
import {EditorialCanvas} from '../components/EditorialCanvas';
import {EditorialHeader} from '../components/KineticText';
import {STUDIO_EASING} from '../design/physics';
import {EDITORIAL_THEME} from '../design/theme';
import {FONTS} from '../design/typography';

type ModesSceneProps = {
  readonly headline: string;
  readonly subtitle: string;
};

const MODES = [
  {
    code: '01  ·  STILL MODE',
    caption: 'Quietly anchored at your top screen edge.',
    img: 'modes/still-mode.jpg',
    width: 480,
    start: 0,
    end: 105,
  },
  {
    code: '02  ·  QUICK MODE',
    caption: 'Expands on hover with live ambient stats.',
    img: 'modes/quick-mode.jpg',
    width: 680,
    start: 82,
    end: 196,
  },
  {
    code: '03  ·  LARGE MODE',
    caption: 'Unlocks all 16 workspace utilities.',
    img: 'modes/large-mode.png',
    width: 920,
    start: 174,
    end: 290,
  },
] as const;

const ModesSceneInner: React.FC<ModesSceneProps> = ({headline, subtitle}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

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
        {/* Vertically centered lockup + morphing capsule spotlight */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            paddingLeft: EDITORIAL_THEME.layout.safeX,
            paddingRight: EDITORIAL_THEME.layout.safeX,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 50,
          }}
        >
          <div
            style={{
              width: '100%',
              height: 172,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            <EditorialHeader
              eyebrow="ONE CAPSULE · THREE STATES"
              headline={headline}
              italicWords={['Intent.']}
              startFrame={4}
            />
          </div>

          {/* Single choreographed spotlight where each mode morphs smoothly in place */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 410,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {MODES.map((mode, idx) => {
              const fadeIn =
                idx === 0
                  ? interpolate(frame, [0, 22], [0, 1], {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                      easing: STUDIO_EASING.expoOut,
                    })
                  : interpolate(frame, [mode.start, mode.start + 28], [0, 1], {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                      easing: STUDIO_EASING.expoInOut,
                    });

              const fadeOut =
                idx === MODES.length - 1
                  ? 1
                  : interpolate(frame, [mode.end - 28, mode.end], [1, 0], {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                      easing: STUDIO_EASING.expoInOut,
                    });

              const visibility = Math.min(fadeIn, fadeOut);
              if (visibility <= 0.005) return null;

              const scaleIn = interpolate(fadeIn, [0, 1], [0.88, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              const scaleOut =
                idx === MODES.length - 1
                  ? 1
                  : interpolate(fadeOut, [0, 1], [1.07, 1], {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                    });
              const blurIn = interpolate(fadeIn, [0, 1], [10, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              const blurOut =
                idx === MODES.length - 1
                  ? 0
                  : interpolate(fadeOut, [0, 1], [10, 0], {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                    });
              const breathe =
                1 +
                interpolate(
                  frame,
                  [0, durationInFrames],
                  [0, 0.035],
                  {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
                );
              const beamAngle = (frame * 1.4) % 360;

              return (
                <div
                  key={mode.code}
                  style={{
                    position: 'absolute',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 54,
                    opacity: visibility,
                    transform: `scale(${scaleIn * scaleOut * breathe})`,
                    filter: `blur(${blurIn + blurOut}px)`,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 28,
                      padding: 1.5,
                      background: `conic-gradient(from ${beamAngle}deg, rgba(255,255,255,0.12) 0deg, rgba(255,255,255,0.12) 250deg, rgba(255,255,255,0.8) 335deg, rgba(255,255,255,0.16) 360deg)`,
                      boxShadow:
                        '0 38px 100px rgba(0,0,0,0.95), 0 0 90px rgba(255,255,255,0.08)',
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 26.5,
                        overflow: 'hidden',
                        backgroundColor: '#050505',
                      }}
                    >
                      <Img
                        src={staticFile(mode.img)}
                        style={{
                          width: mode.width,
                          height: 'auto',
                          display: 'block',
                        }}
                      />
                    </div>
                  </div>

                  {/* Morphing active state indicator + single-line whisper */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 16,
                      textAlign: 'center',
                    }}
                  >
                    <span
                      style={{
                        padding: '10px 22px',
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.34)',
                        backgroundColor: 'rgba(255,255,255,0.07)',
                        fontFamily: FONTS.mono,
                        fontSize: 22,
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        color: '#ffffff',
                      }}
                    >
                      {mode.code}
                    </span>
                    <span
                      style={{
                        fontFamily: FONTS.body,
                        fontSize: 44,
                        color: EDITORIAL_THEME.colors.fgSecondary,
                        maxWidth: 780,
                        lineHeight: 1.25,
                      }}
                    >
                      {mode.caption || subtitle}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CameraRig>
    </EditorialCanvas>
  );
};

export const ModesScene = Interactive.create({
  Component: ModesSceneInner,
  layout: 'absolute-fill',
  schema: {
    headline: {
      type: 'string',
      default: 'Adapts to Intent.',
      description: 'Modes headline',
    },
    subtitle: {
      type: 'string',
      default: 'Quiet by default. Instant on hover. Complete on click.',
      description: 'Fallback subtitle',
    },
  },
});
