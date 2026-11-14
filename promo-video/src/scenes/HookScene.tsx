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
import {CameraRig} from '../components/CameraRig';
import {EditorialCanvas} from '../components/EditorialCanvas';
import {KineticHeadline, SupportSubtitle} from '../components/KineticText';
import {STUDIO_SPRINGS} from '../design/physics';
import {EDITORIAL_THEME} from '../design/theme';
import {FONTS} from '../design/typography';

type HookSceneProps = {
  readonly brandName: string;
  readonly versionLabel: string;
  readonly headline: string;
  readonly subtitle: string;
};

const HookSceneInner: React.FC<HookSceneProps> = ({
  brandName,
  versionLabel,
  headline,
  subtitle,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const notchEnter = spring({
    frame,
    fps,
    config: STUDIO_SPRINGS.cinematicHero,
  });
  const notchWidth = interpolate(notchEnter, [0, 1], [160, 400], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const notchOpacity = interpolate(notchEnter, [0, 0.4, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const iconSpring = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: STUDIO_SPRINGS.cinematicHero,
  });
  const iconScale = interpolate(iconSpring, [0, 1], [0.84, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const iconY = interpolate(iconSpring, [0, 1], [42, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const iconBlur = interpolate(iconSpring, [0, 1], [10, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const iconFloat = Math.sin(frame * 0.032) * 4;

  const brandSpring = spring({
    frame: Math.max(0, frame - 32),
    fps,
    config: STUDIO_SPRINGS.cinematicHero,
  });
  const brandY = interpolate(brandSpring, [0, 1], [22, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const brandScale = interpolate(brandSpring, [0, 1], [0.94, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const brandOpacity = interpolate(brandSpring, [0, 0.5, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const metaSpring = spring({
    frame: Math.max(0, frame - 112),
    fps,
    config: STUDIO_SPRINGS.cinematicHero,
  });

  return (
    <EditorialCanvas showChrome={false}>
      <CameraRig
        startZoom={1.06}
        targetZoom={1.0}
        startTiltX={0.8}
        tiltX={0}
        startTiltY={0}
        tiltY={0}
      >
        {/* Centered sculptural hero stage in vertical middle */}
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
            gap: 0,
          }}
        >
          {/* Minimalist Dynamic Island sentinel pill */}
          <div
            style={{
              marginBottom: 42,
              width: notchWidth,
              height: 60,
              borderRadius: 999,
              backgroundColor: '#08080a',
              border: '1px solid rgba(255,255,255,0.24)',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.22), 0 22px 48px rgba(0,0,0,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 26px',
              fontFamily: FONTS.mono,
              fontSize: 20,
              color: '#ffffff',
              opacity: notchOpacity,
            }}
          >
            <span>9:47</span>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 14px #10b981',
              }}
            />
            <span>25°C</span>
          </div>

          {/* App icon + distinct glass brand lockup pill */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 28,
            }}
          >
            <div
              style={{
                width: 184,
                height: 184,
                borderRadius: 42,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.28)',
                boxShadow:
                  '0 34px 90px rgba(0,0,0,0.95), 0 0 80px rgba(255,255,255,0.08)',
                transform: `translate3d(0px, ${iconY + iconFloat}px, 0px) scale(${iconScale})`,
                filter: iconBlur > 0.2 ? `blur(${iconBlur}px)` : undefined,
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
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 16,
                padding: '12px 30px',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.26)',
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 100%)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.22), 0 14px 36px rgba(0,0,0,0.75)',
                transform: `translate3d(0px, ${brandY}px, 0px) scale(${brandScale})`,
                opacity: brandOpacity,
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  backgroundColor: '#60a5fa',
                  boxShadow: '0 0 12px #60a5fa',
                }}
              />
              <span
                style={{
                  fontFamily: FONTS.display,
                  fontSize: 34,
                  fontWeight: 700,
                  letterSpacing: '-0.015em',
                  color: '#ffffff',
                }}
              >
                {brandName}
              </span>
              <span
                style={{
                  width: 1,
                  height: 22,
                  backgroundColor: 'rgba(255,255,255,0.24)',
                }}
              />
              <span
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 19,
                  fontWeight: 500,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.68)',
                }}
              >
                {versionLabel}
              </span>
            </div>
          </div>

          {/* Balanced single display title (intentional 2-line cadence) */}
          <div style={{marginTop: 46}}>
            <KineticHeadline
              text={headline}
              italicWords={['Steroids.']}
              startFrame={58}
              fontSize={92}
              lineHeight={1.08}
              align="center"
            />
          </div>

          <div style={{marginTop: 30, maxWidth: 820}}>
            <SupportSubtitle
              text={subtitle}
              startFrame={90}
              fontSize={42}
              align="center"
            />
          </div>

          <div
            style={{
              marginTop: 40,
              fontFamily: FONTS.mono,
              fontSize: 20,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: EDITORIAL_THEME.colors.fgMuted,
              opacity: interpolate(metaSpring, [0, 1], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            OPEN SOURCE · WINDOWS &amp; LINUX · 16 TOOLS
          </div>
        </div>
      </CameraRig>
    </EditorialCanvas>
  );
};

export const HookScene = Interactive.create({
  Component: HookSceneInner,
  layout: 'absolute-fill',
  schema: {
    brandName: {
      type: 'string',
      default: 'Quick Pill',
      description: 'App brand name',
    },
    versionLabel: {
      type: 'string',
      default: 'v6.0.0',
      description: 'Version label',
    },
    headline: {
      type: 'string',
      default: 'Dynamic Island,\nOn Steroids.',
      description: 'Hero headline',
    },
    subtitle: {
      type: 'string',
      default: 'Open-source productivity notch\nfor Windows & Linux.',
      description: 'Hero subtitle',
    },
  },
});
