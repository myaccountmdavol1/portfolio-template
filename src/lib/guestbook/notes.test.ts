import { describe, expect, it } from 'vitest';
import { allowedStickers, keepAllowedStickers, MAX_DOODLE_CHARS, parseNoteSubmission, toPublicNote } from './notes';

const tinyPng = 'data:image/png;base64,iVBORw0KGgo=';

describe('parseNoteSubmission', () => {
  it('accepts a note, trimming whitespace and defaulting the colour', () => {
    expect(parseNoteSubmission({ appId: 'g', name: '  Ada   L ', message: ' Hi! ' })).toEqual({
      ok: true,
      note: { appId: 'g', name: 'Ada L', message: 'Hi!', color: 'yellow' },
    });
  });

  it('accepts a drawing without a message', () => {
    const r = parseNoteSubmission({ appId: 'g', name: 'Ada', message: '', color: 'pink', doodle: tinyPng });
    expect(r.ok && r.note).toMatchObject({ color: 'pink', doodle: tinyPng, message: '' });
  });

  it('rejects missing names, empty notes, long text, and bad or huge drawings', () => {
    expect(parseNoteSubmission({ appId: 'g', name: '', message: 'x' }).ok).toBe(false);
    expect(parseNoteSubmission({ appId: 'g', name: 'A', message: '' }).ok).toBe(false);
    expect(parseNoteSubmission({ appId: 'g', name: 'A'.repeat(41), message: 'x' }).ok).toBe(false);
    expect(parseNoteSubmission({ appId: 'g', name: 'A', message: 'x'.repeat(281) }).ok).toBe(false);
    expect(parseNoteSubmission({ appId: 'g', name: 'A', doodle: 'javascript:alert(1)' }).ok).toBe(false);
    expect(parseNoteSubmission({ appId: 'g', name: 'A', doodle: 'data:image/svg+xml;base64,PHN2Zz4=' }).ok).toBe(false);
    expect(parseNoteSubmission({ appId: 'g', name: 'A', doodle: `data:image/png;base64,${'A'.repeat(MAX_DOODLE_CHARS)}` }).ok).toBe(false);
  });

  it('ignores an unknown colour', () => {
    const r = parseNoteSubmission({ appId: 'g', name: 'A', message: 'x', color: 'red; background:url(x)' });
    expect(r.ok && r.note.color).toBe('yellow');
  });
});

describe('stickers', () => {
  it('parses up to 3 unique stickers', () => {
    const r = parseNoteSubmission({ appId: 'g', name: 'A', message: 'x', stickers: ['emoji:⭐', 'emoji:⭐', 'emoji:🎉', 'emoji:🔥', 'emoji:🌈', 7] });
    expect(r.ok && r.note.stickers).toEqual(['emoji:⭐', 'emoji:🎉', 'emoji:🔥']);
  });

  it('keeps only stickers the guestbook offers', () => {
    const allowed = allowedStickers({ stickers: [{ url: 'https://cdn/cat.png' }], emojiStickers: true });
    const note = { appId: 'g', name: 'A', message: 'x', color: 'yellow' as const, stickers: ['emoji:🎉', 'https://evil/x.png', 'https://cdn/cat.png'] };
    expect(keepAllowedStickers(note, allowed).stickers).toEqual(['emoji:🎉', 'https://cdn/cat.png']);
    expect(keepAllowedStickers(note, allowedStickers({ emojiStickers: false }))).not.toHaveProperty('stickers');
  });
});

describe('toPublicNote', () => {
  it('drops moderation fields', () => {
    const pub = toPublicNote({ id: '1', appId: 'g', name: 'A', message: 'm', color: 'blue', createdAt: '2026-01-01T00:00:00.000Z', status: 'approved' });
    expect(pub).toEqual({ id: '1', name: 'A', message: 'm', color: 'blue', createdAt: '2026-01-01T00:00:00.000Z' });
  });
});
