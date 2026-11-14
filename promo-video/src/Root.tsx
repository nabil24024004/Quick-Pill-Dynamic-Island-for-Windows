import React from 'react';
import {Composition, Folder} from 'remotion';
import {
  PROMO_FPS,
  PROMO_TOTAL_DURATION_FRAMES,
} from './audio/audioManifest';
import {
  QuickPillShowcase,
  QuickPillShowcaseSchema,
} from './QuickPillShowcase';
import {ArchitectureProofScene} from './scenes/ArchitectureProofScene';
import {CtaResolveScene} from './scenes/CtaResolveScene';
import {DualFeatureScene} from './scenes/DualFeatureScene';
import {HookScene} from './scenes/HookScene';
import {ModesScene} from './scenes/ModesScene';
import {VideoFeatureScene} from './scenes/VideoFeatureScene';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="QuickPillShowcase"
        component={QuickPillShowcase}
        durationInFrames={PROMO_TOTAL_DURATION_FRAMES}
        fps={PROMO_FPS}
        width={1080}
        height={1920}
        schema={QuickPillShowcaseSchema}
        defaultProps={{
          versionLabel: 'v6.0.0',
          hookHeadline: 'Dynamic Island,\nOn Steroids.',
          ctaUrl: 'quickpill.neosparkx.com',
          voiceoverVolume: 0.96,
          sfxVolume: 1.0,
          bgmFile: 'audio/bgm/serene-view-showcase.mp3',
          bgmVolume: 0.62,
        }}
      />

      <Folder name="Scenes">
        <Composition
          id="HookScene"
          component={HookScene}
          durationInFrames={420}
          fps={60}
          width={1080}
          height={1920}
          defaultProps={{
            brandName: 'Quick Pill',
            versionLabel: 'v6.0.0',
            headline: 'Dynamic Island,\nOn Steroids.',
            subtitle: 'Open-source productivity notch\nfor Windows & Linux.',
          }}
        />

        <Composition
          id="ModesScene"
          component={ModesScene}
          durationInFrames={290}
          fps={60}
          width={1080}
          height={1920}
          defaultProps={{
            headline: 'Adapts to Intent.',
            subtitle: 'Quiet by default. Instant on hover. Complete on click.',
          }}
        />

        <Composition
          id="VideoFeatureScene"
          component={VideoFeatureScene}
          durationInFrames={260}
          fps={60}
          width={1080}
          height={1920}
          defaultProps={{
            eyebrow: 'TAB 10 · ALT + R',
            headline: 'Deep Focus Timer.',
            italicWord: 'Focus',
            subtitle:
              'Glowing perimeter countdowns that stay gently out of your way.',
            videoSrc: 'videos/timer.mp4',
            trimBeforeSeconds: 6.8,
            clipSpeed: 1.15,
            loopVideo: false,
            viewportHeight: 430,
          }}
        />

        <Composition
          id="DualFeatureScene"
          component={DualFeatureScene}
          durationInFrames={270}
          fps={60}
          width={1080}
          height={1920}
          defaultProps={{
            firstEyebrow: 'TAB 12 · ALT + A',
            firstHeadline: 'Control Per-App Audio.',
            firstItalicWord: 'Audio.',
            firstImageSrc: 'screenshots/audio-mixer.png',
            firstCaption:
              'Control app volume levels & output devices via native WASAPI.',
            secondEyebrow: 'TAB 06 · ALT + G',
            secondHeadline: 'Real-Time Vitals.',
            secondItalicWord: 'Vitals.',
            secondImageSrc: 'screenshots/system-stats.png',
            secondCaption:
              'Monitor live CPU load, memory & battery gauges at a glance.',
          }}
        />

        <Composition
          id="ArchitectureProofScene"
          component={ArchitectureProofScene}
          durationInFrames={240}
          fps={60}
          width={1080}
          height={1920}
          defaultProps={{
            headline: 'Rebuilt in Rust.',
            subtitle: 'Native system speed with near-zero memory footprint.',
          }}
        />

        <Composition
          id="CtaResolveScene"
          component={CtaResolveScene}
          durationInFrames={270}
          fps={60}
          width={1080}
          height={1920}
          defaultProps={{
            brandName: 'Quick Pill',
            versionLabel: 'v6.0.0',
            ctaUrl: 'quickpill.neosparkx.com',
            tagline: 'Your Desktop Reimagined.',
          }}
        />
      </Folder>
    </>
  );
};
