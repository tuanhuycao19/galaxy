import type { OrbitalElements } from '../physics/orbit';

/** Hand-made texture recipe, used until a real image map is available. */
export type ProceduralSurface =
  | {
      kind: 'rocky';
      /** Colour stops from low to high noise values. */
      palette: number[];
      /** Base noise frequency; higher = finer detail. */
      frequency: number;
      /** Latitude (deg) above which the surface turns into ice caps. */
      polarCapLatDeg?: number;
    }
  | {
      kind: 'banded';
      /** Colour stops from south pole to north pole. */
      palette: number[];
      /** How strongly noise distorts the bands. */
      turbulence: number;
      /** Optional storm oval, e.g. Jupiter's Great Red Spot. */
      spot?: { latDeg: number; lonDeg: number; widthDeg: number; heightDeg: number; color: number };
    };

export interface ImageSurface {
  kind: 'image';
  /** Paths relative to `public/`. */
  map: string;
  normalMap?: string;
  specularMap?: string;
  cloudsMap?: string;
}

export type SurfaceSpec = ProceduralSurface | ImageSurface;

export interface PlanetData {
  name: string;
  /** Mean radius in km. */
  radiusKm: number;
  /**
   * Sidereal rotation period in hours. Always positive: retrograde spin is
   * encoded by an axial tilt above 90° (IAU convention), as for Venus and Uranus.
   */
  rotationPeriodHours: number;
  /** Axial tilt in degrees, relative to the orbital plane. */
  axialTiltDeg: number;
  /** Keplerian elements at the J2000 epoch. */
  orbit: OrbitalElements;
  surface: SurfaceSpec;
  rings?: { innerRadiusKm: number; outerRadiusKm: number };
  /** Glowing rim on the sunlit side for planets with a thick atmosphere. */
  atmosphere?: { color: number; intensity: number };
  /** Confirmed moons; a trailing "+" because the count keeps growing. */
  moons: string;
  description: string;
}

export const SUN_RADIUS_KM = 695_700;
export const EARTH_RADIUS_KM = 6_371;

// Orbital elements: JPL "Keplerian Elements for Approximate Positions of the
// Major Planets" (Standish), table valid 1800–2050 AD.
export const PLANETS: readonly PlanetData[] = [
  {
    name: 'Sao Thủy',
    moons: '0',
    description:
      'Hành tinh nhỏ nhất và gần Mặt Trời nhất. Gần như không có khí quyển nên nhiệt độ dao động từ khoảng −180 °C đến 430 °C.',
    radiusKm: 2_439.7,
    rotationPeriodHours: 1_407.6,
    axialTiltDeg: 0.03,
    orbit: {
      semiMajorAxisAu: 0.38709927,
      eccentricity: 0.20563593,
      inclinationDeg: 7.00497902,
      meanLongitudeDeg: 252.2503235,
      longitudeOfPerihelionDeg: 77.45779628,
      longitudeOfAscendingNodeDeg: 48.33076593,
      periodDays: 87.969,
    },
    surface: { kind: 'rocky', palette: [0x4a4642, 0x8a837b, 0xb9b2a8], frequency: 6 },
  },
  {
    name: 'Sao Kim',
    moons: '0',
    description:
      'Hành tinh nóng nhất (~465 °C) do hiệu ứng nhà kính của lớp khí quyển CO₂ dày đặc. Tự quay ngược chiều và rất chậm: một ngày dài hơn một năm.',
    radiusKm: 6_051.8,
    rotationPeriodHours: 5_832.5,
    axialTiltDeg: 177.36,
    orbit: {
      semiMajorAxisAu: 0.72333566,
      eccentricity: 0.00677672,
      inclinationDeg: 3.39467605,
      meanLongitudeDeg: 181.9790995,
      longitudeOfPerihelionDeg: 131.60246718,
      longitudeOfAscendingNodeDeg: 76.67984255,
      periodDays: 224.701,
    },
    surface: {
      kind: 'banded',
      palette: [0xc9a46a, 0xe6c88f, 0xf1dcae, 0xe2c085, 0xd1ab70, 0xe8cd98, 0xc9a46a],
      turbulence: 0.35,
    },
    atmosphere: { color: 0xffe2a8, intensity: 0.8 },
  },
  {
    name: 'Trái Đất',
    moons: '1',
    description:
      'Hành tinh duy nhất được biết đến có sự sống, với khoảng 71% bề mặt là nước. Trục nghiêng 23,4° tạo ra các mùa.',
    radiusKm: 6_371,
    rotationPeriodHours: 23.934,
    axialTiltDeg: 23.44,
    orbit: {
      semiMajorAxisAu: 1.00000261,
      eccentricity: 0.01671123,
      inclinationDeg: -0.00001531,
      meanLongitudeDeg: 100.46457166,
      longitudeOfPerihelionDeg: 102.93768193,
      longitudeOfAscendingNodeDeg: 0,
      periodDays: 365.256,
    },
    surface: {
      kind: 'image',
      map: 'textures/earth_atmos_2048.webp',
      normalMap: 'textures/earth_normal_2048.webp',
      specularMap: 'textures/earth_specular_2048.webp',
      cloudsMap: 'textures/earth_clouds_1024.png',
    },
    atmosphere: { color: 0x5aa8ff, intensity: 1.3 },
  },
  {
    name: 'Sao Hỏa',
    moons: '2',
    description:
      'Hành tinh đỏ nhờ bụi oxit sắt. Có núi lửa Olympus Mons cao nhất Hệ Mặt Trời và hai chỏm băng ở hai cực.',
    radiusKm: 3_389.5,
    rotationPeriodHours: 24.623,
    axialTiltDeg: 25.19,
    orbit: {
      semiMajorAxisAu: 1.52371034,
      eccentricity: 0.0933941,
      inclinationDeg: 1.84969142,
      meanLongitudeDeg: -4.55343205,
      longitudeOfPerihelionDeg: -23.94362959,
      longitudeOfAscendingNodeDeg: 49.55953891,
      periodDays: 686.98,
    },
    surface: {
      kind: 'rocky',
      palette: [0x5a2410, 0x9c4a22, 0xc1703c, 0xd99a62],
      frequency: 4,
      polarCapLatDeg: 78,
    },
  },
  {
    name: 'Sao Mộc',
    moons: '95+',
    description:
      'Hành tinh lớn nhất, khối lượng gấp hơn 2 lần tất cả hành tinh khác cộng lại. Vết Đỏ Lớn là một cơn bão lớn hơn cả Trái Đất.',
    radiusKm: 69_911,
    rotationPeriodHours: 9.925,
    axialTiltDeg: 3.13,
    orbit: {
      semiMajorAxisAu: 5.202887,
      eccentricity: 0.04838624,
      inclinationDeg: 1.30439695,
      meanLongitudeDeg: 34.39644051,
      longitudeOfPerihelionDeg: 14.72847983,
      longitudeOfAscendingNodeDeg: 100.47390909,
      periodDays: 4_332.59,
    },
    surface: {
      kind: 'banded',
      palette: [
        0x8a7a66, 0xb89b78, 0xe8dcc4, 0xa86f4c, 0xf0e6d2, 0xc08a5c, 0xeadfc8, 0x9e6a48, 0xe9dcc2,
        0xb48d6c, 0x8a7a66,
      ],
      turbulence: 0.22,
      spot: { latDeg: -22, lonDeg: 60, widthDeg: 22, heightDeg: 11, color: 0xc0583a },
    },
  },
  {
    name: 'Sao Thổ',
    moons: '270+',
    description:
      'Nổi tiếng với hệ vành đai băng và đá rộng hàng trăm nghìn km. Mật độ trung bình nhỏ hơn nước.',
    radiusKm: 58_232,
    rotationPeriodHours: 10.656,
    axialTiltDeg: 26.73,
    orbit: {
      semiMajorAxisAu: 9.53667594,
      eccentricity: 0.05386179,
      inclinationDeg: 2.48599187,
      meanLongitudeDeg: 49.95424423,
      longitudeOfPerihelionDeg: 92.59887831,
      longitudeOfAscendingNodeDeg: 113.66242448,
      periodDays: 10_759.22,
    },
    surface: {
      kind: 'banded',
      palette: [0x9c8a6a, 0xcdb88e, 0xe6d3a6, 0xd4bd8c, 0xeddcb2, 0xcfb688, 0xe3cf9f, 0xb8a37a],
      turbulence: 0.12,
    },
    rings: { innerRadiusKm: 74_500, outerRadiusKm: 140_220 },
  },
  {
    name: 'Sao Thiên Vương',
    moons: '28+',
    description:
      'Hành tinh băng khổng lồ nằm "nghiêng" gần 98°, nên mỗi cực có 42 năm ngày và 42 năm đêm liên tục.',
    radiusKm: 25_362,
    rotationPeriodHours: 17.24,
    axialTiltDeg: 97.77,
    orbit: {
      semiMajorAxisAu: 19.18916464,
      eccentricity: 0.04725744,
      inclinationDeg: 0.77263783,
      meanLongitudeDeg: 313.23810451,
      longitudeOfPerihelionDeg: 170.9542763,
      longitudeOfAscendingNodeDeg: 74.01692503,
      periodDays: 30_688.5,
    },
    surface: {
      kind: 'banded',
      palette: [0x8fd3da, 0xa6e1e6, 0xb3e8ec, 0xa6e1e6, 0x93d6dd],
      turbulence: 0.05,
    },
  },
  {
    name: 'Sao Hải Vương',
    moons: '16',
    description:
      'Hành tinh xa nhất, có gió mạnh nhất Hệ Mặt Trời (hơn 2.000 km/h). Được phát hiện năm 1846 nhờ tính toán toán học.',
    radiusKm: 24_622,
    rotationPeriodHours: 16.11,
    axialTiltDeg: 28.32,
    orbit: {
      semiMajorAxisAu: 30.06992276,
      eccentricity: 0.00859048,
      inclinationDeg: 1.77004347,
      meanLongitudeDeg: -55.12002969,
      longitudeOfPerihelionDeg: 44.96476227,
      longitudeOfAscendingNodeDeg: 131.78422574,
      periodDays: 60_182,
    },
    surface: {
      kind: 'banded',
      palette: [0x2a4fb0, 0x3c66cc, 0x4f7ade, 0x3a62c6, 0x5584e0, 0x3a62c6, 0x2a4fb0],
      turbulence: 0.18,
      spot: { latDeg: -20, lonDeg: 200, widthDeg: 14, heightDeg: 7, color: 0x1c3378 },
    },
  },
];

export const MOON = {
  name: 'Mặt Trăng',
  radiusKm: 1_737.4,
  /** Sidereal month; the Moon is tidally locked so this is also its spin period. */
  orbitalPeriodDays: 27.3217,
  /** Inclination to the ecliptic. */
  inclinationDeg: 5.145,
  /** Mean distance from Earth. */
  distanceKm: 384_400,
  map: 'textures/moon_1024.jpg',
  description:
    'Vệ tinh tự nhiên duy nhất của Trái Đất. Bị khóa thủy triều nên luôn hướng một mặt về phía Trái Đất.',
} as const;

export const SUN = {
  name: 'Mặt Trời',
  radiusKm: SUN_RADIUS_KM,
  /** Sidereal rotation at the solar equator. */
  rotationPeriodDays: 25.38,
  surfaceTemperatureK: 5_772,
  description:
    'Ngôi sao trung tâm, chiếm khoảng 99,86% khối lượng Hệ Mặt Trời. Năng lượng đến từ phản ứng tổng hợp hạt nhân hydro thành heli.',
} as const;
