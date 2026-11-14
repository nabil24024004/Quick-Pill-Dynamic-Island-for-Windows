import React from 'react';
import {Interactive} from 'remotion';
import {CameraRig} from '../components/CameraRig';
import {DesktopWindowFrame} from '../components/DesktopWindowFrame';
import {EditorialCanvas} from '../components/EditorialCanvas';
import {EditorialHeader, SupportSubtitle} from '../components/KineticText';
import {EDITORIAL_THEME} from '../design/theme';

type VideoFeatureSceneProps = {
  readonly eyebrow: string;
  readonly headline: string;
  readonly italicWord: string;
  readonly subtitle: string;
  readonly videoSrc: string;
  readonly trimBeforeSeconds: number;
  readonly clipSpeed: number;
  readonly loopVideo: boolean;
  readonly viewportHeight: number;
};

const VideoFeatureSceneInner: React.FC<VideoFeatureSceneProps> = ({
  eyebrow,
  headline,
  italicWord,
  subtitle,
  videoSrc,
  trimBeforeSeconds,
  clipSpeed,
  loopVideo,
  viewportHeight,
}) => {
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
        {/* Fixed-axis showcase column so header, 940px stage, and subtitle never jump between cuts */}
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
              eyebrow={eyebrow}
              headline={headline}
              italicWords={[italicWord]}
              startFrame={4}
            />
          </div>

          {/* Pure frameless macro viewport locked on consistent 430px stage */}
          <div
            style={{
              height: 430,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DesktopWindowFrame
              mediaType="video"
              src={videoSrc}
              startFrame={6}
              trimBeforeSeconds={trimBeforeSeconds}
              playbackRate={clipSpeed}
              loopVideo={loopVideo}
              width={940}
              height={viewportHeight}
              showBeam
              tiltDeg={0.6}
              zoomEnd={1.06}
            />
          </div>

          <div
            style={{
              maxWidth: 820,
              height: 112,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
            }}
          >
            <SupportSubtitle
              text={subtitle}
              startFrame={14}
              fontSize={EDITORIAL_THEME.typeScale.supportCopy}
              align="center"
            />
          </div>
        </div>
      </CameraRig>
    </EditorialCanvas>
  );
};

export const VideoFeatureScene = Interactive.create({
  Component: VideoFeatureSceneInner,
  layout: 'absolute-fill',
  schema: {
    eyebrow: {
      type: 'string',
      default: 'TAB 02 · ALT + O',
      description: 'Micro eyebrow label',
    },
    headline: {
      type: 'string',
      default: 'StandBy, Built In.',
      description: 'Scene headline',
    },
    italicWord: {
      type: 'string',
      default: 'Built',
      description: 'Italic emphasis word',
    },
    subtitle: {
      type: 'string',
      default: 'Analog clock and live forecast pinned flush to your bezel.',
      description: 'Supporting subtitle',
    },
    videoSrc: {
      type: 'asset',
      assetType: 'video',
      default: 'videos/overview-tab.mp4',
      description: 'Desktop capture video',
    },
    trimBeforeSeconds: {
      type: 'number',
      default: 0,
      min: 0,
      step: 0.1,
      description: 'Trim before (seconds)',
      hiddenFromList: false,
    },
    clipSpeed: {
      type: 'number',
      default: 0.85,
      min: 0.2,
      max: 3,
      step: 0.05,
      description: 'Playback speed',
      hiddenFromList: false,
    },
    loopVideo: {
      type: 'boolean',
      default: true,
      description: 'Loop video clip',
    },
    viewportHeight: {
      type: 'number',
      default: 430,
      min: 320,
      max: 520,
      step: 10,
      description: 'Frameless viewport height',
      hiddenFromList: false,
    },
  },
});
