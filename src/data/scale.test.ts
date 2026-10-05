import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { bodyRadius, moonDistance, orbitDistance, sunRadius, toScenePosition } from './scale';

describe('compressed scale', () => {
  it('keeps every body visible and ordered', () => {
    expect(bodyRadius(6_371, 'compressed')).toBeCloseTo(0.6);
    expect(bodyRadius(69_911, 'compressed')).toBeLessThan(sunRadius('compressed'));
    // Mercury's orbit sits well outside the Sun.
    expect(orbitDistance(0.307, 'compressed')).toBeGreaterThan(sunRadius('compressed') * 3);
    expect(orbitDistance(30.07, 'compressed')).toBeCloseTo(149, 0);
  });
});

describe('true scale', () => {
  it('uses one linear factor for sizes and distances', () => {
    const earthOrbit = orbitDistance(1, 'true');
    expect(earthOrbit).toBe(5);
    // 1 AU ≈ 23,481 Earth radii.
    expect(earthOrbit / bodyRadius(6_371, 'true')).toBeCloseTo(23_481, -1);
    // Sun ≈ 109 Earth radii.
    expect(sunRadius('true') / bodyRadius(6_371, 'true')).toBeCloseTo(109.2, 0);
    // Moon ≈ 60 Earth radii from Earth.
    const earthRadius = bodyRadius(6_371, 'true');
    expect(moonDistance(384_400, earthRadius, 'true') / earthRadius).toBeCloseTo(60.3, 0);
  });

  it('puts Neptune near the same place in both modes', () => {
    const ratio = orbitDistance(30.07, 'true') / orbitDistance(30.07, 'compressed');
    expect(ratio).toBeGreaterThan(0.9);
    expect(ratio).toBeLessThan(1.1);
  });
});

describe('toScenePosition', () => {
  it('maps ecliptic north to +Y and keeps direction', () => {
    const v = toScenePosition({ x: 0, y: 0, z: 2 }, 'true', new Vector3());
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBe(10);
    expect(v.z).toBeCloseTo(0);
    const w = toScenePosition({ x: 0, y: 1, z: 0 }, 'compressed', new Vector3());
    expect(w.x).toBeCloseTo(0);
    expect(w.z).toBeCloseTo(-orbitDistance(1, 'compressed'));
  });
});
