import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {getAmbientDrift, STUDIO_SPRINGS} from '../design/physics';

type CameraRigProps = {
  readonly children: React.ReactNode;
  readonly focusFrame?: number;
  readonly startZoom?: number;
  readonly targetZoom?: number;
  readonly startTiltX?: number;
  readonly tiltX?: number;
  readonly startTiltY?: number;
  readonly tiltY?: number;
  readonly panX?: number;
  readonly panY?: number;
};

/**
 * Virtual 3D camera rig placing scene elements inside a 1600px perspective stage
 * with weighted spring pushes and continuous ambient float.
 */
export const CameraRig: React.FC<CameraRigProps> = ({
  children,
  focusFrame = 0,
  startZoom = 0.99,
  targetZoom = 1.03,
  startTiltX = 0.6,
  tiltX = 0,
  startTiltY = 0,
  tiltY = 0,
  panX = 0,
  panY = 0,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const camProgress = spring({
    frame: Math.max(0, frame - focusFrame),
    fps,
    config: STUDIO_SPRINGS.cameraRig,
  });

  const drift = getAmbientDrift(frame);

  const scale =
    interpolate(camProgress, [0, 1], [startZoom, targetZoom], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) * drift.scale;

  const rotateX = interpolate(camProgress, [0, 1], [startTiltX, tiltX], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const rotateY = interpolate(camProgress, [0, 1], [startTiltY, tiltY], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const tx =
    interpolate(camProgress, [0, 1], [0, panX], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) + drift.x;

  const ty =
    interpolate(camProgress, [0, 1], [0, panY], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) + drift.y;

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        perspective: 1600,
      }}
    >
      <AbsoluteFill
        style={{
          transform: `translate3d(${tx}px, ${ty}px, 0px) scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transformOrigin: '50% 50%',
          transformStyle: 'preserve-3d',
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
