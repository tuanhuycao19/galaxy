import * as THREE from 'three';
import type { ProceduralSurface } from '../../data/planets';
import { loadingManager } from '../loading';
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
  private readonly pending = new Map<
    number,
    { resolve: (pixels: Uint8ClampedArray) => void; reject: (error: Error) => void }
  >();
  private nextId = 0;

  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      const worker = new Worker(new URL('./surface.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = (event: MessageEvent<SurfaceResult>) => {
        this.pending.get(event.data.id)?.resolve(event.data.pixels);
        this.pending.delete(event.data.id);
      };
      // A worker that fails to start would otherwise leave its jobs (and the
      // loading screen) waiting forever.
      worker.onerror = (event) => {
        event.preventDefault();
        for (const job of this.pending.values()) job.reject(new Error(event.message));
        this.pending.clear();
      };
      this.workers.push(worker);
    }
  }

  generate(job: Omit<SurfaceJob, 'id'>): Promise<Uint8ClampedArray> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
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
 * Sets a procedural map on a material once it is ready. Until then (or if
 * generation fails) the material shows a flat colour from the palette.
 */
export function applySurfaceTexture(
  material: THREE.MeshStandardMaterial,
  spec: ProceduralSurface,
  seed: number,
): void {
  material.color.set(spec.palette[Math.floor(spec.palette.length / 2)]);
  const item = `procedural:${seed}`;
  loadingManager.itemStart(item);
  createSurfaceTexture(spec, seed)
    .then((texture) => {
      material.map = texture;
      material.color.set(0xffffff);
      material.needsUpdate = true;
    })
    .catch((error: unknown) => {
      console.warn('Procedural texture failed; keeping the flat colour.', error);
      loadingManager.itemError(item);
    })
    .finally(() => loadingManager.itemEnd(item));
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
