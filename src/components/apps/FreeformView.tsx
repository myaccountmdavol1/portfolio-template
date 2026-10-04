'use client';

import { Download, Eraser, RotateCcw, Send, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CANVAS_H, CANVAS_W, drawStrokes, PAPER, toCanvasPoint, type Stroke } from '@/lib/freeform';
import { rememberVisitorName, trackEvent } from '@/lib/gameEvents';
import { submitNote } from '@/lib/guestbook/client';
import { MAX_MESSAGE, MAX_NAME } from '@/lib/guestbook/notes';
import type { FreeformApp } from '@/lib/types';

const COLORS = ['#1d1c1a', '#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#0a84ff', '#af52de'];
const SIZES = [4, 10, 22];

const tool = 'flex h-8 min-w-8 cursor-pointer items-center justify-center gap-1 rounded-md px-2 text-xs font-medium hover:bg-black/5 disabled:cursor-default disabled:opacity-35';

/** A small Freeform-style canvas. Visitors can download their drawing or send it to the guestbook. */
export function FreeformView({ app }: { app: FreeformApp }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [erasing, setErasing] = useState(false);
  const drawing = useRef<Stroke | null>(null);
  const [sending, setSending] = useState<'closed' | 'open' | 'sending' | 'sent'>('closed');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) drawStrokes(ctx, strokes);
  }, [strokes]);

  function redrawWithLive() {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) drawStrokes(ctx, drawing.current ? [...strokes, drawing.current] : strokes);
  }

  function pointAt(e: React.PointerEvent<HTMLCanvasElement>) {
    return toCanvasPoint(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  }

  function exportImage(type: 'image/png' | 'image/jpeg', width: number): string {
    const src = canvasRef.current;
    if (!src) return '';
    const out = document.createElement('canvas');
    out.width = width;
    out.height = Math.round((width * CANVAS_H) / CANVAS_W);
    const ctx = out.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(src, 0, 0, out.width, out.height);
    return out.toDataURL(type, 0.8);
  }

  async function send() {
    setSending('sending');
    setError(null);
    const result = await submitNote({ appId: app.id, name, message, color: 'yellow', doodle: exportImage('image/jpeg', 600) });
    if (result.ok) {
      setSending('sent');
      trackEvent({ type: 'guestbook' });
      rememberVisitorName(name);
    }
    else {
      setSending('open');
      setError(result.error);
    }
  }

  return (
    <div className="flex h-full flex-col gap-2 bg-[#f3f1ec] p-3 text-[#1d1c1a]">
      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-white px-2 py-1 shadow-sm">
        <div role="radiogroup" aria-label="Pen colour" className="flex gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={!erasing && color === c}
              aria-label={`Colour ${c}`}
              onClick={() => {
                setColor(c);
                setErasing(false);
              }}
              className="keep-colors h-6 w-6 cursor-pointer rounded-full border border-black/10 aria-checked:outline aria-checked:outline-2 aria-checked:outline-offset-2 aria-checked:outline-[#0a84ff]"
              style={{ background: c }}
            />
          ))}
        </div>
        <span aria-hidden className="mx-1 h-5 w-px bg-black/10" />
        <div role="radiogroup" aria-label="Pen size" className="flex gap-0.5">
          {SIZES.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={size === s} aria-label={`Size ${s}`} onClick={() => setSize(s)} className={`${tool} aria-checked:bg-black/10`}>
              <span className="rounded-full bg-current" style={{ width: Math.max(4, s / 2), height: Math.max(4, s / 2) }} />
            </button>
          ))}
        </div>
        <button type="button" aria-pressed={erasing} onClick={() => setErasing((v) => !v)} className={`${tool} aria-pressed:bg-black/10`}>
          <Eraser size={15} aria-hidden /> Eraser
        </button>
        <span className="flex-1" />
        <button type="button" disabled={strokes.length === 0} onClick={() => setStrokes((s) => s.slice(0, -1))} className={tool}>
          <RotateCcw size={15} aria-hidden /> Undo
        </button>
        <button type="button" disabled={strokes.length === 0} onClick={() => setStrokes([])} className={tool}>
          <Trash2 size={15} aria-hidden /> Clear
        </button>
        <button
          type="button"
          disabled={strokes.length === 0}
          onClick={() => {
            const a = document.createElement('a');
            a.href = exportImage('image/png', CANVAS_W);
            a.download = 'my-drawing.png';
            a.click();
          }}
          className={tool}
        >
          <Download size={15} aria-hidden /> Download
        </button>
        {app.content.allowSend && (
          <button type="button" disabled={strokes.length === 0 || sending === 'sent'} onClick={() => setSending('open')} className={`${tool} text-[#0a84ff]`}>
            <Send size={15} aria-hidden /> Send
          </button>
        )}
      </div>

      {sending !== 'closed' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-2.5 shadow-sm"
        >
          {sending === 'sent' ? (
            <p role="status" className="m-0 text-sm text-[#1f7a35]">
              Sent! Your drawing will show up in the guestbook once it’s been seen.
            </p>
          ) : (
            <>
              <input aria-label="Your name" required maxLength={MAX_NAME} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus className="min-w-[140px] flex-1 rounded-md border border-black/15 px-2 py-1.5 text-sm outline-none focus:border-[#0a84ff]" />
              <input aria-label="A short note (optional)" maxLength={MAX_MESSAGE} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="A short note (optional)" className="min-w-[180px] flex-[2] rounded-md border border-black/15 px-2 py-1.5 text-sm outline-none focus:border-[#0a84ff]" />
              <button type="submit" disabled={sending === 'sending' || !name.trim()} className="flex-none cursor-pointer rounded-full bg-[#0a84ff] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
                {sending === 'sending' ? 'Sending…' : 'Send drawing'}
              </button>
              {error && (
                <p role="alert" className="m-0 w-full text-xs text-[#b3261e]">
                  {error}
                </p>
              )}
            </>
          )}
        </form>
      )}

      {/* The canvas keeps its shape and shrinks to fit the window, so the toolbar and Send form stay in view. */}
      <div className="relative flex min-h-0 flex-1 items-start justify-center">
        <div className="relative max-w-full">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          aria-label={`Drawing canvas: ${app.content.prompt}`}
          role="img"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            drawing.current = { color: erasing ? PAPER : color, size: erasing ? size * 2.5 : size, points: [pointAt(e)] };
            redrawWithLive();
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            drawing.current.points.push(pointAt(e));
            redrawWithLive();
          }}
          onPointerUp={() => {
            const done = drawing.current;
            drawing.current = null;
            if (done) {
              setStrokes((s) => [...s, done]);
              trackEvent({ type: 'draw' });
            }
          }}
          onPointerCancel={() => {
            drawing.current = null;
            redrawWithLive();
          }}
          className="block h-auto w-auto max-w-full cursor-crosshair touch-none rounded-lg shadow-sm"
          style={{ maxHeight: 'calc(100dvh - 260px)', background: PAPER }}
        />
        {strokes.length === 0 && (
          <p className="keep-colors pointer-events-none absolute inset-0 m-0 flex items-center justify-center font-serif text-3xl italic text-black/25">{app.content.prompt}</p>
        )}
        </div>
      </div>

    </div>
  );
}
