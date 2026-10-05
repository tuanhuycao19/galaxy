import { heliocentricPosition, type OrbitalElements, type Vec3 } from './orbit';

/**
 * Body orientation from the IAU WGCCRE model: the north pole's direction
 * (right ascension / declination in the J2000 equatorial frame) and the
 * prime meridian angle W = W0 + Ẇ·d, measured along the body's equator
 * from its ascending node on the Earth's equator. Slow pole precession
 * terms are ignored.
 */
export interface RotationElements {
  poleRaDeg: number;
  poleDecDeg: number;
  w0Deg: number;
  /** Negative for retrograde rotators (Venus, Uranus). */
  wRateDegPerDay: number;
}

/**
 * Body-fixed axes in heliocentric ecliptic coordinates (same frame as
 * `heliocentricPosition`): `y` is the north pole, `x` the node where W is
 * measured from, `z = x × y`. A point at longitude 0 on the equator sits
 * at `cos W · x − sin W · z`.
 */
export interface BodyFrame {
  x: Vec3;
  y: Vec3;
  z: Vec3;
}

const DEG = Math.PI / 180;
/** Obliquity of the ecliptic at J2000. */
const OBLIQUITY = 23.43928 * DEG;

export function bodyFrame(el: RotationElements): BodyFrame {
  const ra = el.poleRaDeg * DEG;
  const dec = el.poleDecDeg * DEG;
  const pole = equatorialToEcliptic({
    x: Math.cos(dec) * Math.cos(ra),
    y: Math.cos(dec) * Math.sin(ra),
    z: Math.sin(dec),
  });
  // Ascending node of the body's equator on the Earth's equator: RA α0 + 90°.
  const node = equatorialToEcliptic({ x: -Math.sin(ra), y: Math.cos(ra), z: 0 });
  return { x: node, y: pole, z: cross(node, pole) };
}

/** Prime meridian angle in radians, wrapped to [0, 2π). */
export function primeMeridianAngle(el: RotationElements, daysSinceJ2000: number): number {
  const deg = (el.w0Deg + el.wRateDegPerDay * daysSinceJ2000) % 360;
  return (deg < 0 ? deg + 360 : deg) * DEG;
}

/** Unit vector from the body's centre to a surface point (planetocentric lat/lon, east-positive). */
export function surfaceNormal(
  frame: BodyFrame,
  primeMeridian: number,
  latDeg: number,
  lonDeg: number,
): Vec3 {
  const lat = latDeg * DEG;
  const theta = primeMeridian + lonDeg * DEG;
  const c = Math.cos(lat);
  const a = c * Math.cos(theta);
  const b = -c * Math.sin(theta);
  const s = Math.sin(lat);
  return {
    x: a * frame.x.x + b * frame.z.x + s * frame.y.x,
    y: a * frame.x.y + b * frame.z.y + s * frame.y.y,
    z: a * frame.x.z + b * frame.z.z + s * frame.y.z,
  };
}

export interface LocalSun {
  /** Unit direction to the Sun in the local frame. */
  east: number;
  north: number;
  up: number;
  elevationDeg: number;
  /** Clockwise from north: 90 = east, 180 = south. */
  azimuthDeg: number;
}

/** Where the Sun stands in the sky at a site on a planet. */
export function localSun(
  orbit: OrbitalElements,
  rotation: RotationElements,
  latDeg: number,
  lonDeg: number,
  daysSinceJ2000: number,
): LocalSun {
  const frame = bodyFrame(rotation);
  const up = surfaceNormal(frame, primeMeridianAngle(rotation, daysSinceJ2000), latDeg, lonDeg);
  const north = normalize(sub(frame.y, scale(up, dot(frame.y, up))));
  const east = cross(north, up);
  const sun = normalize(scale(heliocentricPosition(orbit, daysSinceJ2000), -1));

  const e = dot(sun, east);
  const n = dot(sun, north);
  const u = dot(sun, up);
  const azimuth = Math.atan2(e, n) / DEG;
  return {
    east: e,
    north: n,
    up: u,
    elevationDeg: Math.asin(Math.max(-1, Math.min(1, u))) / DEG,
    azimuthDeg: azimuth < 0 ? azimuth + 360 : azimuth,
  };
}

function equatorialToEcliptic(v: Vec3): Vec3 {
  const c = Math.cos(OBLIQUITY);
  const s = Math.sin(OBLIQUITY);
  return { x: v.x, y: v.y * c + v.z * s, z: -v.y * s + v.z * c };
}

export const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const scale = (a: Vec3, k: number): Vec3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const normalize = (a: Vec3): Vec3 => scale(a, 1 / Math.hypot(a.x, a.y, a.z));
