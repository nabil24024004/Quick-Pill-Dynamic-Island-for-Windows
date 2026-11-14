import React from 'react';
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Video} from '@remotion/media';
import {STUDIO_SPRINGS} from '../design/physics';

type DesktopWindowFrameProps = {
  readonly mediaType: 'video' | 'image';
  readonly src: string;
  readonly startFrame?: number;
  readonly trimBeforeSeconds?: number;
  readonly playbackRate?: number;
  readonly loopVideo?: boolean;
  readonly width?: number;
  readonly height?: number;
  readonly showBeam?: boolean;
  readonly tiltDeg?: number;
  readonly zoomEnd?: number;
  readonly objectPosition?: string;
};

/**
 * Frameless 3D obsidian-glass hardware stage focused squarely on the Quick Pill UI.
 * Eliminates fake browser chrome and trims out perimeter desktop icon clutter via
 * intentional macro framing, subtle Ken Burns push, rotating rim sheen, and soft edge vignette.
 */
export const DesktopWindowFrame: React.FC<DesktopWindowFrameProps> = ({
  mediaType,
  src,
  startFrame = 0,
  trimBeforeSeconds = 0,
  playbackRate = 1,
  loopVideo = false,
  width = 940,
  height = 440,
  showBeam = true,
  tiltDeg = 0.8,
  zoomEnd = 1.07,
  objectPosition = '50% 0%',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const enter = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: STUDIO_SPRINGS.cinematicHero,
  });

  const translateY = interpolate(enter, [0, 1], [56, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const enterScale = interpolate(enter, [0, 1], [0.92, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const blur = interpolate(enter, [0, 1], [12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = interpolate(enter, [0, 0.55, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Gentle organic Ken Burns push so the UI continuously feels alive
  const kenBurns = interpolate(
    frame,
    [0, Math.max(1, durationInFrames - 1)],
    [1.0, zoomEnd],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  const floatTilt = tiltDeg + Math.sin(frame * 0.025) * 0.45;
  const beamAngle = (frame * 1.4) % 360;

  return (
    <div
      style={{
        width,
        position: 'relative',
        borderRadius: 30,
        padding: 1.5,
        background: showBeam
          ? `conic-gradient(from ${beamAngle}deg, rgba(255,255,255,0.08) 0deg, rgba(255,255,255,0.08) 250deg, rgba(255,255,255,0.7) 335deg, rgba(255,255,255,0.12) 360deg)`
          : 'rgba(255,255,255,0.18)',
        boxShadow:
          '0 42px 110px -18px rgba(0,0,0,0.95), 0 0 80px rgba(255,255,255,0.06)',
        transform: `translate3d(0px, ${translateY}px, 0px) scale(${enterScale}) rotateX(${floatTilt}deg)`,
        filter: `blur(${blur}px)`,
        opacity,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height,
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
          {mediaType === 'video' ? (
            <Video
              src={staticFile(src)}
              muted
              loop={loopVideo}
              trimBefore={Math.round(trimBeforeSeconds * fps)}
              playbackRate={playbackRate}
              objectFit="cover"
              style={{
                width: '100%',
                height: '100%',
                objectPosition,
                display: 'block',
              }}
            />
          ) : (
            <Img
              src={staticFile(src)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition,
                display: 'block',
              }}
            />
          )}
        </div>

        {/* Soft cinematic inner vignette so desktop edges melt into the obsidian stage */}
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
  );
};
