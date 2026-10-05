import * as THREE from 'three';
import type { ProceduralSurface } from '../../data/planets';
import { generateSaturnRing } from './procedural';
import type { SurfaceJob, SurfaceResult } from './surface.worker';

const SURFACE_WIDTH = 1024;
const SURFACE_HEIGHT = 512;
const RING_WIDTH = 1024;

/**
 * Surface textures take ~0.4 s each to generate, so they are built in a
 * small worker pool instead of blocking the first frame.
 */
class SurfaceWorkerPool {
  private readonly workers: Worker[] = [];
  private readonly pending = new Map<number, (pixels: Uint8ClampedArray) => void>();
  private nextId = 0;

  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      const worker = new Worker(new URL('./surface.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = (event: MessageEvent<SurfaceResult>) => {
        this.pending.get(event.data.id)?.(event.data.pixels);
        this.pending.delete(event.data.id);
      };
      this.workers.push(worker);
    }
  }

  generate(job: Omit<SurfaceJob, 'id'>): Promise<Uint8ClampedArray> {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.workers[id % this.workers.length].postMessage({ ...job, id } satisfies SurfaceJob);
    });
  }
}

let pool: SurfaceWorkerPool | null = null;

export async function createSurfaceTexture(
  spec: ProceduralSurface,
  seed: number,
): Promise<THREE.DataTexture> {
  pool ??= new SurfaceWorkerPool(Math.min(4, navigator.hardwareConcurrency || 2));
  const pixels = await pool.generate({
    spec,
    seed,
    width: SURFACE_WIDTH,
    height: SURFACE_HEIGHT,
  });
  return toTexture(pixels, SURFACE_WIDTH, SURFACE_HEIGHT);
}

export function createSaturnRingTexture(innerKm: number, outerKm: number): THREE.DataTexture {
  return toTexture(generateSaturnRing(innerKm, outerKm, RING_WIDTH), RING_WIDTH, 1);
}

/**
 * Sets a procedural map on a material once it is ready. Until then the
 * material shows `placeholder`, roughly the surface's average colour.
 */
export function applySurfaceTexture(
  material: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial,
  spec: ProceduralSurface,
  seed: number,
): void {
  material.color.set(spec.palette[Math.floor(spec.palette.length / 2)]);
  void createSurfaceTexture(spec, seed).then((texture) => {
    material.map = texture;
    material.color.set(0xffffff);
    material.needsUpdate = true;
  });
}

function toTexture(pixels: Uint8ClampedArray, width: number, height: number): THREE.DataTexture {
  const texture = new THREE.DataTexture(pixels, width, height);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}
