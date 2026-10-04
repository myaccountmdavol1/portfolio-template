import { describe, expect, it } from 'vitest';
import { runQueue } from './uploadQueue';

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe('runQueue', () => {
  it('keeps results in input order even when workers finish out of order', async () => {
    const { results, failed } = await runQueue([30, 5, 15, 1], async (n) => {
      await new Promise((r) => setTimeout(r, n));
      return n * 2;
    }, 3);
    expect(results).toEqual([60, 10, 30, 2]);
    expect(failed).toEqual([]);
  });

  it('never runs more than `concurrency` workers at once', async () => {
    let running = 0;
    let peak = 0;
    await runQueue([...Array(10).keys()], async () => {
      running++;
      peak = Math.max(peak, running);
      await tick();
      running--;
    }, 3);
    expect(peak).toBe(3);
  });

  it('collects failures, leaves their slot undefined, and keeps going', async () => {
    const { results, failed } = await runQueue(['a', 'bad', 'c', 'bad2'], async (s) => {
      if (s.startsWith('bad')) throw new Error('nope');
      return s.toUpperCase();
    }, 2);
    expect(results).toEqual(['A', undefined, 'C', undefined]);
    expect(failed).toEqual(['bad', 'bad2']);
  });

  it('handles an empty list and a concurrency larger than the list', async () => {
    expect(await runQueue([], async () => 1, 3)).toEqual({ results: [], failed: [] });
    expect((await runQueue([1, 2], async (n) => n, 10)).results).toEqual([1, 2]);
  });

  it('treats a concurrency below 1 as 1', async () => {
    expect((await runQueue([1, 2, 3], async (n) => n, 0)).results).toEqual([1, 2, 3]);
  });

  it('reports progress after each item settles', async () => {
    const seen: number[] = [];
    await runQueue([1, 2, 3], async (n) => n, 2, (done) => seen.push(done));
    expect(seen).toEqual([1, 2, 3]);
  });
});
