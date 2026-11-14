import React from 'react';
import {Audio} from '@remotion/media';
import {linearTiming, springTiming, TransitionSeries} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {
  AbsoluteFill,
  interpolate,
  staticFile,
  Track,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {z} from 'zod';
import {
  EDITORIAL_SFX_CUES,
  PROMO_TOTAL_DURATION_FRAMES,
  PROMO_TRANSITION_FRAMES,
  SCENE_AUDIO,
} from './audio/audioManifest';
import {MotionSlidePresentation} from './components/MotionSlidePresentation';
import {ArchitectureProofScene} from './scenes/ArchitectureProofScene';
import {CtaResolveScene} from './scenes/CtaResolveScene';
import {DualFeatureScene} from './scenes/DualFeatureScene';
import {HookScene} from './scenes/HookScene';
import {ModesScene} from './scenes/ModesScene';
import {VideoFeatureScene} from './scenes/VideoFeatureScene';

export const QuickPillShowcaseSchema = z.object({
  versionLabel: z.string(),
  hookHeadline: z.string(),
  ctaUrl: z.string(),
  voiceoverVolume: z.number().min(0).max(1),
  sfxVolume: z.number().min(0).max(1),
  bgmFile: z.string(),
  bgmVolume: z.number().min(0).max(1),
});

export type QuickPillShowcaseProps = z.infer<typeof QuickPillShowcaseSchema>;

const TRANSITION_FRAMES = PROMO_TRANSITION_FRAMES;

export const QuickPillShowcase: React.FC<QuickPillShowcaseProps> = ({
  versionLabel,
  hookHeadline,
  ctaUrl,
  voiceoverVolume,
  sfxVolume,
  bgmFile,
  bgmVolume,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const outroCue = EDITORIAL_SFX_CUES.find((c) => c.id === 'sfx-outro-resolve');
  const outroStart = outroCue?.from ?? PROMO_TOTAL_DURATION_FRAMES - 214;
  const outroEnd = outroStart + (outroCue?.durationFrames ?? 214);
  const outroSfxEnvelope =
    interpolate(frame, [outroStart, outroStart + 36], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) *
    interpolate(frame, [outroEnd - 48, outroEnd], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  const atmosphereSfxCues = EDITORIAL_SFX_CUES.filter(
    (cue) => cue.track === 'atmosphere',
  );
  const accentSfxCues = EDITORIAL_SFX_CUES.filter(
    (cue) => cue.track === 'accents',
  );

  const glideUp = {
    component: MotionSlidePresentation,
    props: {direction: 'from-bottom' as const},
  };
  const glideRight = {
    component: MotionSlidePresentation,
    props: {direction: 'from-right' as const},
  };
  const glideLeft = {
    component: MotionSlidePresentation,
    props: {direction: 'from-left' as const},
  };
  const glideDepth = {
    component: MotionSlidePresentation,
    props: {direction: 'depth' as const},
  };

  const smoothGlideTiming = linearTiming({durationInFrames: TRANSITION_FRAMES});
  const smoothFadeTiming = springTiming({
    config: {damping: 32, stiffness: 95, mass: 1},
    durationInFrames: TRANSITION_FRAMES,
  });

  const activeSpeechGain = Object.values(SCENE_AUDIO).reduce((duck, scene) => {
    const voStart = scene.startFrame + scene.voDelayFrames;
    const voEnd = voStart + scene.audioFrames;
    const attack = interpolate(frame, [voStart - 12, voStart], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const release = interpolate(frame, [voEnd, voEnd + 18], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const active = Math.min(attack, release);
    return Math.min(duck, 1 - 0.4 * active);
  }, 1);

  const bgmEnvelope =
    interpolate(frame, [0, 0.25 * fps], [0.82, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) *
    interpolate(
      frame,
      [durationInFrames - 1.6 * fps, durationInFrames],
      [1, 0],
      {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
    ) *
    activeSpeechGain;

  // Soft 8-frame ramp on the opening VO so voice glides gently over the BGM groove.
  const introVoFadeIn = interpolate(
    frame,
    [
      SCENE_AUDIO['01-hook'].voDelayFrames,
      SCENE_AUDIO['01-hook'].voDelayFrames + 8,
    ],
    [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  return (
    <AbsoluteFill style={{backgroundColor: '#000000'}}>
      <TransitionSeries name="Quick Pill 9:16 Brand Showcase">
        {/* 01. Hook */}
        <TransitionSeries.Sequence
          name="01 Hook"
          durationInFrames={SCENE_AUDIO['01-hook'].durationFrames}
        >
          <HookScene
            name="Hook Scene"
            brandName="Quick Pill"
            versionLabel={versionLabel}
            headline={hookHeadline}
            subtitle={'Open-source productivity notch\nfor Windows & Linux.'}
          />
          <Audio
            name="01 Hook VO"
            src={staticFile(SCENE_AUDIO['01-hook'].src)}
            from={SCENE_AUDIO['01-hook'].voDelayFrames}
            volume={voiceoverVolume * introVoFadeIn}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={glideDepth}
          timing={smoothGlideTiming}
        />

        {/* 02. Modes Morph */}
        <TransitionSeries.Sequence
          name="02 Modes Morph"
          durationInFrames={SCENE_AUDIO['02-modes'].durationFrames}
        >
          <ModesScene
            name="Modes Scene"
            headline="Adapts to Intent."
            subtitle="Quiet by default. Instant on hover. Complete on click."
          />
          <Audio
            name="02 Modes Morph VO"
            src={staticFile(SCENE_AUDIO['02-modes'].src)}
            from={SCENE_AUDIO['02-modes'].voDelayFrames}
            volume={voiceoverVolume}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={glideUp}
          timing={smoothGlideTiming}
        />

        {/* 03. StandBy Overview Video */}
        <TransitionSeries.Sequence
          name="03 StandBy Overview"
          durationInFrames={SCENE_AUDIO['03-standby'].durationFrames}
        >
          <VideoFeatureScene
            name="Overview Video Scene"
            eyebrow="TAB 02 · ALT + O"
            headline="StandBy, Built In."
            italicWord="Built"
            subtitle="Analog clock and live weather forecast pinned flush to your bezel."
            videoSrc="videos/overview-tab.mp4"
            trimBeforeSeconds={0}
            clipSpeed={0.8}
            loopVideo
            viewportHeight={430}
          />
          <Audio
            name="03 StandBy Overview VO"
            src={staticFile(SCENE_AUDIO['03-standby'].src)}
            from={SCENE_AUDIO['03-standby'].voDelayFrames}
            volume={voiceoverVolume}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={glideRight}
          timing={smoothGlideTiming}
        />

        {/* 04. Now Playing Video */}
        <TransitionSeries.Sequence
          name="04 Live Media"
          durationInFrames={SCENE_AUDIO['04-media'].durationFrames}
        >
          <VideoFeatureScene
            name="Now Playing Video Scene"
            eyebrow="TAB 03 · ALT + M"
            headline="Live Media Control."
            italicWord="Media"
            subtitle="Control tracks and scrub waveforms effortlessly via WinRT SMTC."
            videoSrc="videos/now-playing.mp4"
            trimBeforeSeconds={0}
            clipSpeed={1.0}
            loopVideo={false}
            viewportHeight={430}
          />
          <Audio
            name="04 Live Media VO"
            src={staticFile(SCENE_AUDIO['04-media'].src)}
            from={SCENE_AUDIO['04-media'].voDelayFrames}
            volume={voiceoverVolume}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={glideDepth}
          timing={smoothGlideTiming}
        />

        {/* 05. Focus Timer Video */}
        <TransitionSeries.Sequence
          name="05 Deep Focus Timer"
          durationInFrames={SCENE_AUDIO['05-timer'].durationFrames}
        >
          <VideoFeatureScene
            name="Timer Video Scene"
            eyebrow="TAB 10 · ALT + R"
            headline="Deep Focus Timer."
            italicWord="Focus"
            subtitle="Glowing perimeter countdowns that stay gently out of your way."
            videoSrc="videos/timer.mp4"
            trimBeforeSeconds={6.8}
            clipSpeed={1.15}
            loopVideo={false}
            viewportHeight={430}
          />
          <Audio
            name="05 Deep Focus Timer VO"
            src={staticFile(SCENE_AUDIO['05-timer'].src)}
            from={SCENE_AUDIO['05-timer'].voDelayFrames}
            volume={voiceoverVolume}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={glideLeft}
          timing={smoothGlideTiming}
        />

        {/* 06. Drop Shelf Video */}
        <TransitionSeries.Sequence
          name="06 Universal Drop Shelf"
          durationInFrames={SCENE_AUDIO['06-shelf'].durationFrames}
        >
          <VideoFeatureScene
            name="Shelf Video Scene"
            eyebrow="TAB 16 · ALT + F"
            headline="Drop Anywhere."
            italicWord="Anywhere."
            subtitle="Stage files at your screen crown and drop them into any window."
            videoSrc="videos/shelf.mp4"
            trimBeforeSeconds={4.4}
            clipSpeed={1.55}
            loopVideo={false}
            viewportHeight={380}
          />
          <Audio
            name="06 Universal Drop Shelf VO"
            src={staticFile(SCENE_AUDIO['06-shelf'].src)}
            from={SCENE_AUDIO['06-shelf'].voDelayFrames}
            volume={voiceoverVolume}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={glideUp}
          timing={smoothGlideTiming}
        />

        {/* 07. App Launcher Video (230f, trimmed 0.5s..4.9s before desktop chat reveal) */}
        <TransitionSeries.Sequence
          name="07 Instant App Launcher"
          durationInFrames={SCENE_AUDIO['07-launcher'].durationFrames}
        >
          <VideoFeatureScene
            name="Launcher Video Scene"
            eyebrow="TAB 14 · ALT + L"
            headline="Instant App Launcher."
            italicWord="Instant"
            subtitle="Search installed apps, active windows & workspaces with zero lag."
            videoSrc="videos/app-launcher.mp4"
            trimBeforeSeconds={0.5}
            clipSpeed={1.15}
            loopVideo={false}
            viewportHeight={380}
          />
          <Audio
            name="07 Instant Launcher VO"
            src={staticFile(SCENE_AUDIO['07-launcher'].src)}
            from={SCENE_AUDIO['07-launcher'].voDelayFrames}
            volume={voiceoverVolume}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={glideDepth}
          timing={smoothGlideTiming}
        />

        {/* 08. Quick Notes Video */}
        <TransitionSeries.Sequence
          name="08 Quick Notes"
          durationInFrames={SCENE_AUDIO['08-notes'].durationFrames}
        >
          <VideoFeatureScene
            name="Notes Video Scene"
            eyebrow="TAB 15 · ALT + Q"
            headline="Capture Notes Fast."
            italicWord="Fast."
            subtitle="Frictionless scratchpad with instant autosave & checklist export."
            videoSrc="videos/notes.mp4"
            trimBeforeSeconds={0.8}
            clipSpeed={1.45}
            loopVideo={false}
            viewportHeight={430}
          />
          <Audio
            name="08 Quick Notes VO"
            src={staticFile(SCENE_AUDIO['08-notes'].src)}
            from={SCENE_AUDIO['08-notes'].voDelayFrames}
            volume={voiceoverVolume}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={glideRight}
          timing={smoothGlideTiming}
        />

        {/* 09. Spotlight Handoff: Audio Mixer -> System Stats */}
        <TransitionSeries.Sequence
          name="09 Audio & Telemetry"
          durationInFrames={SCENE_AUDIO['09-audio-stats'].durationFrames}
        >
          <DualFeatureScene
            name="Audio Stats Spotlight"
            firstEyebrow="TAB 12 · ALT + A"
            firstHeadline="Control Per-App Audio."
            firstItalicWord="Audio."
            firstImageSrc="screenshots/audio-mixer.png"
            firstCaption="Control app volume levels & output devices via native WASAPI."
            secondEyebrow="TAB 06 · ALT + G"
            secondHeadline="Real-Time Vitals."
            secondItalicWord="Vitals."
            secondImageSrc="screenshots/system-stats.png"
            secondCaption="Monitor live CPU load, memory & battery gauges at a glance."
          />
          <Audio
            name="09 Audio & Telemetry VO"
            src={staticFile(SCENE_AUDIO['09-audio-stats'].src)}
            from={SCENE_AUDIO['09-audio-stats'].voDelayFrames}
            volume={voiceoverVolume}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={glideLeft}
          timing={smoothGlideTiming}
        />

        {/* 10. Spotlight Handoff: Notifications -> Omnibar Search */}
        <TransitionSeries.Sequence
          name="10 Alerts & Omnibar"
          durationInFrames={SCENE_AUDIO['10-alerts-omnibar'].durationFrames}
        >
          <DualFeatureScene
            name="Alerts Search Spotlight"
            firstEyebrow="TAB 05 · ALT + N"
            firstHeadline="Live Notifications."
            firstItalicWord="Notifications."
            firstImageSrc="screenshots/notifications.png"
            firstCaption="Without opening an app."
            secondEyebrow="TAB 00 · ALT + B"
            secondHeadline="Instant Search Everywhere."
            secondItalicWord="Everywhere."
            secondImageSrc="screenshots/search.png"
            secondCaption="Jump straight to Google, GitHub, YouTube, ChatGPT or Claude.ai."
          />
          <Audio
            name="10 Alerts & Omnibar VO"
            src={staticFile(SCENE_AUDIO['10-alerts-omnibar'].src)}
            from={SCENE_AUDIO['10-alerts-omnibar'].voDelayFrames}
            volume={voiceoverVolume}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={glideDepth}
          timing={smoothGlideTiming}
        />

        {/* 11. Spotlight Handoff: Weather -> Prayer Updates */}
        <TransitionSeries.Sequence
          name="11 Sky & Solar Arc"
          durationInFrames={SCENE_AUDIO['11-weather-prayer'].durationFrames}
        >
          <DualFeatureScene
            name="Weather Prayer Spotlight"
            firstEyebrow="TAB 01 · ALT + W"
            firstHeadline="Live Weather."
            firstItalicWord="Weather."
            firstImageSrc="screenshots/weather.png"
            firstCaption="Ambient sky conditions, humidity & 3-day outlook cleanly docked."
            secondEyebrow="TAB 17 · ALT + P"
            secondHeadline="Live Prayer Updates."
            secondItalicWord="Updates."
            secondImageSrc="screenshots/prayer.png"
            secondCaption="Astronomical celestial arc with offline daily prayer windows."
          />
          <Audio
            name="11 Sky & Solar Arc VO"
            src={staticFile(SCENE_AUDIO['11-weather-prayer'].src)}
            from={SCENE_AUDIO['11-weather-prayer'].voDelayFrames}
            volume={voiceoverVolume}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={glideUp}
          timing={smoothGlideTiming}
        />

        {/* 12. Spotlight Handoff: Calendar -> Tasks */}
        <TransitionSeries.Sequence
          name="12 Schedule & Tasks"
          durationInFrames={SCENE_AUDIO['12-calendar-tasks'].durationFrames}
        >
          <DualFeatureScene
            name="Calendar Tasks Spotlight"
            firstEyebrow="TAB 04 · ALT + C"
            firstHeadline="Bezel Calendar."
            firstItalicWord="Calendar."
            firstImageSrc="screenshots/calendar.png"
            firstCaption="Rapid monthly overview anchored neatly at the top of your screen."
            secondEyebrow="TAB 08 · ALT + T"
            secondHeadline="Focused Checklist."
            secondItalicWord="Checklist."
            secondImageSrc="screenshots/tasks.png"
            secondCaption="Minimalist reminders synced effortlessly with Quick Notes."
          />
          <Audio
            name="12 Schedule & Tasks VO"
            src={staticFile(SCENE_AUDIO['12-calendar-tasks'].src)}
            from={SCENE_AUDIO['12-calendar-tasks'].voDelayFrames}
            volume={voiceoverVolume}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={glideRight}
          timing={smoothGlideTiming}
        />

        {/* 13. Spotlight Handoff: Clipboard Vault -> Settings */}
        <TransitionSeries.Sequence
          name="13 Vault & Control"
          durationInFrames={SCENE_AUDIO['13-clipboard-settings'].durationFrames}
        >
          <DualFeatureScene
            name="Clipboard Settings Spotlight"
            firstEyebrow="TAB 07 · ALT + V"
            firstHeadline="Clipboard Vault."
            firstItalicWord="Vault."
            firstImageSrc="screenshots/clipboard.png"
            firstCaption="Capture & restore up to 50 copied clips in a single click."
            secondEyebrow="TAB 09 · ALT + S"
            secondHeadline="Yours to Tune."
            secondItalicWord="Tune."
            secondImageSrc="screenshots/settings.png"
            secondCaption="Multi-monitor targeting, tab ordering & custom global hotkeys."
          />
          <Audio
            name="13 Vault & Control VO"
            src={staticFile(SCENE_AUDIO['13-clipboard-settings'].src)}
            from={SCENE_AUDIO['13-clipboard-settings'].voDelayFrames}
            volume={voiceoverVolume}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={smoothFadeTiming}
        />

        {/* 14. Pure Rust Architecture Proof */}
        <TransitionSeries.Sequence
          name="14 Rust Architecture"
          durationInFrames={SCENE_AUDIO['14-architecture'].durationFrames}
        >
          <ArchitectureProofScene
            name="Architecture Proof Scene"
            headline="Rebuilt in Rust."
            subtitle="Native system speed with near-zero memory footprint."
          />
          <Audio
            name="14 Rust Architecture VO"
            src={staticFile(SCENE_AUDIO['14-architecture'].src)}
            from={SCENE_AUDIO['14-architecture'].voDelayFrames}
            volume={voiceoverVolume}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={smoothFadeTiming}
        />

        {/* 15. Brand CTA Resolve */}
        <TransitionSeries.Sequence
          name="15 Brand CTA"
          durationInFrames={SCENE_AUDIO['15-cta'].durationFrames}
        >
          <CtaResolveScene
            name="CTA Resolve Scene"
            brandName="Quick Pill"
            versionLabel={versionLabel}
            ctaUrl={ctaUrl}
            tagline="Your Desktop Reimagined."
          />
          <Audio
            name="15 Brand CTA VO"
            src={staticFile(SCENE_AUDIO['15-cta'].src)}
            from={SCENE_AUDIO['15-cta'].voDelayFrames}
            volume={voiceoverVolume}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Restrained editorial SFX (intro swell, mode cushions, shelf dock, Omnibar reveal, Rust lock, outro resolve) */}
      <Track name="Atmosphere & Glides SFX">
        {atmosphereSfxCues.map((cue) => (
          <Audio
            key={`${cue.id}-${cue.from}`}
            name={cue.name}
            src={staticFile(cue.src)}
            from={cue.from}
            durationInFrames={cue.durationFrames}
            volume={
              cue.id === 'sfx-outro-resolve'
                ? cue.volume * sfxVolume * outroSfxEnvelope
                : cue.volume * sfxVolume
            }
          />
        ))}
      </Track>

      <Track name="Feature Accent SFX">
        {accentSfxCues.map((cue) => (
          <Audio
            key={`${cue.id}-${cue.from}`}
            name={cue.name}
            src={staticFile(cue.src)}
            from={cue.from}
            durationInFrames={cue.durationFrames}
            volume={cue.volume * sfxVolume}
          />
        ))}
      </Track>

      {bgmFile.trim().length > 0 && (
        <Track name="Background Music">
          <Audio
            name="BGM Track"
            src={staticFile(bgmFile)}
            loop
            volume={bgmVolume * bgmEnvelope}
          />
        </Track>
      )}
    </AbsoluteFill>
  );
};
