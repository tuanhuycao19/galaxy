import type { ProceduralSurface } from '../../data/planets';
import { generateSurface } from './procedural';

export interface SurfaceJob {
  id: number;
  spec: ProceduralSurface;
  seed: number;
  width: number;
  height: number;
}

export interface SurfaceResult {
  id: number;
  pixels: Uint8ClampedArray;
}

self.onmessage = (event: MessageEvent<SurfaceJob>) => {
  const { id, spec, seed, width, height } = event.data;
  const pixels = generateSurface(spec, seed, width, height);
  const result: SurfaceResult = { id, pixels };
  self.postMessage(result, { transfer: [pixels.buffer] });
};
