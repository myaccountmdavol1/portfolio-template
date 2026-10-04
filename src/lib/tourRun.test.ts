import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedStop } from './tour';
import { createTourClock, runTour, type TourIO } from './tourRun';

const stops: ResolvedStop[] = [
  { appId: 'a', caption: 'A', seconds: 3 },
  { appId: 'b', itemKey: 'x', caption: 'B', seconds: 5 },
];

function fakeIO(onSleep?: (ms: number) => void) {
  const log: string[] = [];
  const io: TourIO = {
    closeAll: () => log.push('close'),
    pointAt: async (stop) => {
      log.push(`point ${stop.appId}`);
    },
    open: (stop) => log.push(`open ${stop.appId}${stop.itemKey ? `/${stop.itemKey}` : ''}`),
    show: (stop, i) => log.push(stop ? `caption ${stop.caption} ${i + 1}` : `move ${i + 1}`),
    sleep: async (ms) => {
      log.push(`wait ${ms}`);
      onSleep?.(ms);
    },
  };
  return { io, log };
}

describe('runTour', () => {
  it('closes, points, opens, captions and waits for each stop in order', async () => {
    const { io, log } = fakeIO();
    await expect(runTour(stops, io, new AbortController().signal)).resolves.toBe('finished');
    expect(log).toEqual([
      'close', 'move 1', 'point a', 'open a', 'caption A 1', 'wait 3000',
      'close', 'move 2', 'point b', 'open b/x', 'caption B 2', 'wait 5000',
    ]);
  });

  it('stops at the next step once the signal aborts, leaving the open window alone', async () => {
    const controller = new AbortController();
    const { io, log } = fakeIO(() => controller.abort());
    await expect(runTour(stops, io, controller.signal)).resolves.toBe('stopped');
    expect(log).toEqual(['close', 'move 1', 'point a', 'open a', 'caption A 1', 'wait 3000']);
  });

  it('does not open a stop when stopped while pointing', async () => {
    const controller = new AbortController();
    const { io, log } = fakeIO();
    io.pointAt = async () => {
      log.push('point');
      controller.abort();
    };
    await expect(runTour(stops, io, controller.signal)).resolves.toBe('stopped');
    expect(log).toEqual(['close', 'move 1', 'point']);
  });
});

describe('createTourClock', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sleeps for the given time', async () => {
    const clock = createTourClock();
    let done = false;
    void clock.sleep(1000, new AbortController().signal).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });

  it('stands still while paused', async () => {
    const clock = createTourClock();
    let done = false;
    void clock.sleep(1000, new AbortController().signal).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(400);
    clock.pause();
    expect(clock.paused).toBe(true);
    const t = clock.now();
    await vi.advanceTimersByTimeAsync(5000);
    expect(done).toBe(false);
    expect(clock.now()).toBe(t);
    clock.resume();
    await vi.advanceTimersByTimeAsync(599);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });

  it('wakes a sleep straight away when stopped, even while paused', async () => {
    const clock = createTourClock();
    const controller = new AbortController();
    let done = false;
    void clock.sleep(10_000, controller.signal).then(() => (done = true));
    clock.pause();
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(true);
  });
});
