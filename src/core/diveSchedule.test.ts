import { describe, expect, it } from 'vitest';
import { DIVE_END_ALTITUDE, DIVE_SECONDS, DIVE_STAGES, divePose } from './diveSchedule';

const START = 3.5; // following Earth: ~4.5 radii from the centre

describe('divePose', () => {
  it('lasts about twice as long as the old 3.8 s dive, in visible stages', () => {
    expect(DIVE_SECONDS).toBeGreaterThan(2 * 3.8);
    expect(DIVE_STAGES.filter((s) => s.altitude !== null)).toHaveLength(3);
  });

  it('starts where the camera is and ends just above the ground', () => {
    expect(divePose(0, START).altitude).toBeCloseTo(START);
    expect(divePose(DIVE_SECONDS, START).altitude).toBeCloseTo(DIVE_END_ALTITUDE);
    expect(divePose(DIVE_SECONDS + 5, START).altitude).toBeCloseTo(DIVE_END_ALTITUDE);
  });

  it('frames the continent, then the country, then the ground', () => {
    const endOf = (n: number) => DIVE_STAGES.slice(0, n + 1).reduce((s, x) => s + x.seconds, 0);
    expect(divePose(endOf(0) - 1e-6, START).altitude).toBeCloseTo(2.4, 3);
    expect(divePose(endOf(0) - 1e-6, START).caption?.title).toBe('Châu Á');
    expect(divePose(endOf(2) - 1e-6, START).altitude).toBeCloseTo(0.28, 3);
    expect(divePose(endOf(2) - 1e-6, START).caption?.title).toBe('Việt Nam');
    expect(divePose(endOf(4) - 1e-6, START).caption?.title).toBe('Bãi biển Mỹ Khê');
  });

  it('moves smoothly: no jumps between frames, always heading down after the first stage', () => {
    const dt = 1 / 60;
    let prev = divePose(0, START);
    for (let t = dt; t <= DIVE_SECONDS; t += dt) {
      const pose = divePose(t, START);
      // Zoom rate (log-altitude per second) stays at or below ~half the old dive's
      // peak: ln(3.5 / 0.015) over 3.8 s with a cubic ease peaked at ≈ 2.15 /s.
      expect(Math.abs(Math.log(pose.altitude / prev.altitude)) / dt).toBeLessThan(1.1);
      expect(Math.abs(pose.swing - prev.swing)).toBeLessThan(0.01);
      if (pose.stage > 0) expect(pose.altitude).toBeLessThanOrEqual(prev.altitude + 1e-12);
      prev = pose;
    }
  });

  it('only fades to haze at the very end', () => {
    expect(divePose(DIVE_SECONDS * 0.5, START).fade).toBe(0);
    expect(divePose(DIVE_SECONDS, START).fade).toBe(1);
  });
});
