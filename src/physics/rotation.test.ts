import { describe, expect, it } from 'vitest';
import { PLANETS } from '../data/planets';
import { SITE } from '../data/site';
import { bodyFrame, dot, localSun, primeMeridianAngle } from './rotation';
import { dateToJ2000Days } from './time';

const planet = (name: string) => PLANETS.find((p) => p.name === name)!;
const earth = planet('Trái Đất');
const DEG = Math.PI / 180;
const ECLIPTIC_NORTH = { x: 0, y: 0, z: 1 };
const sunAt = (iso: string, lat = SITE.latDeg, lon = SITE.lonDeg) =>
  localSun(earth.orbit, earth.rotation, lat, lon, dateToJ2000Days(new Date(iso)));

describe('bodyFrame', () => {
  it('tilts each pole from ecliptic north by about the axial tilt', () => {
    for (const p of PLANETS) {
      const angle = Math.acos(dot(bodyFrame(p.rotation).y, ECLIPTIC_NORTH)) / DEG;
      // IAU "north" is the pole on the ecliptic-north side, so retrograde rotators
      // (quoted tilt > 90°, negative Ẇ) point it the other way.
      const retrograde = p.axialTiltDeg > 90;
      expect(p.rotation.wRateDegPerDay < 0, p.name).toBe(retrograde);
      const tilt = retrograde ? 180 - angle : angle;
      // Planets' orbits are inclined a few degrees to the ecliptic, so allow some slack.
      expect(Math.abs(tilt - p.axialTiltDeg), p.name).toBeLessThan(8);
    }
  });

  it('gives Earth the real obliquity', () => {
    const tilt = Math.acos(dot(bodyFrame(earth.rotation).y, ECLIPTIC_NORTH)) / DEG;
    expect(tilt).toBeCloseTo(23.44, 1);
  });
});

describe('Earth rotation phase', () => {
  it('puts the Sun overhead near Greenwich at J2000 (noon UT, 1 Jan 2000)', () => {
    // Sun declination that day ≈ −23°.
    const sun = localSun(earth.orbit, earth.rotation, -23, 0, 0);
    expect(sun.elevationDeg).toBeGreaterThan(85);
  });

  it('turns once per sidereal day', () => {
    const a = primeMeridianAngle(earth.rotation, 100);
    const b = primeMeridianAngle(earth.rotation, 100 + 0.99726957);
    expect(Math.abs(a - b)).toBeLessThan(1e-4);
  });
});

describe('Sun over Mỹ Khê beach (UTC+7)', () => {
  it('is high at local noon on the June solstice', () => {
    // Expected ≈ 90 − (23.44 − 16.05) ≈ 82.6°.
    expect(sunAt('2026-06-21T05:00:00Z').elevationDeg).toBeGreaterThan(78);
  });

  it('rises in the east-northeast over the sea in a June morning', () => {
    const sun = sunAt('2026-06-21T23:00:00Z'); // 06:00 local
    expect(sun.elevationDeg).toBeGreaterThan(0);
    expect(sun.elevationDeg).toBeLessThan(20);
    expect(sun.azimuthDeg).toBeGreaterThan(50);
    expect(sun.azimuthDeg).toBeLessThan(80);
  });

  it('sets in the west in the evening and is far below the horizon at midnight', () => {
    const evening = sunAt('2026-06-21T11:30:00Z'); // 18:30 local
    expect(evening.azimuthDeg).toBeGreaterThan(270);
    expect(evening.azimuthDeg).toBeLessThan(310);
    expect(sunAt('2026-06-21T17:00:00Z').elevationDeg).toBeLessThan(-40); // 00:00 local
  });

  it('stands in the southern sky at noon in December', () => {
    const sun = sunAt('2026-12-21T05:00:00Z');
    expect(sun.azimuthDeg).toBeGreaterThan(160);
    expect(sun.azimuthDeg).toBeLessThan(200);
    expect(sun.elevationDeg).toBeCloseTo(90 - 16.05 - 23.44, -1);
  });
});
