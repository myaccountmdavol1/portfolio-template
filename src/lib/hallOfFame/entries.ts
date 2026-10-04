// The Hall of Fame: visitors who reached Platinum sign it; the owner approves each name before it shows.

export const MAX_NAME = 40;
export const MAX_NOTE = 80;
const MAX_FINISH_MS = 1000 * 60 * 60 * 24 * 60; // anything longer than 60 days isn't a “time”

/** A Hall of Fame entry in Firestore (`hallOfFame/{id}`). No IPs or visitor identifiers are stored. */
export interface HallEntry {
  id: string;
  name: string;
  note?: string;
  /** How long they took, from their first achievement to Platinum. */
  finishedInMs?: number;
  createdAt: string; // ISO 8601
  status: 'pending' | 'approved';
}

export type PublicHallEntry = Pick<HallEntry, 'id' | 'name' | 'note' | 'finishedInMs' | 'createdAt'>;
export type HallSubmission = Pick<HallEntry, 'name' | 'note' | 'finishedInMs'>;

// Control characters and angle brackets out; whitespace collapsed.
const clean = (s: string, max: number) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim()
    .slice(0, max);

export function parseHallSubmission(body: unknown): { ok: true; entry: HallSubmission } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Something went wrong. Try again?' };
  const b = body as Record<string, unknown>;
  const name = typeof b.name === 'string' ? clean(b.name, MAX_NAME) : '';
  if (!name) return { ok: false, error: 'Add your name first.' };
  const note = typeof b.note === 'string' ? clean(b.note, MAX_NOTE) : '';
  const ms = typeof b.finishedInMs === 'number' && Number.isFinite(b.finishedInMs) ? Math.round(b.finishedInMs) : undefined;
  const finishedInMs = ms !== undefined && ms > 0 && ms <= MAX_FINISH_MS ? ms : undefined;
  return { ok: true, entry: { name, ...(note ? { note } : {}), ...(finishedInMs ? { finishedInMs } : {}) } };
}

export function toPublicEntry(e: HallEntry): PublicHallEntry {
  return { id: e.id, name: e.name, note: e.note, finishedInMs: e.finishedInMs, createdAt: e.createdAt };
}
