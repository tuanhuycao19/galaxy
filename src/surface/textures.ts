import * as THREE from 'three';

/** Small tileable textures for the beach scene, generated on the CPU. */

type Painter = (u: number, v: number, rand: () => number) => [number, number, number];

function paint(size: number, painter: Painter, seed: number, colorSpace = true): THREE.DataTexture {
  const rand = mulberry32(seed);
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = painter(x / size, y / size, rand);
      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  if (colorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/** Fine white sand grain; tint comes from the terrain's vertex colours. */
export function sandTexture(): THREE.DataTexture {
  return paint(
    256,
    (_u, _v, rand) => {
      const n = 225 + rand() * 30;
      const speck = rand() < 0.02 ? -60 : 0;
      return [n + speck, n + speck, n + speck];
    },
    11,
  );
}

/** Warm teak deck planks running along the texture's u axis. */
export function woodTexture(): THREE.DataTexture {
  return paint(
    256,
    (u, v, rand) => {
      const plank = Math.floor(v * 8);
      const seam = (v * 8) % 1 < 0.05 ? 0.55 : 1;
      const grain = 0.85 + 0.1 * Math.sin(u * 60 + plank * 7 + Math.sin(u * 9 + plank) * 2);
      const tone = (0.9 + ((plank * 37) % 10) / 60) * grain * seam * (0.97 + rand() * 0.06);
      return [168 * tone, 112 * tone, 70 * tone];
    },
    12,
  );
}

/** Small light-blue mosaic tiles for the pool basin. */
export function poolTileTexture(): THREE.DataTexture {
  return paint(
    256,
    (u, v, rand) => {
      const grout = (u * 16) % 1 < 0.08 || (v * 16) % 1 < 0.08;
      if (grout) return [230, 240, 242];
      const k = rand() * 18;
      return [60 + k, 175 + k, 205 + k];
    },
    13,
  );
}

/** Ringed palm bark. */
export function barkTexture(): THREE.DataTexture {
  return paint(
    128,
    (u, v, rand) => {
      const ring = 0.75 + 0.25 * Math.abs(Math.sin(v * Math.PI * 12));
      const k = ring * (0.9 + rand() * 0.15) * (0.95 + 0.05 * Math.sin(u * 40));
      return [120 * k, 98 * k, 72 * k];
    },
    14,
  );
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}
