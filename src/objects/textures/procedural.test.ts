import { describe, expect, it } from 'vitest';
import { PLANETS } from '../../data/planets';
import { generateSaturnRing, generateSurface } from './procedural';

const procedural = PLANETS.flatMap((p) => (p.surface.kind === 'image' ? [] : [p.surface]));

describe('generateSurface', () => {
  it.each(procedural.map((s, i) => [s.kind, s, i] as const))(
    'fills an opaque RGBA buffer (%s #%#)',
    (_kind, spec, seed) => {
      const px = generateSurface(spec, seed, 64, 32);
      expect(px).toHaveLength(64 * 32 * 4);
      for (let i = 3; i < px.length; i += 4) expect(px[i]).toBe(255);
    },
  );

  it('is deterministic for a given seed', () => {
    const spec = procedural[0];
    expect(generateSurface(spec, 5, 32, 16)).toEqual(generateSurface(spec, 5, 32, 16));
    expect(generateSurface(spec, 5, 32, 16)).not.toEqual(generateSurface(spec, 6, 32, 16));
  });

  it('wraps seamlessly across the date line', () => {
    const width = 256;
    const height = 128;
    const px = generateSurface(procedural[0], 3, width, height);
    let maxDiff = 0;
    for (let y = 0; y < height; y++) {
      const first = y * width * 4;
      const last = (y * width + width - 1) * 4;
      for (let c = 0; c < 3; c++)
        maxDiff = Math.max(maxDiff, Math.abs(px[first + c] - px[last + c]));
    }
    expect(maxDiff).toBeLessThan(40);
  });
});

describe('generateSaturnRing', () => {
  it('leaves the Cassini division nearly transparent and the B ring dense', () => {
    const inner = 74_500;
    const outer = 140_220;
    const width = 1024;
    const px = generateSaturnRing(inner, outer, width);
    const alphaAt = (km: number) =>
      px[Math.floor(((km - inner) / (outer - inner)) * width) * 4 + 3];
    expect(alphaAt(119_000)).toBeLessThan(40);
    expect(alphaAt(105_000)).toBeGreaterThan(180);
  });
});
