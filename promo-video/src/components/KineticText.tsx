import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {STUDIO_SPRINGS, WORD_STAGGER_FRAMES} from '../design/physics';
import {EDITORIAL_THEME} from '../design/theme';
import {FONTS} from '../design/typography';

type KineticHeadlineProps = {
  readonly text: string;
  readonly italicWords?: readonly string[];
  readonly startFrame?: number;
  readonly fontSize?: number;
  readonly lineHeight?: number;
  readonly letterSpacing?: string;
  readonly align?: 'left' | 'center';
};

/**
 * Computes an optical single-line font size for feature titles so every scene
 * fits cleanly inside the 940px stage axis without orphan wraps or vertical jitter.
 */
export const fitFeatureTitleSize = (headline: string, baseSize = 86): number => {
  const len = headline.replace(/\n/g, ' ').trim().length;
  if (len <= 18) return baseSize;
  if (len <= 20) return Math.min(baseSize, 80);
  if (len <= 23) return Math.min(baseSize, 74);
  return Math.min(baseSize, 66);
};

/**
 * Multi-channel (opacity + Y + scale + blur) word-staggered Playfair Display headline.
 * Supports explicit `\n` line breaks so centered multi-line compositions stay balanced.
 */
export const KineticHeadline: React.FC<KineticHeadlineProps> = ({
  text,
  italicWords = [],
  startFrame = 0,
  fontSize = EDITORIAL_THEME.typeScale.sceneHeadline,
  lineHeight = 1.06,
  letterSpacing = '-0.025em',
  align = 'left',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lines = text.split('\n');
  const italicSet = new Set(italicWords.map((w) => w.toLowerCase()));
  let globalWordIdx = 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        gap: '0.08em',
        fontFamily: FONTS.display,
        fontSize,
        fontWeight: 700,
        lineHeight,
        letterSpacing,
        color: EDITORIAL_THEME.colors.fg,
        textAlign: align,
      }}
    >
      {lines.map((lineText, lineIdx) => {
        const words = lineText.trim().split(/\s+/).filter(Boolean);
        return (
          <div
            key={`line-${lineIdx}`}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: align === 'center' ? 'center' : 'flex-start',
              alignItems: 'baseline',
              columnGap: '0.24em',
              rowGap: '0.06em',
            }}
          >
            {words.map((word) => {
              const wordIdx = globalWordIdx;
              globalWordIdx += 1;
              const clean = word.replace(/[.,!?—]/g, '').toLowerCase();
              const isItalic = italicSet.has(clean) || italicSet.has(word.toLowerCase());
              const delay = startFrame + wordIdx * WORD_STAGGER_FRAMES;

              const p = spring({
                frame: Math.max(0, frame - delay),
                fps,
                config: STUDIO_SPRINGS.snappyUI,
              });

              const y = interpolate(p, [0, 1], [38, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              const scale = interpolate(p, [0, 1], [0.92, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              const blur = interpolate(p, [0, 1], [10, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });
              const opacity = interpolate(p, [0, 0.65, 1], [0, 1, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              });

              return (
                <span
                  key={`${word}-${wordIdx}`}
                  style={{
                    display: 'inline-block',
                    paddingInline: isItalic ? '0.03em' : undefined,
                    fontFamily: isItalic ? FONTS.displayItalic : FONTS.display,
                    fontStyle: isItalic ? 'italic' : 'normal',
                    color: isItalic ? 'rgba(255, 255, 255, 0.90)' : '#ffffff',
                    textShadow: '0 8px 34px rgba(0, 0, 0, 0.55)',
                    transform: `translate3d(0px, ${y}px, 0px) scale(${scale})`,
                    filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
                    opacity,
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

type EditorialHeaderProps = {
  readonly eyebrow: string;
  readonly headline: string;
  readonly italicWords?: readonly string[];
  readonly startFrame?: number;
  readonly eyebrowOpacity?: number;
  readonly baseFontSize?: number;
};

/**
 * Unified centered pill-eyebrow + optically fitted single-line editorial header
 * shared across showcase scenes so every cut keeps identical typographic alignment.
 */
export const EditorialHeader: React.FC<EditorialHeaderProps> = ({
  eyebrow,
  headline,
  italicWords = [],
  startFrame = 4,
  eyebrowOpacity,
  baseFontSize = 86,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const eySpring = spring({
    frame,
    fps,
    config: STUDIO_SPRINGS.cinematicHero,
  });
  const computedEyOpacity =
    eyebrowOpacity ??
    interpolate(eySpring, [0, 1], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 24,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 22px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.18)',
          backgroundColor: 'rgba(255,255,255,0.045)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
          opacity: computedEyOpacity,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.72)',
          }}
        >
          {eyebrow}
        </span>
      </div>

      <KineticHeadline
        text={headline}
        italicWords={italicWords}
        startFrame={startFrame}
        fontSize={fitFeatureTitleSize(headline, baseFontSize)}
        align="center"
      />
    </div>
  );
};

type SupportSubtitleProps = {
  readonly text: string;
  readonly startFrame?: number;
  readonly fontSize?: number;
  readonly align?: 'left' | 'center';
};

export const SupportSubtitle: React.FC<SupportSubtitleProps> = ({
  text,
  startFrame = 8,
  fontSize = EDITORIAL_THEME.typeScale.supportCopy,
  align = 'left',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const p = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: STUDIO_SPRINGS.cinematicHero,
  });

  const y = interpolate(p, [0, 1], [28, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const blur = interpolate(p, [0, 1], [8, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = interpolate(p, [0, 0.6, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lines = text.split('\n');

  return (
    <p
      style={{
        margin: 0,
        textAlign: align,
        fontFamily: FONTS.body,
        fontSize,
        fontWeight: 400,
        lineHeight: 1.28,
        letterSpacing: '-0.01em',
        color: EDITORIAL_THEME.colors.fgSecondary,
        transform: `translate3d(0px, ${y}px, 0px)`,
        filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
        opacity,
      }}
    >
      {lines.map((line, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <br />}
          {line}
        </React.Fragment>
      ))}
    </p>
  );
};

type KeycapBadgeProps = {
  readonly label: string;
  readonly tag?: string;
  readonly startFrame?: number;
  readonly inverted?: boolean;
};

export const KeycapBadge: React.FC<KeycapBadgeProps> = ({
  label,
  tag,
  startFrame = 0,
  inverted = false,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const p = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: STUDIO_SPRINGS.elasticPop,
  });

  const scale = interpolate(p, [0, 1], [0.78, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(p, [0, 1], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const blur = interpolate(p, [0, 1], [6, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14,
        transform: `translate3d(0px, ${y}px, 0px) scale(${scale})`,
        filter: `blur(${blur}px)`,
        opacity: interpolate(p, [0, 0.5, 1], [0, 1, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '10px 22px',
          borderRadius: 10,
          background: inverted
            ? '#ffffff'
            : 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 100%)',
          color: inverted ? '#000000' : '#ffffff',
          border: inverted
            ? '1px solid #ffffff'
            : '1px solid rgba(255,255,255,0.34)',
          boxShadow: inverted
            ? '0 10px 28px rgba(255,255,255,0.18)'
            : 'inset 0 1px 0 rgba(255,255,255,0.38), 0 8px 24px rgba(0,0,0,0.65)',
          fontFamily: FONTS.mono,
          fontSize: EDITORIAL_THEME.typeScale.keycapMono,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>

      {tag && (
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: EDITORIAL_THEME.colors.fgMuted,
          }}
        >
          {tag}
        </span>
      )}
    </div>
  );
};
