import type { ProceduralSurface } from '../../data/planets';

/**
 * Procedural equirectangular textures as raw RGBA pixels. Pure and
 * DOM-free so it can run in a worker. Noise is sampled on the unit sphere,
 * so maps wrap seamlessly at the date line and do not pinch at the poles.
 *
 * Rows run bottom-up (row 0 = south pole), matching THREE.DataTexture,
 * which is uploaded without a vertical flip.
 */

const DEG = Math.PI / 180;

export function generateSurface(
  spec: ProceduralSurface,
  seed: number,
  width: number,
  height: number,
): Uint8ClampedArray {
  const noise = new Noise(seed);
  const palette = spec.palette.map(toRgb);
  const spotColor = spec.kind === 'banded' && spec.spot ? toRgb(spec.spot.color) : null;
  const px = new Uint8ClampedArray(width * height * 4);
  const rgb: Rgb = [0, 0, 0];

  for (let y = 0; y < height; y++) {
    const lat = ((y + 0.5) / height) * Math.PI - Math.PI / 2;
    const cosLat = Math.cos(lat);
    const sinLat = Math.sin(lat);
    for (let x = 0; x < width; x++) {
      const lon = ((x + 0.5) / width) * Math.PI * 2;
      const sx = cosLat * Math.cos(lon);
      const sz = cosLat * Math.sin(lon);

      if (spec.kind === 'rocky') {
        const f = spec.frequency;
        const coarse = noise.fbm(sx * f, sinLat * f, sz * f, 5);
        const fine = noise.fbm(sx * f * 4 + 17, sinLat * f * 4, sz * f * 4, 3);
        sampleGradient(palette, stretch(0.7 * coarse + 0.3 * fine), rgb);
        if (spec.polarCapLatDeg !== undefined) {
          const edge = spec.polarCapLatDeg + (coarse - 0.5) * 8;
          const ice = smoothstep(edge - 2, edge + 2, Math.abs(lat) / DEG);
          mixInto(rgb, [240, 240, 245], ice);
        }
      } else {
        // Stretch noise along the equator so features streak like cloud bands.
        const swirl = noise.fbm(sx * 2, sinLat * 10, sz * 2, 4) - 0.5;
        const v = (sinLat + 1) / 2 + swirl * spec.turbulence * 0.12;
        sampleGradient(palette, clamp01(v), rgb);
        const shade = 0.9 + 0.2 * noise.fbm(sx * 6 + 31, sinLat * 30, sz * 6, 3);
        rgb[0] *= shade;
        rgb[1] *= shade;
        rgb[2] *= shade;
        if (spec.spot && spotColor) {
          const s = spec.spot;
          const dLon = wrapPi(lon - s.lonDeg * DEG) / ((s.widthDeg / 2) * DEG);
          const dLat = (lat - s.latDeg * DEG) / ((s.heightDeg / 2) * DEG);
          const d = dLon * dLon + dLat * dLat;
          mixInto(rgb, spotColor, smoothstep(1, 0.4, d) * (0.75 + 0.25 * swirl));
        }
      }

      const i = (y * width + x) * 4;
      px[i] = rgb[0];
      px[i + 1] = rgb[1];
      px[i + 2] = rgb[2];
      px[i + 3] = 255;
    }
  }

  return px;
}

/**
 * Radial texture for Saturn's rings: u = 0 at the inner edge (C ring),
 * u = 1 at the outer edge (F ring). Alpha encodes ring density.
 */
export function generateSaturnRing(
  innerKm: number,
  outerKm: number,
  width: number,
): Uint8ClampedArray {
  const noise = new Noise(7);
  const px = new Uint8ClampedArray(width * 4);
  const dim = toRgb(0x8a7d6b);
  const bright = toRgb(0xe3d3b0);
  const mid = toRgb(0xc9b893);

  for (let x = 0; x < width; x++) {
    const r = innerKm + ((x + 0.5) / width) * (outerKm - innerKm);
    let color: Rgb;
    let alpha: number;
    if (r < 92_000)
      [color, alpha] = [dim, 0.15 + 0.15 * ((r - 74_500) / 17_500)]; // C ring
    else if (r < 117_580)
      [color, alpha] = [bright, 0.9]; // B ring
    else if (r < 122_170)
      [color, alpha] = [dim, 0.06]; // Cassini division
    else if (r > 133_400 && r < 133_700)
      [color, alpha] = [dim, 0.05]; // Encke gap
    else if (r < 136_775)
      [color, alpha] = [mid, 0.65]; // A ring
    else if (r > 139_800)
      [color, alpha] = [mid, 0.35]; // F ring
    else [color, alpha] = [mid, 0];

    // Low-frequency ringlets; finer detail aliases into moiré at grazing angles.
    const grain = 0.85 + 0.3 * noise.fbm(x * 0.06, 0.5, 0.5, 3);
    px[x * 4] = color[0] * grain;
    px[x * 4 + 1] = color[1] * grain;
    px[x * 4 + 2] = color[2] * grain;
    px[x * 4 + 3] = 255 * clamp01(alpha * grain);
  }

  return px;
}

type Rgb = [number, number, number];

class Noise {
  constructor(private readonly seed: number) {}

  /** Fractal Brownian motion in [0, 1]. */
  fbm(x: number, y: number, z: number, octaves: number): number {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * this.value(x, y, z);
      norm += amp;
      amp *= 0.5;
      x *= 2.03;
      y *= 2.03;
      z *= 2.03;
    }
    return sum / norm;
  }

  /** Smoothly interpolated 3D value noise in [0, 1]. */
  value(x: number, y: number, z: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const u = fade(x - xi);
    const v = fade(y - yi);
    const w = fade(z - zi);
    const x1 = xi + 1;
    const y1 = yi + 1;
    const z1 = zi + 1;
    const x00 = lerp(this.hash(xi, yi, zi), this.hash(x1, yi, zi), u);
    const x10 = lerp(this.hash(xi, y1, zi), this.hash(x1, y1, zi), u);
    const x01 = lerp(this.hash(xi, yi, z1), this.hash(x1, yi, z1), u);
    const x11 = lerp(this.hash(xi, y1, z1), this.hash(x1, y1, z1), u);
    return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
  }

  private hash(x: number, y: number, z: number): number {
    let h =
      (this.seed +
        Math.imul(x, 374_761_393) +
        Math.imul(y, 668_265_263) +
        Math.imul(z, 1_274_126_177)) |
      0;
    h = Math.imul(h ^ (h >>> 13), 1_274_126_177);
    h ^= h >>> 16;
    return (h >>> 0) / 4_294_967_296;
  }
}

function sampleGradient(stops: Rgb[], t: number, out: Rgb): void {
  const pos = t * (stops.length - 1);
  const i = Math.min(Math.floor(pos), stops.length - 2);
  const f = pos - i;
  const a = stops[i];
  const b = stops[i + 1];
  out[0] = lerp(a[0], b[0], f);
  out[1] = lerp(a[1], b[1], f);
  out[2] = lerp(a[2], b[2], f);
}

function mixInto(out: Rgb, color: Rgb, t: number): void {
  out[0] = lerp(out[0], color[0], t);
  out[1] = lerp(out[1], color[1], t);
  out[2] = lerp(out[2], color[2], t);
}

function toRgb(hex: number): Rgb {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

/** Value noise clusters around 0.5; spread it to use the whole palette. */
function stretch(n: number): number {
  return clamp01((n - 0.3) / 0.4);
}

function wrapPi(a: number): number {
  return a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const fade = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smoothstep = (e0: number, e1: number, x: number) => fade(clamp01((x - e0) / (e1 - e0)));
