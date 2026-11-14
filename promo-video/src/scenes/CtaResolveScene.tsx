import React from 'react';
import {
  Img,
  Interactive,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Download} from 'lucide-react';
import {CameraRig} from '../components/CameraRig';
import {EditorialCanvas} from '../components/EditorialCanvas';
import {KineticHeadline, SupportSubtitle} from '../components/KineticText';
import {STUDIO_EASING, STUDIO_SPRINGS} from '../design/physics';
import {EDITORIAL_THEME} from '../design/theme';
import {FONTS} from '../design/typography';

type CtaResolveSceneProps = {
  readonly brandName: string;
  readonly versionLabel: string;
  readonly ctaUrl: string;
  readonly tagline: string;
};

const CtaResolveSceneInner: React.FC<CtaResolveSceneProps> = ({
  brandName,
  versionLabel,
  ctaUrl,
  tagline,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const iconSpring = spring({
    frame,
    fps,
    config: STUDIO_SPRINGS.cinematicHero,
  });

  const sweepX = interpolate(frame, [24, 92], [-260, 320], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: STUDIO_EASING.expoInOut,
  });

  const ctaSpring = spring({
    frame: Math.max(0, frame - 24),
    fps,
    config: STUDIO_SPRINGS.cinematicHero,
  });
  const ctaPulse = 1 + Math.sin(frame * 0.06) * 0.01;

  return (
    <EditorialCanvas showChrome={false}>
      <CameraRig
        startZoom={1.05}
        targetZoom={1.0}
        startTiltX={-0.6}
        tiltX={0}
        startTiltY={0}
        tiltY={0}
      >
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
            textAlign: 'center',
            gap: 42,
          }}
        >
          {/* Floating app emblem */}
          <div
            style={{
              position: 'relative',
              width: 236,
              height: 236,
              borderRadius: 54,
              overflow: 'hidden',
              border: '1.5px solid rgba(255,255,255,0.32)',
              boxShadow:
                '0 38px 100px rgba(0,0,0,0.95), 0 0 90px rgba(255,255,255,0.08)',
              transform: `translate3d(0px, ${interpolate(
                iconSpring,
                [0, 1],
                [42, 0],
                {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
              )}px, 0px) scale(${interpolate(iconSpring, [0, 1], [0.82, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })})`,
              filter: `blur(${interpolate(iconSpring, [0, 1], [12, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}px)`,
              opacity: interpolate(iconSpring, [0, 0.5, 1], [0, 1, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            <Img
              src={staticFile('brand/icon.png')}
              style={{width: '100%', height: '100%', objectFit: 'cover'}}
            />
            <div
              style={{
                position: 'absolute',
                inset: -40,
                background:
                  'linear-gradient(115deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 65%)',
                transform: `translate3d(${sweepX}px, 0px, 0px)`,
                pointerEvents: 'none',
              }}
            />
          </div>

          <KineticHeadline
            text={brandName}
            italicWords={['Pill']}
            startFrame={10}
            fontSize={112}
            align="center"
          />

          <div style={{maxWidth: 780}}>
            <SupportSubtitle
              text={tagline}
              startFrame={18}
              fontSize={46}
              align="center"
            />
          </div>

          {/* Luminous monochrome CTA pill */}
          <div
            style={{
              marginTop: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 18,
              padding: '28px 46px',
              borderRadius: 999,
              backgroundColor: '#ffffff',
              color: '#000000',
              boxShadow: '0 24px 70px rgba(255,255,255,0.2)',
              transform: `scale(${
                interpolate(ctaSpring, [0, 1], [0.88, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }) * ctaPulse
              }) translate3d(0px, ${interpolate(ctaSpring, [0, 1], [28, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}px, 0px)`,
              opacity: interpolate(ctaSpring, [0, 0.5, 1], [0, 1, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            <Download size={32} strokeWidth={2.4} />
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {ctaUrl}
            </span>
          </div>

          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 21,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: EDITORIAL_THEME.colors.fgMuted,
            }}
          >
            {versionLabel} · 16 TOOLS · OPEN SOURCE · WINDOWS & LINUX
          </div>
        </div>
      </CameraRig>
    </EditorialCanvas>
  );
};

export const CtaResolveScene = Interactive.create({
  Component: CtaResolveSceneInner,
  layout: 'absolute-fill',
  schema: {
    brandName: {
      type: 'string',
      default: 'Quick Pill',
      description: 'Product name',
    },
    versionLabel: {
      type: 'string',
      default: 'v6.0.0',
      description: 'Version string',
    },
    ctaUrl: {
      type: 'string',
      default: 'quickpill.neosparkx.com',
      description: 'Website / CTA URL',
    },
    tagline: {
      type: 'string',
      default: 'Your Desktop Reimagined.',
      description: 'Closing tagline',
    },
  },
});
