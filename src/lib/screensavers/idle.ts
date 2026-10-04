import type { HotCorner } from '../types';

// When the screen saver may start: after a quiet spell, or from a hot corner — and never while something
// else is going on. Pure (setTimeout only), so it's tested with fake timers.

export const HOT_CORNER_PX = 4;
export const HOT_CORNER_MS = 1000;

/** The pointer is within 4 px of the chosen corner of a `width` × `height` window. */
export function inHotCorner(corner: HotCorner, x: number, y: number, width: number, height: number): boolean {
  if (corner === 'none') return false;
  const left = x <= HOT_CORNER_PX;
  const right = x >= width - HOT_CORNER_PX;
  const top = y <= HOT_CORNER_PX;
  const bottom = y >= height - HOT_CORNER_PX;
  if (corner === 'top-left') return top && left;
  if (corner === 'top-right') return top && right;
  if (corner === 'bottom-left') return bottom && left;
  return bottom && right;
}

/** Everything that keeps the screen saver away. */
export interface IdleGuards {
  tour: boolean; // the guided tour is playing (or showing its end card)
  call: boolean; // the incoming call is ringing
  faceTime: boolean;
  finale: boolean;
  mediaPlaying: boolean; // an audible video or audio element is playing
  typing: boolean; // focus is in a text field, a select, something editable, or an embed
  spotlight: boolean;
  controlCenter: boolean;
  editor: boolean; // the editor (only its Preview buttons start it)
  hidden: boolean; // a background tab
}

export type IdleBlocker = keyof IdleGuards;
const ORDER: IdleBlocker[] = ['editor', 'hidden', 'tour', 'call', 'faceTime', 'finale', 'spotlight', 'controlCenter', 'mediaPlaying', 'typing'];

export function idleBlocker(g: IdleGuards): IdleBlocker | null {
  return ORDER.find((k) => g[k]) ?? null;
}

const TEXT_INPUTS = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number', 'date', 'datetime-local', 'month', 'time', 'week']);

export interface FocusLike {
  tagName: string;
  isContentEditable?: boolean;
  type?: string;
}

/** Focus where the visitor is typing — or inside an embed, where their mouse and keys never reach this page. */
export function focusBlocksIdle(el: FocusLike | null | undefined): boolean {
  if (!el) return false;
  const tag = el.tagName.toUpperCase();
  if (el.isContentEditable || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'IFRAME') return true;
  return tag === 'INPUT' && TEXT_INPUTS.has((el.type || 'text').toLowerCase());
}

export interface MediaLike {
  paused: boolean;
  ended: boolean;
  muted: boolean;
}

/** Something is playing with sound (a muted looping background video doesn't count). */
export function anyMediaPlaying(media: Iterable<MediaLike>): boolean {
  for (const m of media) if (!m.paused && !m.ended && !m.muted) return true;
  return false;
}

export interface IdleEngineOptions {
  delayMs: number;
  corner: HotCorner;
  /** Read when a timer fires: true = not now. */
  blocked: () => boolean;
  onTrigger: (reason: 'idle' | 'corner') => void;
}

export interface IdleEngine {
  /** A key, press, wheel or touch: the quiet spell starts again. */
  activity(): void;
  /** The pointer moved (activity too), maybe into or out of the hot corner. */
  pointer(x: number, y: number, width: number, height: number): void;
  /** The pointer left the window. */
  leave(): void;
  /** No timers (hidden tab, screen saver or lock showing). */
  pause(): void;
  /** Count from scratch. */
  resume(): void;
  dispose(): void;
}

export function createIdleEngine({ delayMs, corner, blocked, onTrigger }: IdleEngineOptions): IdleEngine {
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let cornerTimer: ReturnType<typeof setTimeout> | undefined;
  let inCorner = false;
  let paused = false;
  const clearCorner = () => {
    clearTimeout(cornerTimer);
    cornerTimer = undefined;
  };
  const armIdle = () => {
    clearTimeout(idleTimer);
    if (paused) return;
    idleTimer = setTimeout(() => {
      if (blocked()) armIdle();
      else onTrigger('idle');
    }, delayMs);
  };
  const engine: IdleEngine = {
    activity: armIdle,
    pointer(x, y, width, height) {
      armIdle();
      const now = inHotCorner(corner, x, y, width, height);
      if (now && !inCorner && !paused) {
        cornerTimer = setTimeout(() => {
          cornerTimer = undefined;
          if (!blocked()) onTrigger('corner');
        }, HOT_CORNER_MS);
      }
      if (!now) clearCorner();
      inCorner = now;
    },
    leave() {
      clearCorner();
      inCorner = false;
    },
    pause() {
      paused = true;
      clearTimeout(idleTimer);
      clearCorner();
      inCorner = false;
    },
    resume() {
      paused = false;
      armIdle();
    },
    dispose() {
      engine.pause();
    },
  };
  armIdle();
  return engine;
}
