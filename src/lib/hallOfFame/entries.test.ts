import { describe, expect, it } from 'vitest';
import { MAX_NAME, parseHallSubmission, toPublicEntry } from './entries';

describe('Hall of Fame submissions', () => {
  it('cleans the name and note, and keeps a sensible time', () => {
    const r = parseHallSubmission({ name: '  Sam <b>  Lee ', note: 'Loved\nit', finishedInMs: 252000.4 });
    expect(r).toEqual({ ok: true, entry: { name: 'Sam b Lee', note: 'Loved it', finishedInMs: 252000 } });
  });

  it('needs a name, caps lengths, and drops nonsense times', () => {
    expect(parseHallSubmission({ name: '   ' }).ok).toBe(false);
    expect(parseHallSubmission(null).ok).toBe(false);
    const long = parseHallSubmission({ name: 'x'.repeat(100), finishedInMs: -5 });
    expect(long.ok && long.entry.name.length).toBe(MAX_NAME);
    expect(long.ok && long.entry.finishedInMs).toBeUndefined();
    const huge = parseHallSubmission({ name: 'A', finishedInMs: 1e15 });
    expect(huge.ok && huge.entry.finishedInMs).toBeUndefined();
  });

  it('shares only public fields', () => {
    const pub = toPublicEntry({ id: '1', name: 'A', createdAt: '2026-09-30T00:00:00.000Z', status: 'approved' });
    expect(pub).not.toHaveProperty('status');
  });
});
