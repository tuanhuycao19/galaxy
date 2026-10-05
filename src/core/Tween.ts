/** Runs `onUpdate(t)` with t going 0 → 1 over `duration` seconds, then `onDone`. */
export class Tween {
  private elapsed = 0;

  constructor(
    private readonly duration: number,
    private readonly onUpdate: (t: number) => void,
    private readonly onDone?: () => void,
  ) {}

  /** Returns true once finished. */
  step(seconds: number): boolean {
    this.elapsed += seconds;
    const t = Math.min(1, this.elapsed / this.duration);
    this.onUpdate(t);
    if (t < 1) return false;
    this.onDone?.();
    return true;
  }
}

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
