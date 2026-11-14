import type {TransitionPresentationComponentProps} from '@remotion/transitions';
import type React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {STUDIO_EASING} from '../design/physics';

type Direction = 'from-bottom' | 'from-right' | 'from-left' | 'from-top' | 'depth';

type MotionSlideProps = {
  readonly direction?: Direction;
};

/**
 * Silky Apple/Linear-grade 3D depth dissolve & gentle parallax glide.
 * Uses subtle spatial travel + Z-scale breathe + soft optical dissolve so scenes
 * flow smoothly without harsh linear swipes or jarring flashes.
 */
export const MotionSlidePresentation: React.FC<
  TransitionPresentationComponentProps<MotionSlideProps>
> = ({children, presentationDirection, presentationProgress, passedProps}) => {
  const direction = passedProps.direction ?? 'from-bottom';
  const eased = STUDIO_EASING.expoInOut(
    Math.min(1, Math.max(0, presentationProgress)),
  );

  const blurPx = interpolate(
    eased,
    [0, 0.35, 0.5, 0.65, 1],
    [0, 3.5, 6, 3.5, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  const glidePct = 6;
  const axisOffset = (progress: number, isEntering: boolean) => {
    if (direction === 'depth') return '0% 0%';
    const factor = isEntering ? 1 - progress : -progress;
    const shift = factor * glidePct;
    if (direction === 'from-bottom') return `0% ${shift}%`;
    if (direction === 'from-top') return `0% ${-shift}%`;
    if (direction === 'from-right') return `${shift}% 0%`;
    return `${-shift}% 0%`;
  };

  if (presentationDirection === 'exiting') {
    const exitScale = interpolate(eased, [0, 1], [1, 1.03], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const exitOpacity = interpolate(eased, [0, 0.15, 0.82, 1], [1, 0.94, 0.08, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    return (
      <AbsoluteFill
        style={{
          translate: axisOffset(eased, false),
          scale: exitScale,
          opacity: exitOpacity,
          filter: blurPx > 0.25 ? `blur(${blurPx}px)` : undefined,
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }

  const enterScale = interpolate(eased, [0, 1], [1.04, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const enterOpacity = interpolate(eased, [0, 0.15, 0.88, 1], [0, 0.1, 0.96, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        translate: axisOffset(eased, true),
        scale: enterScale,
        opacity: enterOpacity,
        filter: blurPx > 0.25 ? `blur(${blurPx}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
