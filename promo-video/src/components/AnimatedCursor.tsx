import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {STUDIO_SPRINGS} from '../design/physics';

type AnimatedCursorProps = {
  readonly startX: number;
  readonly startY: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly moveStartFrame: number;
  readonly clickFrame?: number;
  readonly fadeOutFrame?: number;
};

/**
 * Deterministic vector cursor with spring spline motion, click squeeze,
 * and monochrome expanding ripple ring.
 */
export const AnimatedCursor: React.FC<AnimatedCursorProps> = ({
  startX,
  startY,
  targetX,
  targetY,
  moveStartFrame,
  clickFrame,
  fadeOutFrame,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const moveProgress = spring({
    frame: Math.max(0, frame - moveStartFrame),
    fps,
    config: STUDIO_SPRINGS.cameraRig,
  });

  const x = interpolate(moveProgress, [0, 1], [startX, targetX], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(moveProgress, [0, 1], [startY, targetY], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const enterOpacity = interpolate(
    frame,
    [moveStartFrame, moveStartFrame + 10],
    [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  const exitOpacity =
    fadeOutFrame !== undefined
      ? interpolate(frame, [fadeOutFrame, fadeOutFrame + 12], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1;
  const opacity = enterOpacity * exitOpacity;

  let clickScale = 1;
  let rippleScale = 0.4;
  let rippleOpacity = 0;

  if (clickFrame !== undefined && frame >= clickFrame) {
    const dt = frame - clickFrame;
    clickScale = interpolate(dt, [0, 4, 10], [1, 0.8, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const rippleSpring = spring({
      frame: dt,
      fps,
      config: STUDIO_SPRINGS.snappyUI,
    });
    rippleScale = interpolate(rippleSpring, [0, 1], [0.4, 2.8], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    rippleOpacity = interpolate(dt, [0, 4, 24], [0.9, 0.75, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `translate3d(${x}px, ${y}px, 0)`,
        opacity,
        pointerEvents: 'none',
        zIndex: 60,
      }}
    >
      {/* Click Ripple Ring */}
      {rippleOpacity > 0.01 && (
        <div
          style={{
            position: 'absolute',
            left: -24,
            top: -24,
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.9)',
            boxShadow: '0 0 18px rgba(255, 255, 255, 0.45)',
            transform: `scale(${rippleScale})`,
            opacity: rippleOpacity,
          }}
        />
      )}

      {/* High-contrast crisp vector arrow */}
      <svg
        width="38"
        height="38"
        viewBox="0 0 28 28"
        style={{
          transform: `scale(${clickScale})`,
          transformOrigin: '4px 3px',
          filter: 'drop-shadow(0 6px 14px rgba(0, 0, 0, 0.85))',
        }}
      >
        <path
          d="M5 3L22 14.5L13.8 16.2L10.5 24L5 3Z"
          fill="#FFFFFF"
          stroke="#000000"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
