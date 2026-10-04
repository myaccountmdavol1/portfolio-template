export const NOTE_COLORS = ['yellow', 'pink', 'green', 'blue', 'purple'] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export const NOTE_COLOR_HEX: Record<NoteColor, string> = {
  yellow: '#fde68a',
  pink: '#fbcfe8',
  green: '#bbf7d0',
  blue: '#bfdbfe',
  purple: '#ddd6fe',
};

export const EMOJI_STICKERS = ['⭐', '🎉', '❤️', '🔥', '👏', '🌈', '😄', '🚀', '☕', '🌸', '🍀', '✨'];
export const MAX_STICKERS = 3;

/** Sticker ids: "emoji:🎉" for built-ins, or the image URL for one of the owner's uploads. */
export function allowedStickers(content: { stickers?: { url: string }[]; emojiStickers?: boolean }): Set<string> {
  return new Set([
    ...(content.emojiStickers === false ? [] : EMOJI_STICKERS.map((e) => `emoji:${e}`)),
    ...(content.stickers ?? []).map((s) => s.url).filter(Boolean),
  ]);
}

/** A guestbook note in Firestore (`guestbook/{id}`). No IPs or visitor identifiers are stored. */
export interface GuestbookNote {
  id: string;
  appId: string;
  name: string;
  message: string;
  color: NoteColor;
  /** A small Freeform drawing as a data: URL (JPEG/PNG/WebP), if the visitor sent one. */
  doodle?: string;
  /** Up to 3 sticker ids (see allowedStickers). */
  stickers?: string[];
  createdAt: string; // ISO 8601
  status: 'pending' | 'approved';
}

/** What visitors can see of an approved note. */
export type PublicNote = Pick<GuestbookNote, 'id' | 'name' | 'message' | 'color' | 'doodle' | 'stickers' | 'createdAt'>;

export const MAX_NAME = 40;
export const MAX_MESSAGE = 280;
export const MAX_DOODLE_CHARS = 300_000; // ~220KB image; Firestore documents max out at 1MB

export interface NoteSubmission {
  appId: string;
  name: string;
  message: string;
  color: NoteColor;
  doodle?: string;
  stickers?: string[];
}

export type ParsedNote = { ok: true; note: NoteSubmission } | { ok: false; error: string };

const DOODLE_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

/** Validates a visitor's note. A note needs a message, a drawing, or both. */
export function parseNoteSubmission(body: unknown): ParsedNote {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request' };
  const b = body as Record<string, unknown>;
  if (typeof b.appId !== 'string' || !b.appId) return { ok: false, error: 'Missing appId' };
  const name = typeof b.name === 'string' ? b.name.replace(/\s+/g, ' ').trim() : '';
  const message = typeof b.message === 'string' ? b.message.trim() : '';
  if (!name) return { ok: false, error: 'Please add your name.' };
  if (name.length > MAX_NAME) return { ok: false, error: `Names can be at most ${MAX_NAME} characters.` };
  if (message.length > MAX_MESSAGE) return { ok: false, error: `Notes can be at most ${MAX_MESSAGE} characters.` };
  const color = NOTE_COLORS.includes(b.color as NoteColor) ? (b.color as NoteColor) : 'yellow';
  let doodle: string | undefined;
  if (b.doodle !== undefined && b.doodle !== null && b.doodle !== '') {
    if (typeof b.doodle !== 'string' || !DOODLE_RE.test(b.doodle)) return { ok: false, error: 'That drawing couldn’t be read.' };
    if (b.doodle.length > MAX_DOODLE_CHARS) return { ok: false, error: 'That drawing is too big to send.' };
    doodle = b.doodle;
  }
  if (!message && !doodle) return { ok: false, error: 'Write a note (or send a drawing).' };
  const stickers = Array.isArray(b.stickers)
    ? [...new Set(b.stickers.filter((s): s is string => typeof s === 'string' && s.length > 0 && s.length <= 2048))].slice(0, MAX_STICKERS)
    : [];
  return { ok: true, note: { appId: b.appId, name, message, color, ...(doodle ? { doodle } : {}), ...(stickers.length ? { stickers } : {}) } };
}

/** Keeps only stickers this guestbook actually offers (so visitors can't inject arbitrary image URLs). */
export function keepAllowedStickers(note: NoteSubmission, allowed: Set<string>): NoteSubmission {
  if (!note.stickers) return note;
  const stickers = note.stickers.filter((s) => allowed.has(s));
  const { stickers: _drop, ...rest } = note;
  return stickers.length ? { ...rest, stickers } : rest;
}

export function toPublicNote(note: GuestbookNote): PublicNote {
  const { id, name, message, color, doodle, stickers, createdAt } = note;
  return { id, name, message, color, createdAt, ...(doodle ? { doodle } : {}), ...(stickers?.length ? { stickers } : {}) };
}
