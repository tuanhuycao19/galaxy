/**
 * Keplerian orbit propagation (two-body, no perturbations). Accurate to a
 * fraction of a degree for the major planets over a few centuries — plenty
 * for visualisation.
 */

export interface OrbitalElements {
  semiMajorAxisAu: number;
  eccentricity: number;
  inclinationDeg: number;
  /** Mean longitude L at the J2000 epoch. */
  meanLongitudeDeg: number;
  /** Longitude of perihelion ϖ = Ω + ω. */
  longitudeOfPerihelionDeg: number;
  /** Longitude of the ascending node Ω. */
  longitudeOfAscendingNodeDeg: number;
  periodDays: number;
}

/** Heliocentric ecliptic coordinates in AU (x towards the vernal equinox, z towards ecliptic north). */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;

/** Solves Kepler's equation M = E − e·sin(E) for the eccentric anomaly E (radians). */
export function solveKepler(meanAnomaly: number, eccentricity: number, tolerance = 1e-10): number {
  const m = normalizeAngle(meanAnomaly);
  let e = eccentricity < 0.8 ? m : Math.PI;
  for (let i = 0; i < 30; i++) {
    const delta = (e - eccentricity * Math.sin(e) - m) / (1 - eccentricity * Math.cos(e));
    e -= delta;
    if (Math.abs(delta) < tolerance) break;
  }
  return e;
}

/** Mean anomaly (radians) at `daysSinceJ2000`. */
export function meanAnomalyAt(el: OrbitalElements, daysSinceJ2000: number): number {
  const meanLongitude = el.meanLongitudeDeg * DEG + (TWO_PI * daysSinceJ2000) / el.periodDays;
  return normalizeAngle(meanLongitude - el.longitudeOfPerihelionDeg * DEG);
}

/** Position on the orbit for a given eccentric anomaly (radians). */
export function positionFromEccentricAnomaly(el: OrbitalElements, eccentricAnomaly: number): Vec3 {
  const a = el.semiMajorAxisAu;
  const e = el.eccentricity;
  // Coordinates in the orbital plane, x towards perihelion.
  const xp = a * (Math.cos(eccentricAnomaly) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(eccentricAnomaly);

  const node = el.longitudeOfAscendingNodeDeg * DEG;
  const argPeri = (el.longitudeOfPerihelionDeg - el.longitudeOfAscendingNodeDeg) * DEG;
  const inc = el.inclinationDeg * DEG;

  const cosW = Math.cos(argPeri);
  const sinW = Math.sin(argPeri);
  const cosO = Math.cos(node);
  const sinO = Math.sin(node);
  const cosI = Math.cos(inc);
  const sinI = Math.sin(inc);

  return {
    x: (cosW * cosO - sinW * sinO * cosI) * xp + (-sinW * cosO - cosW * sinO * cosI) * yp,
    y: (cosW * sinO + sinW * cosO * cosI) * xp + (-sinW * sinO + cosW * cosO * cosI) * yp,
    z: sinW * sinI * xp + cosW * sinI * yp,
  };
}

/** Heliocentric ecliptic position (AU) at `daysSinceJ2000`. */
export function heliocentricPosition(el: OrbitalElements, daysSinceJ2000: number): Vec3 {
  const eccentricAnomaly = solveKepler(meanAnomalyAt(el, daysSinceJ2000), el.eccentricity);
  return positionFromEccentricAnomaly(el, eccentricAnomaly);
}

/** Closed polyline tracing the full orbit, for drawing orbit lines. */
export function orbitPath(el: OrbitalElements, segments: number): Vec3[] {
  const points: Vec3[] = [];
  for (let i = 0; i < segments; i++) {
    points.push(positionFromEccentricAnomaly(el, (i / segments) * TWO_PI));
  }
  return points;
}

function normalizeAngle(angle: number): number {
  const a = angle % TWO_PI;
  return a < 0 ? a + TWO_PI : a;
}
