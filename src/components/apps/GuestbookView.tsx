'use client';

import { useEffect, useState } from 'react';
import { rememberVisitorName, trackEvent } from '@/lib/gameEvents';
import { fetchNotes, submitNote } from '@/lib/guestbook/client';
import { allowedStickers, MAX_MESSAGE, MAX_NAME, MAX_STICKERS, NOTE_COLOR_HEX, NOTE_COLORS, type NoteColor, type PublicNote } from '@/lib/guestbook/notes';
import type { GuestbookApp } from '@/lib/types';

/** One sticker: a built-in emoji ("emoji:🎉") or one of the owner's uploaded images (its URL). */
export function Sticker({ id, size }: { id: string; size: number }) {
  if (id.startsWith('emoji:')) {
    return (
      <span aria-hidden className="keep-colors block leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,.2)]" style={{ fontSize: size * 0.85 }}>
        {id.slice('emoji:'.length)}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- the owner's sticker images, from any host
  return <img src={id} alt="" aria-hidden className="block object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,.25)]" style={{ width: size, height: size }} />;
}

// Where stickers land on a note: slapped on the corners at jaunty angles.
const STICKER_SPOTS = [
  { top: -14, right: -10, rotate: 14 },
  { bottom: -12, left: -10, rotate: -12 },
  { top: -14, left: -8, rotate: -8 },
];

/** A small sticky note, slightly rotated like real Stickies. Shared with the editor's moderation list. */
export function StickyCard({ note, index = 0 }: { note: Pick<PublicNote, 'name' | 'message' | 'color' | 'doodle' | 'stickers' | 'createdAt'>; index?: number }) {
  const tilt = [-2, 1.5, -1, 2, -1.5, 1][index % 6];
  return (
    <figure
      className="keep-colors relative m-0 flex flex-col gap-2 p-3.5 text-[#2b2618] shadow-[0_8px_18px_rgba(0,0,0,.12)]"
      style={{ background: NOTE_COLOR_HEX[note.color] ?? NOTE_COLOR_HEX.yellow, transform: `rotate(${tilt}deg)` }}
    >
      {note.stickers?.slice(0, STICKER_SPOTS.length).map((id, i) => {
        const { rotate, ...spot } = STICKER_SPOTS[i];
        return (
          <span key={id} data-testid="note-sticker" className="pointer-events-none absolute z-[1]" style={{ ...spot, transform: `rotate(${rotate}deg)` }}>
            <Sticker id={id} size={38} />
          </span>
        );
      })}
      {note.doodle && (
        // eslint-disable-next-line @next/next/no-img-element -- a visitor's drawing, stored as a data: URL
        <img src={note.doodle} alt={`Drawing by ${note.name}`} className="w-full rounded-sm bg-white" />
      )}
      {note.message && <blockquote className="m-0 whitespace-pre-wrap text-[13px] leading-snug">{note.message}</blockquote>}
      <figcaption className="text-[11px] font-semibold opacity-70">
        — {note.name} · {new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </figcaption>
    </figure>
  );
}

export function GuestbookView({ app }: { app: GuestbookApp }) {
  const c = app.content;
  const [notes, setNotes] = useState<PublicNote[] | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [color, setColor] = useState<NoteColor>('yellow');
  const [stickers, setStickers] = useState<string[]>([]);
  const offered = [...allowedStickers(c)];
  const toggleSticker = (id: string) =>
    setStickers((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX_STICKERS ? [...s, id] : s));
  const [state, setState] = useState<{ kind: 'idle' | 'sending' } | { kind: 'sent'; status: 'pending' | 'approved' } | { kind: 'error'; error: string }>({ kind: 'idle' });

  useEffect(() => {
    let cancelled = false;
    fetchNotes(app.id).then(
      (list) => !cancelled && setNotes(list),
      () => !cancelled && setNotes([]),
    );
    return () => {
      cancelled = true;
    };
  }, [app.id, state.kind]);

  async function send() {
    setState({ kind: 'sending' });
    const result = await submitNote({ appId: app.id, name, message, color, stickers });
    if (result.ok) {
      setState({ kind: 'sent', status: result.status });
      trackEvent({ type: 'guestbook' });
      rememberVisitorName(name);
      setMessage('');
      setStickers([]);
    } else setState({ kind: 'error', error: result.error });
  }

  return (
    <div className="flex flex-col gap-5 bg-[#f3f1ec] p-5 text-[#1d1c1a]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex flex-col gap-2.5 rounded-xl bg-white p-4 shadow-sm"
      >
        <h2 className="m-0 font-serif text-2xl font-normal">{c.heading}</h2>
        <textarea
          aria-label="Your note"
          value={message}
          maxLength={MAX_MESSAGE}
          rows={3}
          placeholder={c.prompt}
          onChange={(e) => setMessage(e.target.value)}
          className="keep-colors resize-none rounded-md border border-black/15 p-2 text-[14px] text-[#2b2618] outline-none focus:border-[#0a84ff]"
          style={{ background: NOTE_COLOR_HEX[color] }}
        />
        {offered.length > 0 && (
          <div role="group" aria-label={`Stickers (up to ${MAX_STICKERS})`} className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-xs text-[#6b675f]">Add stickers:</span>
            {offered.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={stickers.includes(id)}
                aria-label={id.startsWith('emoji:') ? `Sticker ${id.slice(6)}` : `Sticker ${c.stickers?.find((s) => s.url === id)?.label ?? ''}`}
                disabled={!stickers.includes(id) && stickers.length >= MAX_STICKERS}
                onClick={() => toggleSticker(id)}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg hover:bg-black/5 disabled:cursor-default disabled:opacity-30 aria-pressed:bg-[#0a84ff]/15 aria-pressed:outline aria-pressed:outline-2 aria-pressed:outline-[#0a84ff]"
              >
                <Sticker id={id} size={26} />
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label="Your name"
            value={name}
            maxLength={MAX_NAME}
            placeholder="Your name"
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-black/15 px-2 py-1.5 text-[14px] outline-none focus:border-[#0a84ff]"
          />
          <div role="radiogroup" aria-label="Note colour" className="flex gap-1.5">
            {NOTE_COLORS.map((c2) => (
              <button
                key={c2}
                type="button"
                role="radio"
                aria-checked={color === c2}
                aria-label={c2}
                onClick={() => setColor(c2)}
                className="keep-colors h-6 w-6 cursor-pointer rounded-full border border-black/15 aria-checked:outline aria-checked:outline-2 aria-checked:outline-offset-2 aria-checked:outline-[#0a84ff]"
                style={{ background: NOTE_COLOR_HEX[c2] }}
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={state.kind === 'sending' || !name.trim() || !message.trim()}
            className="cursor-pointer rounded-full bg-[#0a84ff] px-4 py-1.5 text-sm font-semibold text-white disabled:cursor-default disabled:opacity-40"
          >
            {state.kind === 'sending' ? 'Sending…' : 'Stick it'}
          </button>
        </div>
        {state.kind === 'sent' && (
          <p role="status" className="m-0 text-xs text-[#1f7a35]">
            {state.status === 'approved' ? 'Thanks! Your note is on the wall.' : 'Thanks! Your note will appear once it’s been read.'}
          </p>
        )}
        {state.kind === 'error' && (
          <p role="alert" className="m-0 text-xs text-[#b3261e]">
            {state.error}
          </p>
        )}
      </form>

      {notes === null ? (
        <p className="m-0 text-center text-sm text-[#6b675f]">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="m-0 text-center text-sm text-[#6b675f]">No notes yet — be the first!</p>
      ) : (
        <div data-testid="guestbook-wall" className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-6 px-3 pb-4 pt-5">
          {notes.map((n, i) => (
            <StickyCard key={n.id} note={n} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
