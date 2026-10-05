import { describe, expect, it } from 'vitest';
import { MAX_SPIN_PER_FRAME, spinStep } from './Planet';

const wrap = (a: number) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

describe('spinStep', () => {
  it('follows the true rotation exactly when already in phase', () => {
    expect(spinStep(1, 1.05, 0.05)).toBeCloseTo(0.05, 12);
  });

  it('caps the visible spin at high time scales', () => {
    expect(spinStep(0, 0, 2)).toBe(MAX_SPIN_PER_FRAME);
    expect(spinStep(0, 0, -2)).toBe(-MAX_SPIN_PER_FRAME);
  });

  it('catches up with a half-turn lag smoothly: mostly within 1 s, settled within 2 s', () => {
    // Real-time speed: Earth turns ~7.3e-5 rad/s, i.e. effectively standing still.
    let spin = 0;
    let target = Math.PI - 0.01;
    const step = 7.3e-5 / 60;
    let frames = 0;
    let lagAfterOneSecond = Infinity;
    while (Math.abs(wrap(target - spin)) > 0.01 && frames < 600) {
      if (frames === 60) lagAfterOneSecond = Math.abs(wrap(target - spin));
      const applied = spinStep(spin, target, step);
      expect(Math.abs(applied)).toBeLessThanOrEqual(0.15 + step + 1e-9);
      spin += applied;
      target += step;
      frames++;
    }
    expect(lagAfterOneSecond).toBeLessThan(Math.PI * 0.1);
    expect(frames).toBeLessThan(120);
  });
});
