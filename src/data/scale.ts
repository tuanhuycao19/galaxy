import type * as THREE from 'three';
import type { Vec3 } from '../physics/orbit';
import { EARTH_RADIUS_KM } from './planets';

/**
 * Two ways to map real sizes and distances into scene units:
 *
 * - `compressed`: radii and distances are squashed with power curves so
 *   everything is visible at once (Earth ≈ 0.6 units, orbit ≈ 28 units).
 * - `true`: one linear scale for everything (1 AU = 5 units), so planets
 *   become specks — Earth's radius is about 0.0002 units.
 *
 * Both modes put Neptune's orbit at ~150 units, so the overview framing
 * works for either.
 */
export type ScaleMode = 'compressed' | 'true';

const KM_PER_AU = 149_597_870.7;
const TRUE_UNITS_PER_AU = 5;

const COMPRESSED_SUN_RADIUS = 5;
const PLANET_RADIUS_FACTOR = 0.6;
const ORBIT_OFFSET = 10;
const ORBIT_FACTOR = 18;
const ORBIT_EXPONENT = 0.6;
/** Compressed Moon orbit, in Earth radii (real: ~60). */
const COMPRESSED_MOON_DISTANCE = 2.6;

/** Sun radius in scene units. */
export function sunRadius(mode: ScaleMode): number {
  return mode === 'compressed' ? COMPRESSED_SUN_RADIUS : kmToTrueUnits(695_700);
}

/** Planet or moon radius in scene units. */
export function bodyRadius(radiusKm: number, mode: ScaleMode): number {
  return mode === 'compressed'
    ? PLANET_RADIUS_FACTOR * Math.sqrt(radiusKm / EARTH_RADIUS_KM)
    : kmToTrueUnits(radiusKm);
}

/** Distance from the Sun in scene units. */
export function orbitDistance(au: number, mode: ScaleMode): number {
  return mode === 'compressed'
    ? ORBIT_OFFSET + ORBIT_FACTOR * Math.pow(au, ORBIT_EXPONENT)
    : au * TRUE_UNITS_PER_AU;
}

/** Moon's distance from its planet's centre, in scene units. */
export function moonDistance(distanceKm: number, parentRadius: number, mode: ScaleMode): number {
  return mode === 'compressed'
    ? parentRadius * COMPRESSED_MOON_DISTANCE
    : kmToTrueUnits(distanceKm);
}

/**
 * Maps a heliocentric ecliptic position (AU) into scene space: keeps the
 * direction, scales the distance, and turns ecliptic-north (z) into +Y.
 */
export function toScenePosition(au: Vec3, mode: ScaleMode, target: THREE.Vector3): THREE.Vector3 {
  const r = Math.hypot(au.x, au.y, au.z);
  if (r === 0) return target.set(0, 0, 0);
  const k = orbitDistance(r, mode) / r;
  return target.set(au.x * k, au.z * k, -au.y * k);
}

function kmToTrueUnits(km: number): number {
  return (km / KM_PER_AU) * TRUE_UNITS_PER_AU;
}
