import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutosaver, retryDelayMs, type SaveStatus } from './autosaver';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function setup(save: (v: number) => Promise<void>) {
  const statuses: SaveStatus[] = [];
  const saver = createAutosaver<number>({ save, onStatus: (s) => statuses.push(s) });
  return { saver, statuses };
}

describe('retryDelayMs', () => {
  it('doubles from 2s and caps at 30s', () => {
    expect([1, 2, 3, 4, 5, 10].map(retryDelayMs)).toEqual([2000, 4000, 8000, 16000, 30000, 30000]);
  });
});

describe('createAutosaver', () => {
  it('debounces: saves the latest value once, 2s after the last update', async () => {
    const save = vi.fn(async (_v: number) => {});
    const { saver, statuses } = setup(save);
    saver.update(1);
    await vi.advanceTimersByTimeAsync(1000);
    saver.update(2);
    saver.update(3);
    await vi.advanceTimersByTimeAsync(1999);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(3);
    expect(statuses).toContain('saving');
    expect(statuses.at(-1)).toBe('saved');
  });

  it('retries a failed save with backoff and the newest value', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const save = vi.fn<(v: number) => Promise<void>>().mockRejectedValueOnce(new Error('offline')).mockResolvedValue();
    const { saver, statuses } = setup(save);
    saver.update(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(statuses.at(-1)).toBe('retrying');
    saver.update(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).toHaveBeenLastCalledWith(2);
    expect(statuses.at(-1)).toBe('saved');
  });

  it('saves again when an update arrives during a save', async () => {
    let finish!: () => void;
    const save = vi.fn((_v: number) => new Promise<void>((r) => (finish = r)));
    const { saver, statuses } = setup(save);
    saver.update(1);
    await vi.advanceTimersByTimeAsync(2000);
    saver.update(2);
    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(statuses.at(-1)).toBe('unsaved');
    await vi.advanceTimersByTimeAsync(2000);
    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenLastCalledWith(2);
    expect(statuses.at(-1)).toBe('saved');
  });

  it('flush saves immediately and rejects on failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const save = vi.fn<(v: number) => Promise<void>>().mockResolvedValueOnce().mockRejectedValueOnce(new Error('x'));
    const { saver } = setup(save);
    saver.update(1);
    await saver.flush();
    expect(save).toHaveBeenCalledWith(1);
    saver.update(2);
    await expect(saver.flush()).rejects.toThrow('Could not save your draft');
    saver.dispose();
  });

  it('flush with nothing pending resolves without saving', async () => {
    const save = vi.fn(async (_v: number) => {});
    await setup(save).saver.flush();
    expect(save).not.toHaveBeenCalled();
  });

  it('dispose stops pending saves', async () => {
    const save = vi.fn(async (_v: number) => {});
    const { saver } = setup(save);
    saver.update(1);
    saver.dispose();
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).not.toHaveBeenCalled();
  });
});
