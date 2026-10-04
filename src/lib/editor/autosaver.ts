export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'retrying';

export const SAVE_STATUS_LABEL: Record<SaveStatus, string> = {
  saved: 'Saved',
  unsaved: 'Unsaved changes',
  saving: 'Saving…',
  retrying: 'Not saved — retrying',
};

export function retryDelayMs(attempt: number): number {
  return Math.min(30_000, 2000 * 2 ** Math.max(0, attempt - 1));
}

export interface Autosaver<T> {
  update(value: T): void;
  /** Saves any pending value now. Rejects if that save fails (the retry schedule continues). */
  flush(): Promise<void>;
  dispose(): void;
}

interface AutosaverOptions<T> {
  save: (value: T) => Promise<void>;
  onStatus: (status: SaveStatus) => void;
  debounceMs?: number;
}

export function createAutosaver<T>({ save, onStatus, debounceMs = 2000 }: AutosaverOptions<T>): Autosaver<T> {
  let pending: { value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<void> | null = null;
  let attempt = 0;
  let disposed = false;

  function clearTimer() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  function schedule(ms: number) {
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      void run();
    }, ms);
  }

  /** Saves the pending value, if any. Resolves true when everything is saved. */
  async function run(): Promise<boolean> {
    while (inFlight) await inFlight;
    if (disposed) return false;
    if (!pending) return true;
    const current = pending;
    pending = null;
    onStatus('saving');
    let ok = true;
    inFlight = save(current.value).catch((err: unknown) => {
      ok = false;
      console.error('Draft save failed', err);
    });
    await inFlight;
    inFlight = null;
    if (disposed) return false;
    if (ok) {
      attempt = 0;
      if (pending) {
        onStatus('unsaved');
        schedule(debounceMs);
      } else {
        onStatus('saved');
      }
      return true;
    }
    pending ??= current; // keep a newer edit if one arrived meanwhile
    attempt += 1;
    onStatus('retrying');
    schedule(retryDelayMs(attempt));
    return false;
  }

  return {
    update(value) {
      if (disposed) return;
      pending = { value };
      // While retrying, keep the backoff timer; the retry picks up the newest value.
      if (attempt === 0) {
        onStatus('unsaved');
        schedule(debounceMs);
      }
    },
    async flush() {
      clearTimer();
      if (!(await run())) throw new Error('Could not save your draft');
    },
    dispose() {
      disposed = true;
      clearTimer();
    },
  };
}
