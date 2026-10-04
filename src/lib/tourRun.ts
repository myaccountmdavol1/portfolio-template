import type { ResolvedStop } from './tour';

// The tour's running order, kept apart from the DOM so it can be tested: for each stop, put away what's open,
// point at the stop's icon, open it, show the caption, wait. Stopping (the signal) ends it at the next step.

/** Before clicking, the hand rests a moment; then a short press. */
export const PRE_CLICK_MS = 130;
export const PRESS_MS = 90;

export interface TourIO {
  /** Close every window or sheet, so the next icon is in view. */
  closeAll(): void;
  /** Glide (or jump) to the stop's icon and press it. */
  pointAt(stop: ResolvedStop, index: number): Promise<void>;
  /** Open the stop, silently. */
  open(stop: ResolvedStop): void;
  /** The stop now showing (caption + position), or null while moving to stop `index`. */
  show(stop: ResolvedStop | null, index: number): void;
  /** Wait, honouring pause; resolves early when stopped. */
  sleep(ms: number): Promise<void>;
}

export type TourResult = 'finished' | 'stopped';

export async function runTour(stops: ResolvedStop[], io: TourIO, signal: AbortSignal): Promise<TourResult> {
  for (const [index, stop] of stops.entries()) {
    if (signal.aborted) return 'stopped';
    io.closeAll();
    io.show(null, index);
    await io.pointAt(stop, index);
    if (signal.aborted) return 'stopped';
    io.open(stop);
    io.show(stop, index);
    await io.sleep(stop.seconds * 1000);
  }
  return signal.aborted ? 'stopped' : 'finished';
}

export interface TourClock {
  /** Tour time in ms: stands still while paused. */
  now(): number;
  readonly paused: boolean;
  pause(): void;
  resume(): void;
  /** Resolves after `ms` of tour time, or as soon as `signal` aborts. */
  sleep(ms: number, signal: AbortSignal): Promise<void>;
}

/** A clock that pauses: sleeps and animations measured with it simply wait while the tour is paused. */
export function createTourClock(realNow: () => number = () => Date.now()): TourClock {
  let pausedAt: number | null = null;
  let pausedFor = 0;
  const waiting = new Set<() => void>();
  const now = () => (pausedAt ?? realNow()) - pausedFor;
  return {
    now,
    get paused() {
      return pausedAt !== null;
    },
    pause() {
      if (pausedAt === null) pausedAt = realNow();
    },
    resume() {
      if (pausedAt === null) return;
      pausedFor += realNow() - pausedAt;
      pausedAt = null;
      const wake = [...waiting];
      waiting.clear();
      wake.forEach((f) => f());
    },
    sleep(ms, signal) {
      const end = now() + ms;
      return new Promise<void>((resolve) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const finish = () => {
          clearTimeout(timer);
          waiting.delete(check);
          signal.removeEventListener('abort', finish);
          resolve();
        };
        function check() {
          if (signal.aborted) return finish();
          if (pausedAt !== null) {
            waiting.add(check);
            return;
          }
          const left = end - now();
          if (left <= 0) return finish();
          timer = setTimeout(check, left);
        }
        signal.addEventListener('abort', finish, { once: true });
        check();
      });
    },
  };
}
