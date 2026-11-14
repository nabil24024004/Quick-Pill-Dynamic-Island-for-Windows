/**
 * Generates bespoke ElevenLabs voiceover clips (1 per scene, stitched cleanly)
 * and restrained editorial sound effects for Quick Pill's 9:16 promo video.
 *
 * Usage (from repository root where .env.local resides):
 *   node --env-file=.env.local scripts/generate-promo-audio.mjs
 *   node --env-file=.env.local scripts/generate-promo-audio.mjs --regen-vo
 *   node --env-file=.env.local scripts/generate-promo-audio.mjs --force
 */

import {ElevenLabsClient} from '@elevenlabs/elevenlabs-js';
import {execFileSync, spawnSync} from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const PROMO_DIR = path.join(REPO_ROOT, 'promo-video');
const VO_DIR = path.join(PROMO_DIR, 'public', 'audio', 'vo');
const SFX_DIR = path.join(PROMO_DIR, 'public', 'audio', 'sfx-el');
const MANIFEST_PATH = path.join(PROMO_DIR, 'src', 'audio', 'audioManifest.ts');

const FPS = 60;
const TRANSITION_FRAMES = 32;

// Verified via client.voices.getAll(): pre-made female voice ("Professional, Bright, Warm").
// Using eleven_multilingual_v2 so natural expressive pacing (speed + style) fits tight promo beats cleanly.
const VOICE_ID = 'hpp4J3VqNfWAUOO0d1Us';
const TTS_MODEL_ID = 'eleven_multilingual_v2';
const SFX_MODEL_ID = 'eleven_text_to_sound_v3';

export const VO_SCENES = [
  {
    id: '01-hook',
    name: '01 Hook',
    baseDurationFrames: 420,
    voDelayFrames: 122,
    tailBreathFrames: 34,
    maxDurationFrames: 540,
    text: "Meet Quick Pill. Mac's Dynamic Island, on steroids — your open-source productivity notch for Windows and Linux.",
  },
  {
    id: '02-modes',
    name: '02 Modes Morph',
    baseDurationFrames: 290,
    voDelayFrames: 18,
    tailBreathFrames: 32,
    maxDurationFrames: 360,
    text: 'It adapts effortlessly to your flow from Still to Quick to full Large mode.',
  },
  {
    id: '03-standby',
    name: '03 StandBy Overview',
    baseDurationFrames: 230,
    voDelayFrames: 18,
    tailBreathFrames: 32,
    maxDurationFrames: 340,
    text: 'Pin an always-ready StandBy clock and weather forecast right to your bezel.',
  },
  {
    id: '04-media',
    name: '04 Live Media',
    baseDurationFrames: 280,
    voDelayFrames: 18,
    tailBreathFrames: 30,
    // Bounded cleanly within now-playing.mp4 (5.00s = 300f @ 1.0x).
    maxDurationFrames: 296,
    text: 'Control live media playback and scrub waveforms right from your top bar.',
  },
  {
    id: '05-timer',
    name: '05 Deep Focus Timer',
    baseDurationFrames: 260,
    voDelayFrames: 18,
    tailBreathFrames: 32,
    maxDurationFrames: 360,
    text: 'Stay locked into deep focus with a glowing perimeter countdown.',
  },
  {
    id: '06-shelf',
    name: '06 Universal Drop Shelf',
    baseDurationFrames: 270,
    voDelayFrames: 18,
    tailBreathFrames: 32,
    maxDurationFrames: 360,
    text: 'Drag files into your universal drop shelf and release them anywhere.',
  },
  {
    id: '07-launcher',
    name: '07 Instant Launcher',
    baseDurationFrames: 230,
    voDelayFrames: 14,
    tailBreathFrames: 28,
    // Strictly capped so app-launcher.mp4 stays inside its trimmed 0.5s..4.9s privacy window.
    maxDurationFrames: 230,
    text: 'Open any app or workspace with zero lag.',
  },
  {
    id: '08-notes',
    name: '08 Quick Notes',
    baseDurationFrames: 270,
    voDelayFrames: 18,
    tailBreathFrames: 32,
    maxDurationFrames: 360,
    text: 'Capture ideas fast with automatic saving and instant checklist export.',
  },
  {
    id: '09-audio-stats',
    name: '09 Audio & Telemetry',
    baseDurationFrames: 270,
    voDelayFrames: 18,
    tailBreathFrames: 32,
    maxDurationFrames: 360,
    text: 'Balance per-app volume levels and monitor live C.P.U. and battery vitals.',
  },
  {
    id: '10-alerts-omnibar',
    name: '10 Alerts & Omnibar',
    baseDurationFrames: 270,
    voDelayFrames: 18,
    tailBreathFrames: 32,
    maxDurationFrames: 360,
    text: 'Respond to alerts inline, or launch unified search across your favorite tools.',
  },
  {
    id: '11-weather-prayer',
    name: '11 Sky & Solar Arc',
    baseDurationFrames: 270,
    voDelayFrames: 18,
    tailBreathFrames: 32,
    maxDurationFrames: 360,
    text: 'Track live weather conditions alongside an astronomical arc for daily prayer times.',
  },
  {
    id: '12-calendar-tasks',
    name: '12 Schedule & Tasks',
    baseDurationFrames: 270,
    voDelayFrames: 18,
    tailBreathFrames: 32,
    maxDurationFrames: 360,
    text: 'Scan your monthly calendar and finish tasks synced neatly with your notes.',
  },
  {
    id: '13-clipboard-settings',
    name: '13 Vault & Control',
    baseDurationFrames: 270,
    voDelayFrames: 18,
    tailBreathFrames: 32,
    maxDurationFrames: 360,
    text: 'Restore fifty copied clips in one click and customize every shortcut.',
  },
  {
    id: '14-architecture',
    name: '14 Rust Architecture',
    baseDurationFrames: 240,
    voDelayFrames: 18,
    tailBreathFrames: 32,
    maxDurationFrames: 360,
    text: 'Rebuilt in pure Rust, cutting memory down to three point nine three megabytes.',
  },
  {
    id: '15-cta',
    name: '15 Brand CTA',
    baseDurationFrames: 270,
    voDelayFrames: 18,
    tailBreathFrames: 64,
    maxDurationFrames: 420,
    text: 'Sixteen open-source tools for Windows and Linux. Quick Pill. Your desktop, reimagined.',
  },
];

// Restrained editorial SFX palette (zero sharp clicks/tinks).
export const SFX_SPECS = [
  {
    id: 'sfx-intro-swell',
    prompt:
      'Deep, warm minimal synth sub-bass bloom with subtle velvety air shimmer, Apple hardware commercial opener, no sharp click or chime',
    durationSeconds: 2.2,
    promptInfluence: 0.55,
  },
  {
    id: 'sfx-morph-cushion',
    prompt:
      'Ultra-soft low-passed felt air cushion expansion whoosh, gentle silky UI size morph sound, muted warm studio texture, no metallic click',
    durationSeconds: 0.9,
    promptInfluence: 0.6,
  },
  {
    id: 'sfx-chapter-glide',
    prompt:
      'Smooth, subtle warm air breeze transition whoosh, soft muted cinema sweep between minimalist product scenes, no harsh high frequencies',
    durationSeconds: 1.0,
    promptInfluence: 0.6,
  },
  {
    id: 'sfx-magnetic-dock',
    prompt:
      'Soft cushioned organic glass thump and gentle warm magnetic dock settle, rounded low-mid tone, absolutely no metallic tink or ping',
    durationSeconds: 0.8,
    promptInfluence: 0.65,
  },
  {
    id: 'sfx-omnibar-open',
    prompt:
      'Subtle warm velvety glass UI reveal swell, minimalist ambient shimmer, no sharp high-pitched click or bell',
    durationSeconds: 0.85,
    promptInfluence: 0.6,
  },
  {
    id: 'sfx-rust-lock',
    prompt:
      'Tight, deep cinematic sub-bass deceleration and warm matte mechanical lock settle, refined dark minimalism, no harsh click',
    durationSeconds: 1.5,
    promptInfluence: 0.6,
  },
  {
    id: 'sfx-outro-resolve',
    prompt:
      'Warm minimal atmospheric monochrome ambient pad chord resolve, hopeful soft electronic harmonic tail gently fading out',
    durationSeconds: 3.6,
    promptInfluence: 0.5,
  },
];

async function writeAudioResponseToFile(audioResponse, outputPath) {
  const chunks = [];
  if (typeof audioResponse?.getReader === 'function') {
    const reader = audioResponse.getReader();
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
  } else {
    for await (const chunk of audioResponse) {
      chunks.push(Buffer.from(chunk));
    }
  }
  writeFileSync(outputPath, Buffer.concat(chunks));
}

function trimEdgeSilence(filePath) {
  const tmpPath = `${filePath}.trim.mp3`;
  // Trim only dead digital silence at start (<0.02s) and end (<0.04s); preserve internal cadence.
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-v',
      'error',
      '-i',
      filePath,
      '-af',
      'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,areverse',
      '-c:a',
      'libmp3lame',
      '-b:a',
      '128k',
      tmpPath,
    ],
    {stdio: 'pipe'},
  );
  if (existsSync(tmpPath) && statSync(tmpPath).size > 0) {
    renameSync(tmpPath, filePath);
  } else if (existsSync(tmpPath)) {
    unlinkSync(tmpPath);
  }
}

function calibrateSfxPeak(filePath, targetMaxDb = -8.0) {
  const res = spawnSync(
    'ffmpeg',
    ['-i', filePath, '-af', 'volumedetect', '-f', 'null', 'NUL'],
    {encoding: 'utf8'},
  );
  const log = `${res.stdout ?? ''}\n${res.stderr ?? ''}`;
  const match = log.match(/max_volume:\s*([-\d.]+)\s*dB/i);
  if (!match) {
    return;
  }
  const currentMax = Number.parseFloat(match[1]);
  if (!Number.isFinite(currentMax)) {
    return;
  }
  const gainDb = Math.max(-18, Math.min(24, targetMaxDb - currentMax));
  if (Math.abs(gainDb) < 0.8) {
    return;
  }
  const tmpPath = `${filePath}.norm.mp3`;
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-v',
      'error',
      '-i',
      filePath,
      '-af',
      `volume=${gainDb.toFixed(2)}dB`,
      '-c:a',
      'libmp3lame',
      '-b:a',
      '128k',
      tmpPath,
    ],
    {stdio: 'pipe'},
  );
  if (existsSync(tmpPath) && statSync(tmpPath).size > 0) {
    renameSync(tmpPath, filePath);
  } else if (existsSync(tmpPath)) {
    unlinkSync(tmpPath);
  }
}

function probeDurationSeconds(filePath) {
  const raw = execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ],
    {encoding: 'utf8'},
  ).trim();
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ffprobe duration for ${filePath}: "${raw}"`);
  }
  return parsed;
}

function ensureNonEmptyFile(filePath, force) {
  if (force || !existsSync(filePath)) {
    return false;
  }
  return statSync(filePath).size > 0;
}

async function generateVoiceovers(client, force, regenAllVo, regenSet) {
  mkdirSync(VO_DIR, {recursive: true});
  const results = [];

  for (let i = 0; i < VO_SCENES.length; i += 1) {
    const scene = VO_SCENES[i];
    const relPath = `audio/vo/${scene.id}.mp3`;
    const outPath = path.join(PROMO_DIR, 'public', relPath);
    const shouldRegen = force || regenAllVo || regenSet.has(scene.id);

    if (!ensureNonEmptyFile(outPath, shouldRegen)) {
      const previousText = i > 0 ? VO_SCENES[i - 1].text : undefined;
      const nextText = i < VO_SCENES.length - 1 ? VO_SCENES[i + 1].text : undefined;

      console.log(`[VO ${i + 1}/${VO_SCENES.length}] Generating ${scene.id}...`);
      const audio = await client.textToSpeech.convert(VOICE_ID, {
        text: scene.text,
        modelId: TTS_MODEL_ID,
        outputFormat: 'mp3_44100_128',
        applyTextNormalization: 'on',
        voiceSettings: {
          // Higher stability + similarityBoost with minimal style prevents eleven_multilingual_v2 speaker/gender drift.
          stability: 0.72,
          similarityBoost: 0.85,
          style: 0.05,
          useSpeakerBoost: true,
          speed: 1.14,
        },
        previousText,
        nextText,
      });
      await writeAudioResponseToFile(audio, outPath);
      trimEdgeSilence(outPath);
    } else {
      console.log(`[VO ${i + 1}/${VO_SCENES.length}] Cached ${scene.id}`);
    }

    const audioDurationSeconds = probeDurationSeconds(outPath);
    const audioFrames = Math.ceil(audioDurationSeconds * FPS);
    const neededFrames = scene.voDelayFrames + audioFrames + scene.tailBreathFrames;
    const durationFrames = Math.min(
      scene.maxDurationFrames,
      Math.max(scene.baseDurationFrames, neededFrames),
    );

    if (neededFrames > scene.maxDurationFrames) {
      console.warn(
        `  WARN ${scene.id}: audio needed ${neededFrames}f (vo=${audioDurationSeconds.toFixed(2)}s), clamped to max ${scene.maxDurationFrames}f`,
      );
    }

    results.push({
      ...scene,
      src: relPath,
      audioDurationSeconds: Number(audioDurationSeconds.toFixed(3)),
      audioFrames,
      durationFrames,
    });
  }

  return results;
}

async function generateSoundEffects(client, force, regenSet) {
  mkdirSync(SFX_DIR, {recursive: true});
  const results = [];

  for (let i = 0; i < SFX_SPECS.length; i += 1) {
    const spec = SFX_SPECS[i];
    const relPath = `audio/sfx-el/${spec.id}.mp3`;
    const outPath = path.join(PROMO_DIR, 'public', relPath);
    const shouldRegen = force || regenSet.has(spec.id);

    if (!ensureNonEmptyFile(outPath, shouldRegen)) {
      console.log(`[SFX ${i + 1}/${SFX_SPECS.length}] Generating ${spec.id}...`);
      const audio = await client.textToSoundEffects.convert({
        text: spec.prompt,
        modelId: SFX_MODEL_ID,
        durationSeconds: spec.durationSeconds,
        promptInfluence: spec.promptInfluence,
        outputFormat: 'mp3_44100_128',
      });
      await writeAudioResponseToFile(audio, outPath);
      calibrateSfxPeak(outPath, -8.0);
    } else {
      console.log(`[SFX ${i + 1}/${SFX_SPECS.length}] Cached ${spec.id}`);
      calibrateSfxPeak(outPath, -8.0);
    }

    const durationSeconds = probeDurationSeconds(outPath);
    results.push({
      id: spec.id,
      src: relPath,
      durationSeconds: Number(durationSeconds.toFixed(3)),
      durationFrames: Math.ceil(durationSeconds * FPS),
    });
  }

  return results;
}

function buildManifestTypeScript(voResults, sfxResults) {
  const sceneStarts = [];
  let cursor = 0;
  for (let i = 0; i < voResults.length; i += 1) {
    sceneStarts.push(cursor);
    cursor +=
      voResults[i].durationFrames - (i < voResults.length - 1 ? TRANSITION_FRAMES : 0);
  }
  const totalDurationFrames = cursor;

  const sceneEntries = voResults.map((s, idx) => ({
    id: s.id,
    name: s.name,
    src: s.src,
    startFrame: sceneStarts[idx],
    durationFrames: s.durationFrames,
    voDelayFrames: s.voDelayFrames,
    audioFrames: s.audioFrames,
    audioDurationSeconds: s.audioDurationSeconds,
  }));

  // Restrained editorial SFX split across 2 non-overlapping Remotion tracks.
  const sfxDurationById = Object.fromEntries(sfxResults.map((s) => [s.id, s.durationFrames]));
  const mapCue = (track, cue) => ({
    ...cue,
    track,
    durationFrames: sfxDurationById[cue.id] ?? 60,
  });

  const sfxCues = [
    mapCue('atmosphere', {
      name: 'Intro Emblem Swell',
      id: 'sfx-intro-swell',
      src: 'audio/sfx-el/sfx-intro-swell.mp3',
      from: Math.max(0, sceneStarts[0] + 6),
      volume: 0.3,
    }),
    mapCue('atmosphere', {
      name: 'Chapter Glide -> Feature Tour',
      id: 'sfx-chapter-glide',
      src: 'audio/sfx-el/sfx-chapter-glide.mp3',
      from: Math.max(0, sceneStarts[2] - 12),
      volume: 0.24,
    }),
    mapCue('atmosphere', {
      name: 'Chapter Glide -> Architecture',
      id: 'sfx-chapter-glide',
      src: 'audio/sfx-el/sfx-chapter-glide.mp3',
      from: Math.max(0, sceneStarts[13] - 12),
      volume: 0.24,
    }),
    mapCue('atmosphere', {
      name: 'Outro Harmonic Resolve',
      id: 'sfx-outro-resolve',
      src: 'audio/sfx-el/sfx-outro-resolve.mp3',
      from: Math.max(
        sceneStarts[14] - 8,
        totalDurationFrames - (sfxDurationById['sfx-outro-resolve'] ?? 214),
      ),
      volume: 0.34,
    }),
    mapCue('accents', {
      name: 'Modes Morph (Still -> Quick)',
      id: 'sfx-morph-cushion',
      src: 'audio/sfx-el/sfx-morph-cushion.mp3',
      from: sceneStarts[1] + 80,
      volume: 0.24,
    }),
    mapCue('accents', {
      name: 'Modes Morph (Quick -> Large)',
      id: 'sfx-morph-cushion',
      src: 'audio/sfx-el/sfx-morph-cushion.mp3',
      from: sceneStarts[1] + 172,
      volume: 0.24,
    }),
    mapCue('accents', {
      name: 'Shelf Magnetic Dock',
      id: 'sfx-magnetic-dock',
      src: 'audio/sfx-el/sfx-magnetic-dock.mp3',
      from: sceneStarts[5] + 74,
      volume: 0.26,
    }),
    mapCue('accents', {
      name: 'Omnibar Handoff Reveal',
      id: 'sfx-omnibar-open',
      src: 'audio/sfx-el/sfx-omnibar-open.mp3',
      from: sceneStarts[9] + Math.round(voResults[9].durationFrames * 0.45),
      volume: 0.24,
    }),
    mapCue('accents', {
      name: 'Rust Memory Lock (3.93 MiB)',
      id: 'sfx-rust-lock',
      src: 'audio/sfx-el/sfx-rust-lock.mp3',
      from: sceneStarts[13] + 34,
      volume: 0.28,
    }),
  ];

  const scenesRecord = Object.fromEntries(sceneEntries.map((entry) => [entry.id, entry]));

  return `// Auto-generated by scripts/generate-promo-audio.mjs — do not hand-edit frame lengths.

export interface SceneAudioConfig {
  readonly id: string;
  readonly name: string;
  readonly src: string;
  readonly startFrame: number;
  readonly durationFrames: number;
  readonly voDelayFrames: number;
  readonly audioFrames: number;
  readonly audioDurationSeconds: number;
}

export interface SfxCueConfig {
  readonly track: 'atmosphere' | 'accents';
  readonly name: string;
  readonly id: string;
  readonly src: string;
  readonly from: number;
  readonly durationFrames: number;
  readonly volume: number;
}

export const PROMO_FPS = ${FPS} as const;
export const PROMO_TRANSITION_FRAMES = ${TRANSITION_FRAMES} as const;
export const PROMO_TOTAL_DURATION_FRAMES = ${totalDurationFrames} as const;

export const SCENE_AUDIO: Record<string, SceneAudioConfig> = ${JSON.stringify(scenesRecord, null, 2)} as const;

export const EDITORIAL_SFX_CUES: readonly SfxCueConfig[] = ${JSON.stringify(sfxCues, null, 2)} as const;
`;
}

async function main() {
  const force = process.argv.includes('--force');
  const regenAllVo = process.argv.includes('--regen-vo');
  const regenArg = process.argv.find((arg) => arg.startsWith('--regen='));
  const regenSet = new Set(
    regenArg ? regenArg.slice('--regen='.length).split(',').filter(Boolean) : [],
  );

  const client = new ElevenLabsClient();

  const voResults = await generateVoiceovers(client, force, regenAllVo, regenSet);
  const sfxResults = await generateSoundEffects(client, force, regenSet);

  mkdirSync(path.dirname(MANIFEST_PATH), {recursive: true});
  const tsSource = buildManifestTypeScript(voResults, sfxResults);
  writeFileSync(MANIFEST_PATH, tsSource, 'utf8');

  console.log('\nGenerated audio manifest:', MANIFEST_PATH);
  for (const s of voResults) {
    console.log(
      `  ${s.id}: vo=${s.audioDurationSeconds}s (${s.audioFrames}f), delay=${s.voDelayFrames}f, sceneDur=${s.durationFrames}f (base ${s.baseDurationFrames}f)`,
    );
  }
  for (const x of sfxResults) {
    console.log(`  ${x.id}: ${x.durationSeconds}s (${x.durationFrames}f)`);
  }
  console.log(
    `  TOTAL_DURATION_FRAMES=${voResults.reduce((sum, s, i) => sum + s.durationFrames - (i < voResults.length - 1 ? TRANSITION_FRAMES : 0), 0)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
