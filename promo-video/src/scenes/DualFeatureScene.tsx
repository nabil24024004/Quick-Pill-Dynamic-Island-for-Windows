import React from 'react';
import {
  Interactive,
  interpolate,
  staticFile,
  Img,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {CameraRig} from '../components/CameraRig';
import {EditorialCanvas} from '../components/EditorialCanvas';
import {EditorialHeader} from '../components/KineticText';
import {STUDIO_EASING} from '../design/physics';
import {EDITORIAL_THEME} from '../design/theme';
import {FONTS} from '../design/typography';

type DualFeatureSceneProps = {
  readonly firstEyebrow: string;
  readonly firstHeadline: string;
  readonly firstItalicWord: string;
  readonly firstImageSrc: string;
  readonly firstCaption: string;
  readonly secondEyebrow: string;
  readonly secondHeadline: string;
  readonly secondItalicWord: string;
  readonly secondImageSrc: string;
  readonly secondCaption: string;
};

/**
 * Choreographed Solo-Spotlight Handoff Scene:
 * Eliminates dual-window screenshot clutter by giving each feature the full hero
 * stage one at a time, connected by an unhurried 36-frame depth cross-glide.
 */
const DualFeatureSceneInner: React.FC<DualFeatureSceneProps> = ({
  firstEyebrow,
  firstHeadline,
  firstItalicWord,
  firstImageSrc,
  firstCaption,
  secondEyebrow,
  secondHeadline,
  secondItalicWord,
  secondImageSrc,
  secondCaption,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  const handoffStart = Math.round(durationInFrames * 0.44);
  const handoffEnd = Math.round(durationInFrames * 0.58);

  const modules = [
    {
      eyebrow: firstEyebrow,
      headline: firstHeadline,
      italicWord: firstItalicWord,
      imageSrc: firstImageSrc,
      caption: firstCaption,
      isFirst: true,
    },
    {
      eyebrow: secondEyebrow,
      headline: secondHeadline,
      italicWord: secondItalicWord,
      imageSrc: secondImageSrc,
      caption: secondCaption,
      isFirst: false,
    },
  ];

  const beamAngle = (frame * 1.4) % 360;

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
        {modules.map((mod) => {
          const visibility = mod.isFirst
            ? interpolate(frame, [handoffStart, handoffEnd], [1, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: STUDIO_EASING.expoInOut,
              })
            : interpolate(frame, [handoffStart, handoffEnd], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: STUDIO_EASING.expoInOut,
              });

          if (visibility <= 0.005) return null;

          const scale = mod.isFirst
            ? interpolate(frame, [handoffStart, handoffEnd], [1, 0.94], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: STUDIO_EASING.expoInOut,
              })
            : interpolate(frame, [handoffStart, handoffEnd], [1.04, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: STUDIO_EASING.expoInOut,
              });

          const yShift = mod.isFirst
            ? interpolate(frame, [handoffStart, handoffEnd], [0, -28], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: STUDIO_EASING.expoInOut,
              })
            : interpolate(frame, [handoffStart, handoffEnd], [28, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: STUDIO_EASING.expoInOut,
              });

          const blurPx = interpolate(visibility, [0, 1], [10, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          const kenBurns = mod.isFirst
            ? interpolate(frame, [0, handoffEnd], [1.0, 1.05], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })
            : interpolate(frame, [handoffStart, durationInFrames], [1.0, 1.05], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });

          return (
            <div
              key={mod.eyebrow}
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
                opacity: visibility,
                transform: `translate3d(0px, ${yShift}px, 0px) scale(${scale})`,
                filter: blurPx > 0.25 ? `blur(${blurPx}px)` : undefined,
              }}
            >
              {/* Locked-height header matching VideoFeatureScene so cross-glides never jump */}
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
                  eyebrow={mod.eyebrow}
                  headline={mod.headline}
                  italicWords={[mod.italicWord]}
                  startFrame={0}
                  eyebrowOpacity={1}
                />
              </div>

              {/* Single monumental frameless Quick Pill macro stage */}
              <div
                style={{
                  height: 430,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 940,
                    borderRadius: 30,
                    padding: 1.5,
                    background: `conic-gradient(from ${beamAngle}deg, rgba(255,255,255,0.08) 0deg, rgba(255,255,255,0.08) 250deg, rgba(255,255,255,0.72) 335deg, rgba(255,255,255,0.12) 360deg)`,
                    boxShadow:
                      '0 42px 110px -18px rgba(0,0,0,0.95), 0 0 80px rgba(255,255,255,0.06)',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: 430,
                      borderRadius: 28.5,
                      overflow: 'hidden',
                      backgroundColor: '#050505',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        transform: `scale(${kenBurns})`,
                        transformOrigin: '50% 18%',
                      }}
                    >
                      <Img
                        src={staticFile(mod.imageSrc)}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: '50% 0%',
                          display: 'block',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        background:
                          'linear-gradient(90deg, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0) 11%, rgba(0,0,0,0) 89%, rgba(0,0,0,0.52) 100%), linear-gradient(180deg, rgba(0,0,0,0) 68%, rgba(0,0,0,0.58) 100%)',
                        boxShadow: 'inset 0 0 28px rgba(0,0,0,0.6)',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Locked-height bottom caption slot */}
              <div
                style={{
                  maxWidth: 820,
                  height: 112,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    textAlign: 'center',
                    fontFamily: FONTS.body,
                    fontSize: EDITORIAL_THEME.typeScale.supportCopy,
                    lineHeight: 1.28,
                    color: EDITORIAL_THEME.colors.fgSecondary,
                  }}
                >
                  {mod.caption}
                </p>
              </div>
            </div>
          );
        })}
      </CameraRig>
    </EditorialCanvas>
  );
};

export const DualFeatureScene = Interactive.create({
  Component: DualFeatureSceneInner,
  layout: 'absolute-fill',
  schema: {
    firstEyebrow: {
      type: 'string',
      default: 'TAB 12 · ALT + A',
      description: 'First module eyebrow',
    },
    firstHeadline: {
      type: 'string',
      default: 'Control Per-App Audio.',
      description: 'First module headline',
    },
    firstItalicWord: {
      type: 'string',
      default: 'Audio.',
      description: 'First headline italic word',
    },
    firstImageSrc: {
      type: 'asset',
      assetType: 'image',
      default: 'screenshots/audio-mixer.png',
      description: 'First module screenshot',
    },
    firstCaption: {
      type: 'string',
      default: 'Control individual app volume & outputs via native WASAPI.',
      description: 'First module caption',
    },
    secondEyebrow: {
      type: 'string',
      default: 'TAB 06 · ALT + G',
      description: 'Second module eyebrow',
    },
    secondHeadline: {
      type: 'string',
      default: 'Real-Time Vitals.',
      description: 'Second module headline',
    },
    secondItalicWord: {
      type: 'string',
      default: 'Vitals.',
      description: 'Second headline italic word',
    },
    secondImageSrc: {
      type: 'asset',
      assetType: 'image',
      default: 'screenshots/system-stats.png',
      description: 'Second module screenshot',
    },
    secondCaption: {
      type: 'string',
      default: 'Monitor CPU load, memory pressure & battery state at a glance.',
      description: 'Second module caption',
    },
  },
});
