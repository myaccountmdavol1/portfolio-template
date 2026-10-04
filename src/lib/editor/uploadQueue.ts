/**
 * Runs `worker` over `items`, at most `concurrency` at a time. Results keep the input order; an item whose
 * worker threw leaves `undefined` in its slot and is collected in `failed` (so the caller can retry just those).
 * `onSettled(done)` fires after each item finishes, success or not.
 */
export async function runQueue<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency: number,
  onSettled?: (done: number) => void,
): Promise<{ results: (R | undefined)[]; failed: T[] }> {
  const results: (R | undefined)[] = new Array(items.length).fill(undefined);
  const failedAt: number[] = [];
  let next = 0;
  let done = 0;

  async function lane() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = await worker(items[i]);
      } catch (err) {
        console.error('Upload failed', err);
        failedAt.push(i);
      }
      onSettled?.(++done);
    }
  }

  const lanes = Math.max(1, Math.min(Math.floor(concurrency) || 1, items.length));
  await Promise.all(Array.from({ length: lanes }, lane));
  return { results, failed: failedAt.sort((a, b) => a - b).map((i) => items[i]) };
}
