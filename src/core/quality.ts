export type QualityLevel = 'high' | 'medium' | 'low';
export type QualityMode = 'auto' | QualityLevel;

export interface QualitySettings {
  maxPixelRatio: number;
  bloom: boolean;
}

export const QUALITY_SETTINGS: Record<QualityLevel, QualitySettings> = {
  high: { maxPixelRatio: 2, bloom: true },
  medium: { maxPixelRatio: 1.25, bloom: true },
  low: { maxPixelRatio: 1, bloom: false },
};

const LEVELS: QualityLevel[] = ['high', 'medium', 'low'];
/** Ignore the first seconds: shader compilation and texture uploads cause hitches. */
const WARMUP_SECONDS = 4;
const WINDOW_SECONDS = 2;
const MIN_FPS = 40;
/** Consecutive slow windows needed before stepping down, to ride out one-off stalls. */
const SLOW_WINDOWS = 2;
/** Frames longer than this are stalls (tab switch, GC), not steady-state cost. */
const STALL_SECONDS = 0.25;

/**
 * Picks the rendering quality. In `auto` mode it starts from a level suited
 * to the device and steps down (never up, to avoid oscillating) when the
 * frame rate stays below MIN_FPS.
 */
export class QualityController {
  mode: QualityMode = 'auto';
  level: QualityLevel;
  private readonly autoStart: QualityLevel;
  private elapsed = 0;
  private windowTime = 0;
  private windowFrames = 0;
  private slowWindows = 0;

  constructor(
    autoStart: QualityLevel,
    private readonly onChange: (level: QualityLevel) => void,
  ) {
    this.autoStart = autoStart;
    this.level = autoStart;
  }

  setMode(mode: QualityMode): void {
    this.mode = mode;
    this.resetSampling();
    this.apply(mode === 'auto' ? this.autoStart : mode);
  }

  /** Feed the real duration of each frame. */
  sample(frameSeconds: number): void {
    if (this.mode !== 'auto' || this.level === 'low') return;
    this.elapsed += frameSeconds;
    if (this.elapsed < WARMUP_SECONDS || frameSeconds > STALL_SECONDS) return;

    this.windowTime += frameSeconds;
    this.windowFrames++;
    if (this.windowTime < WINDOW_SECONDS) return;

    const fps = this.windowFrames / this.windowTime;
    this.windowTime = 0;
    this.windowFrames = 0;
    this.slowWindows = fps < MIN_FPS ? this.slowWindows + 1 : 0;
    if (this.slowWindows >= SLOW_WINDOWS) {
      this.slowWindows = 0;
      this.apply(LEVELS[LEVELS.indexOf(this.level) + 1]);
    }
  }

  private resetSampling(): void {
    this.elapsed = 0;
    this.windowTime = 0;
    this.windowFrames = 0;
    this.slowWindows = 0;
  }

  private apply(level: QualityLevel): void {
    if (level === this.level) return;
    this.level = level;
    this.onChange(level);
  }
}
