/**
 * The space part of the trip down to the beach, as a function of time.
 * Altitudes are in Earth radii above the surface and are interpolated on a
 * log scale, so the zoom feels like a steady "×N per second" rather than
 * rushing through the middle. Pauses between stages let the eye settle on
 * the continent, then the country, before the final drop.
 */

export interface Caption {
  title: string;
  subtitle: string;
}

interface Stage {
  seconds: number;
  /** Altitude (Earth radii) reached at the end of the stage; `null` = pause. */
  altitude: number | null;
  caption?: Caption;
}

/** Pauses still drift down a little so the camera never freezes. */
const PAUSE_DRIFT = 0.92;

export const DIVE_STAGES: readonly Stage[] = [
  // Swing round to face the right side of Earth and frame the continent.
  { seconds: 4.4, altitude: 2.4, caption: { title: 'Châu Á', subtitle: 'Trái Đất' } },
  { seconds: 1.2, altitude: null },
  {
    seconds: 4.0,
    altitude: 0.28,
    caption: { title: 'Việt Nam', subtitle: 'Đà Nẵng · miền Trung' },
  },
  { seconds: 0.9, altitude: null },
  // Through the clouds; ends ~95 km up, hidden by the haze.
  {
    seconds: 4.4,
    altitude: 0.015,
    caption: { title: 'Bãi biển Mỹ Khê', subtitle: 'Đà Nẵng, Việt Nam' },
  },
];

export const DIVE_SECONDS = DIVE_STAGES.reduce((sum, s) => sum + s.seconds, 0);
export const DIVE_END_ALTITUDE = DIVE_STAGES[DIVE_STAGES.length - 1].altitude!;

export interface DivePose {
  /** Altitude in Earth radii. */
  altitude: number;
  /** 0 → 1: turning from the start view to straight above the site (first stage). */
  swing: number;
  /** Haze over the screen, 0 → 1 during the last part of the final stage. */
  fade: number;
  stage: number;
  caption?: Caption;
}

export function divePose(elapsed: number, startAltitude: number): DivePose {
  let from = startAltitude;
  let t0 = 0;
  for (let i = 0; i < DIVE_STAGES.length; i++) {
    const stage = DIVE_STAGES[i];
    const to = stage.altitude ?? from * PAUSE_DRIFT;
    const last = i === DIVE_STAGES.length - 1;
    if (elapsed < t0 + stage.seconds || last) {
      const t = clamp01((elapsed - t0) / stage.seconds);
      const e = easeInOutSine(t);
      return {
        altitude: from * Math.pow(to / from, e),
        swing: i === 0 ? e : 1,
        fade: last ? smoothstep(0.45, 1, t) : 0,
        stage: i,
        caption: captionFor(i),
      };
    }
    from = to;
    t0 += stage.seconds;
  }
  throw new Error('unreachable');
}

/** The caption of the latest stage that has one, at or before stage `i`. */
function captionFor(i: number): Caption | undefined {
  for (let j = i; j >= 0; j--) if (DIVE_STAGES[j].caption) return DIVE_STAGES[j].caption;
  return undefined;
}

export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
function smoothstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
