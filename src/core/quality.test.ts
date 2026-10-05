import { describe, expect, it, vi } from 'vitest';
import { QualityController } from './quality';

const run = (q: QualityController, seconds: number, fps: number) => {
  for (let t = 0; t < seconds; t += 1 / fps) q.sample(1 / fps);
};

describe('QualityController', () => {
  it('keeps the level while the frame rate is fine', () => {
    const onChange = vi.fn();
    const q = new QualityController('high', onChange);
    run(q, 20, 60);
    expect(q.level).toBe('high');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('steps down one level at a time when the frame rate stays low', () => {
    const onChange = vi.fn();
    const q = new QualityController('high', onChange);
    run(q, 4, 60); // warm-up
    run(q, 4.5, 20);
    expect(q.level).toBe('medium');
    run(q, 4.5, 20);
    expect(q.level).toBe('low');
    expect(onChange.mock.calls).toEqual([['medium'], ['low']]);
  });

  it('ignores slow frames during warm-up and single stalls', () => {
    const q = new QualityController('high', () => {});
    run(q, 3.5, 10);
    q.sample(2); // e.g. the tab was in the background
    run(q, 10, 60);
    expect(q.level).toBe('high');
  });

  it('never changes a manually chosen level', () => {
    const q = new QualityController('high', () => {});
    q.setMode('medium');
    run(q, 20, 10);
    expect(q.level).toBe('medium');
    q.setMode('auto');
    expect(q.level).toBe('high');
  });
});
