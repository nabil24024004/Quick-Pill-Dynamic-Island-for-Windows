import {Easing, type SpringConfig} from 'remotion';

/**
 * Studio spring presets calibrated for 60 FPS motion choreography.
 * Never use raw linear interpolation for spatial motion, scaling, or rotation.
 */
export const STUDIO_SPRINGS: Record<string, Partial<SpringConfig>> = {
  /** Crisp, high-velocity UI cards, keycaps, badges, and pills */
  snappyUI: {mass: 0.6, damping: 15, stiffness: 220, overshootClamping: false},

  /** Weighty hero reveals and 3D glass window cards */
  cinematicHero: {mass: 1.4, damping: 26, stiffness: 90, overshootClamping: false},

  /** Virtual 3D camera pans, macro zooms, and orbital tilts */
  cameraRig: {mass: 2.2, damping: 38, stiffness: 65, overshootClamping: true},

  /** Playful micro-interactions, keycap pops, and notification rings */
  elasticPop: {mass: 0.5, damping: 10, stiffness: 250, overshootClamping: false},

  /** Smooth, cinematic cross-glide transitions */
  smoothTransition: {mass: 1.0, damping: 32, stiffness: 95, overshootClamping: true},
};

export const STUDIO_EASING = {
  expoOut: Easing.bezier(0.16, 1, 0.3, 1),
  expoInOut: Easing.bezier(0.87, 0, 0.13, 1),
  quartOut: Easing.bezier(0.25, 1, 0.5, 1),
};

export const STAGGER_FRAMES = 4;
export const WORD_STAGGER_FRAMES = 2;

/**
 * Deterministic ambient micro-drift so held elements always feel alive.
 */
export const getAmbientDrift = (frame: number, phaseOffset = 0) => {
  const t = frame + phaseOffset;
  return {
    x: Math.sin(t * 0.025) * 4,
    y: Math.cos(t * 0.02) * 3,
    scale: 1 + Math.sin(t * 0.03) * 0.006,
  };
};
