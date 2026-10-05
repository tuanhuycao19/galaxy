export interface PlanetData {
  name: string;
  /** Mean radius in km. */
  radiusKm: number;
  /** Semi-major axis in AU. */
  semiMajorAxisAu: number;
  /** Sidereal orbital period in Earth days. */
  orbitalPeriodDays: number;
  /** Sidereal rotation period in hours (negative = retrograde). */
  rotationPeriodHours: number;
  /** Axial tilt in degrees. */
  axialTiltDeg: number;
  /** Placeholder colour until textures arrive in phase 2. */
  color: number;
}

export const SUN_RADIUS_KM = 695_700;
export const EARTH_RADIUS_KM = 6_371;

export const PLANETS: readonly PlanetData[] = [
  {
    name: 'Sao Thủy',
    radiusKm: 2_439.7,
    semiMajorAxisAu: 0.387,
    orbitalPeriodDays: 87.97,
    rotationPeriodHours: 1_407.6,
    axialTiltDeg: 0.03,
    color: 0x9e9e9e,
  },
  {
    name: 'Sao Kim',
    radiusKm: 6_051.8,
    semiMajorAxisAu: 0.723,
    orbitalPeriodDays: 224.7,
    rotationPeriodHours: -5_832.5,
    axialTiltDeg: 177.4,
    color: 0xe3c07b,
  },
  {
    name: 'Trái Đất',
    radiusKm: 6_371,
    semiMajorAxisAu: 1.0,
    orbitalPeriodDays: 365.26,
    rotationPeriodHours: 23.93,
    axialTiltDeg: 23.44,
    color: 0x3a7bd5,
  },
  {
    name: 'Sao Hỏa',
    radiusKm: 3_389.5,
    semiMajorAxisAu: 1.524,
    orbitalPeriodDays: 686.98,
    rotationPeriodHours: 24.62,
    axialTiltDeg: 25.19,
    color: 0xc1440e,
  },
  {
    name: 'Sao Mộc',
    radiusKm: 69_911,
    semiMajorAxisAu: 5.204,
    orbitalPeriodDays: 4_332.59,
    rotationPeriodHours: 9.93,
    axialTiltDeg: 3.13,
    color: 0xd8ca9d,
  },
  {
    name: 'Sao Thổ',
    radiusKm: 58_232,
    semiMajorAxisAu: 9.583,
    orbitalPeriodDays: 10_759.22,
    rotationPeriodHours: 10.66,
    axialTiltDeg: 26.73,
    color: 0xe8d8a8,
  },
  {
    name: 'Sao Thiên Vương',
    radiusKm: 25_362,
    semiMajorAxisAu: 19.191,
    orbitalPeriodDays: 30_688.5,
    rotationPeriodHours: -17.24,
    axialTiltDeg: 97.77,
    color: 0x9fe3e8,
  },
  {
    name: 'Sao Hải Vương',
    radiusKm: 24_622,
    semiMajorAxisAu: 30.07,
    orbitalPeriodDays: 60_182,
    rotationPeriodHours: 16.11,
    axialTiltDeg: 28.32,
    color: 0x4b70dd,
  },
];
