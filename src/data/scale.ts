import { EARTH_RADIUS_KM } from './planets';

/**
 * Compressed scale: real sizes and distances differ by orders of magnitude,
 * so radii and distances are squashed with power curves to keep everything
 * visible at once. A true-scale mode is planned for phase 3.
 */
export const SUN_RADIUS = 5;

const PLANET_RADIUS_FACTOR = 0.6;
const ORBIT_OFFSET = 10;
const ORBIT_FACTOR = 18;
const ORBIT_EXPONENT = 0.6;

/** Planet radius in scene units (Earth ≈ 0.6). */
export function scaledRadius(radiusKm: number): number {
  return PLANET_RADIUS_FACTOR * Math.sqrt(radiusKm / EARTH_RADIUS_KM);
}

/** Orbit radius in scene units (Earth ≈ 28, Neptune ≈ 149). */
export function scaledDistance(semiMajorAxisAu: number): number {
  return ORBIT_OFFSET + ORBIT_FACTOR * Math.pow(semiMajorAxisAu, ORBIT_EXPONENT);
}
