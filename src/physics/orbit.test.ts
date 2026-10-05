import { describe, expect, it } from 'vitest';
import { PLANETS } from '../data/planets';
import { heliocentricPosition, meanAnomalyAt, orbitPath, solveKepler } from './orbit';
import { dateToJ2000Days, j2000DaysToDate } from './time';

const earth = PLANETS.find((p) => p.name === 'Trái Đất')!.orbit;
const mercury = PLANETS.find((p) => p.name === 'Sao Thủy')!.orbit;

const length = (v: { x: number; y: number; z: number }) => Math.hypot(v.x, v.y, v.z);

describe('solveKepler', () => {
  it.each([0, 0.0167, 0.2056, 0.5, 0.9])('satisfies M = E − e·sin(E) for e = %s', (e) => {
    for (let m = 0; m < Math.PI * 2; m += 0.37) {
      const E = solveKepler(m, e);
      expect(E - e * Math.sin(E)).toBeCloseTo(m, 9);
    }
  });
});

describe('heliocentricPosition', () => {
  it('places Earth where the JPL ephemeris has it at J2000', () => {
    // JPL Horizons, Earth heliocentric ecliptic J2000 at 2000-01-01 12:00 TDB.
    const p = heliocentricPosition(earth, 0);
    expect(p.x).toBeCloseTo(-0.1771, 2);
    expect(p.y).toBeCloseTo(0.9672, 2);
    expect(Math.abs(p.z)).toBeLessThan(1e-4);
  });

  it('returns to the same point after one orbital period', () => {
    const start = heliocentricPosition(mercury, 1234);
    const end = heliocentricPosition(mercury, 1234 + mercury.periodDays);
    expect(end.x).toBeCloseTo(start.x, 9);
    expect(end.y).toBeCloseTo(start.y, 9);
    expect(end.z).toBeCloseTo(start.z, 9);
  });

  it('stays between perihelion and aphelion distances', () => {
    const { semiMajorAxisAu: a, eccentricity: e } = mercury;
    for (let d = 0; d < mercury.periodDays; d += 3) {
      const r = length(heliocentricPosition(mercury, d));
      expect(r).toBeGreaterThanOrEqual(a * (1 - e) - 1e-9);
      expect(r).toBeLessThanOrEqual(a * (1 + e) + 1e-9);
    }
  });

  it('is at perihelion when the mean anomaly is zero', () => {
    const daysToPerihelion = (-meanAnomalyAt(mercury, 0) / (Math.PI * 2)) * mercury.periodDays;
    const r = length(heliocentricPosition(mercury, daysToPerihelion));
    expect(r).toBeCloseTo(mercury.semiMajorAxisAu * (1 - mercury.eccentricity), 9);
  });
});

describe('orbitPath', () => {
  it('produces the requested number of points on the orbit', () => {
    const points = orbitPath(earth, 64);
    expect(points).toHaveLength(64);
    for (const p of points) expect(length(p)).toBeCloseTo(1, 1);
  });
});

describe('time conversions', () => {
  it('round-trips dates through J2000 days', () => {
    const date = new Date(Date.UTC(2026, 9, 5, 8, 30));
    expect(j2000DaysToDate(dateToJ2000Days(date)).getTime()).toBe(date.getTime());
    expect(dateToJ2000Days(new Date(Date.UTC(2000, 0, 1, 12)))).toBe(0);
  });
});
