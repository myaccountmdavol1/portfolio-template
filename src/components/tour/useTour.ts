'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { CURSOR_SCALE, HOTSPOTS, type CursorShape } from '@/components/tour/TourCursor';
import { replaceSearch } from '@/hooks/useDeepLinkSync';
import { planMove, pointAt as pathPoint, totalDuration, type Point } from '@/lib/cursorPath';
import { readDeepLink, type LinkTarget } from '@/lib/deepLink';
import { trackEvent } from '@/lib/gameEvents';
import { isScreenHeld } from '@/lib/screensavers/screenHeld';
import { readTourSpeed, tourStops, tourStopsOnMove, wantsTour, withoutTourParams } from '@/lib/tour';
import { createTourClock, PRE_CLICK_MS, PRESS_MS, runTour, type TourClock, type TourIO, type TourResult } from '@/lib/tourRun';
import type { SiteData } from '@/lib/types';

// The guided tour's player: starts and stops it, finds each stop's icon on screen, moves the pointer there
// (straight on the element, not through React state), and opens the stop silently.

const AUTOPLAY_IDLE_MS = 4000;
const MOVE_STOP_PX = 8;
const START_DELAY_MS = 400; // /?tour=1: let the desktop settle (icons tidy, fonts load) first
const VISITED_KEY = 'portfolio:tourVisited';
const PILL_KEY = 'portfolio:tourPillHidden';

/** The editor's "Preview tour" button → the live preview's player. */
export const PREVIEW_TOUR_EVENT = 'portfolio:preview-tour';
export function requestTourPreview(): void {
  window.dispatchEvent(new CustomEvent(PREVIEW_TOUR_EVENT));
}

// ---- first visit (autoplay) ----

let firstVisit: boolean | null = null;
/** True on this browser's first page view. Decided once per page load, so StrictMode's second effect run agrees. */
function isFirstVisit(): boolean {
  if (firstVisit === null) {
    try {
      firstVisit = window.localStorage.getItem(VISITED_KEY) !== '1';
      window.localStorage.setItem(VISITED_KEY, '1');
    } catch {
      firstVisit = false; // storage blocked: never autoplay (we couldn't remember that we had)
    }
  }
  return firstVisit;
}

// ---- the desktop pill, hidden for the session ----

const pillListeners = new Set<() => void>();
let pillHiddenInMemory = false;
function readPillHidden(): boolean {
  if (pillHiddenInMemory) return true;
  try {
    return window.sessionStorage.getItem(PILL_KEY) === '1';
  } catch {
    return false;
  }
}
function subscribePill(listener: () => void): () => void {
  pillListeners.add(listener);
  return () => {
    pillListeners.delete(listener);
  };
}
export function hideTourPill(): void {
  pillHiddenInMemory = true;
  try {
    window.sessionStorage.setItem(PILL_KEY, '1');
  } catch {
    // storage blocked: hidden for this page view
  }
  pillListeners.forEach((l) => l());
}
/** Whether the visitor hid the pill this session. Hidden while server-rendering, so hydration matches. */
export function useTourPillHidden(): boolean {
  return useSyncExternalStore(subscribePill, readPillHidden, () => true);
}

// ---- DOM helpers ----

/**
 * Calls `onInteract` on the visitor's first real input: the pointer moving more than 8 px from where it was first
 * seen, a press, a key, the wheel, a touch. The tour's own controls (`[data-tour-ui]`) don't count.
 * With `swallowKeys`, an Esc goes no further (so it doesn't also close the window the tour leaves open); other keys
 * stop the tour and still do what they do (reload, find, Tab, the browser's Back shortcut).
 * With `ignoreMove`, the pointer moving is not input (a press, key, wheel or touch still is).
 * Keys are left alone while the screen saver or lock screen is up (an Esc there, or the password, is theirs).
 */
function watchInteraction(onInteract: () => void, { swallowKeys, ignoreMove = false }: { swallowKeys: boolean; ignoreMove?: boolean }): () => void {
  let anchor: Point | null = null;
  const inTourUi = (e: Event) => e.target instanceof Element && e.target.closest('[data-tour-ui]') !== null;
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return; // touches are caught by touchstart / pointerdown
    if (!anchor) {
      anchor = { x: e.clientX, y: e.clientY };
      return;
    }
    if (Math.hypot(e.clientX - anchor.x, e.clientY - anchor.y) > MOVE_STOP_PX) onInteract();
  };
  const onPress = (e: Event) => {
    if (!inTourUi(e)) onInteract();
  };
  const onKey = (e: KeyboardEvent) => {
    if (inTourUi(e) || isScreenHeld()) return;
    if (swallowKeys && e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    onInteract();
  };
  const passive = { capture: true, passive: true } as const;
  if (!ignoreMove) window.addEventListener('pointermove', onMove, passive);
  window.addEventListener('pointerdown', onPress, true);
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('wheel', onPress, passive);
  window.addEventListener('touchstart', onPress, passive);
  return () => {
    window.removeEventListener('pointermove', onMove, passive); // harmless when it was never added
    window.removeEventListener('pointerdown', onPress, true);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('wheel', onPress, passive);
    window.removeEventListener('touchstart', onPress, passive);
  };
}

/** The stop's icon: a desktop icon or widget, else its dock item; on a phone a home icon, else its dock item. Must be fully on screen. */
function findTarget(root: HTMLElement, appId: string, bounds: DOMRect): Element | null {
  for (const el of root.querySelectorAll(`[data-app-id="${CSS.escape(appId)}"]`)) {
    if (el.closest('[role="dialog"]')) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.left >= bounds.left - 1 && r.right <= bounds.right + 1 && r.top >= bounds.top - 1 && r.bottom <= bounds.bottom + 1) return el;
  }
  return null;
}

// ---- the hook ----

export type TourPhase = 'idle' | 'playing' | 'paused' | 'ended';

export interface TourApi {
  /** This site has a tour to play (else no pill, menu item or chip, and /?tour=1 is ignored). */
  available: boolean;
  phase: TourPhase;
  /** Moving the mouse stops the tour (the owner's switch). Always true on phones. Off: the real cursor stays and the bar has Pause/Stop. */
  stopOnMove: boolean;
  /** Playing or paused: the real pointer hides (if stopOnMove), the call and achievement banners wait, the URL keeps one entry. */
  playing: boolean;
  /** The stop being shown or moved to (0-based), of `total`. */
  index: number;
  total: number;
  caption: string | null;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  closeEnd: () => void;
  overlayRef: RefObject<HTMLDivElement | null>;
  cursorRef: RefObject<HTMLDivElement | null>;
  rippleRef: RefObject<HTMLDivElement | null>;
}

interface UseTourOptions {
  data: SiteData;
  variant: 'desktop' | 'phone';
  /** The public site: /?tour=1, autoplay and the achievement. In the editor only "Preview tour" starts it. */
  linkSync: boolean;
  openTarget: (target: LinkTarget & { silent?: boolean }) => void;
  closeAll: () => void;
}

export function useTour({ data, variant, linkSync, openTarget, closeAll }: UseTourOptions): TourApi {
  const available = useMemo(() => tourStops(data).length > 0, [data]);
  const autoplay = data.site.tour?.autoplay === true;
  const stopOnMove = variant === 'phone' || tourStopsOnMove(data);
  const [phase, setPhase] = useState<TourPhase>('idle');
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [caption, setCaption] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ data, variant, linkSync, openTarget, closeAll });
  useEffect(() => {
    latest.current = { data, variant, linkSync, openTarget, closeAll };
  });
  const run = useRef<{ controller: AbortController; clock: TourClock } | null>(null);
  const speed = useRef(1);
  const pos = useRef<Point>({ x: 0, y: 0 });

  // Test-only speed-up (?tourSpeed=10), read once at load, before /?tour=1 tidies the URL. Always 1 in production.
  useEffect(() => {
    speed.current = readTourSpeed(window.location.search, process.env.NODE_ENV === 'production');
  }, []);

  /** Puts the pointer's hotspot on `p` (overlay coordinates). */
  const place = useCallback((p: Point) => {
    pos.current = p;
    const el = cursorRef.current;
    if (!el) return;
    const shape = (el.dataset.shape ?? 'arrow') as CursorShape;
    const hot = shape === 'finger' ? HOTSPOTS.finger : { x: HOTSPOTS[shape].x * CURSOR_SCALE, y: HOTSPOTS[shape].y * CURSOR_SCALE };
    el.style.transform = `translate(${p.x - hot.x}px, ${p.y - hot.y}px)`;
  }, []);

  const makeIO = useCallback(
    (signal: AbortSignal, clock: TourClock): TourIO => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const fast = (ms: number) => ms / speed.current;
      const setCursor = (attrs: { shape?: CursorShape; down?: boolean }) => {
        const el = cursorRef.current;
        if (!el) return;
        if (attrs.shape && el.dataset.shape !== 'finger') el.dataset.shape = attrs.shape;
        if (attrs.down !== undefined) el.dataset.down = String(attrs.down);
      };
      /** Calls `frame` with the time into an `ms`-long move on every animation frame. Tour time, so a pause freezes it. */
      const animate = (ms: number, frame: (elapsed: number) => void) =>
        new Promise<void>((resolve) => {
          const begin = clock.now();
          let raf = 0;
          const done = () => {
            cancelAnimationFrame(raf);
            signal.removeEventListener('abort', done);
            resolve();
          };
          const tick = () => {
            if (signal.aborted) return done();
            const elapsed = Math.min(ms, (clock.now() - begin) * speed.current);
            frame(elapsed);
            if (elapsed >= ms) done();
            else raf = requestAnimationFrame(tick);
          };
          signal.addEventListener('abort', done, { once: true });
          raf = requestAnimationFrame(tick);
        });
      /** A ring in the site's accent colour where the pointer clicked (desktop, motion allowed). */
      const ripple = (p: Point) => {
        const host = rippleRef.current;
        if (!host || reduce || latest.current.variant === 'phone') return;
        const dot = document.createElement('div');
        dot.className = 'tour-ripple';
        dot.style.left = `${p.x}px`;
        dot.style.top = `${p.y}px`;
        dot.style.boxShadow = `0 0 0 2px color-mix(in srgb, ${latest.current.data.site.accent} 60%, transparent)`;
        host.appendChild(dot);
        window.setTimeout(() => dot.remove(), 600);
      };
      return {
        closeAll: () => latest.current.closeAll(),
        show: (stop, i) => {
          setIndex(i);
          setCaption(stop?.caption.trim() ? stop.caption : null); // a blank caption shows no pill
        },
        open: (stop) => latest.current.openTarget({ appId: stop.appId, itemKey: stop.itemKey, silent: true }),
        sleep: (ms) => clock.sleep(fast(ms), signal),
        pointAt: async (stop) => {
          const overlay = overlayRef.current;
          if (!overlay) return;
          // Measured now, so a resize since the last stop is picked up. The overlay is the frame of reference
          // (inside the editor's stage or phone frame, `fixed` is relative to that box, and it may be scaled).
          const bounds = overlay.getBoundingClientRect();
          const scale = overlay.offsetWidth > 0 ? bounds.width / overlay.offsetWidth : 1;
          const root = overlay.closest<HTMLElement>('[data-layout]') ?? document.body;
          const el = findTarget(root, stop.appId, bounds) ?? (latest.current.variant === 'phone' ? root.querySelector('[data-tour-search]') : null);
          let to: Point = { x: overlay.offsetWidth / 2, y: overlay.offsetHeight / 2 };
          if (el) {
            const r = el.getBoundingClientRect();
            // The middle of the icon's picture (its label sits underneath), a few px off dead centre like a real hand.
            to = {
              x: (r.left + r.width / 2 - bounds.left) / scale + (Math.random() - 0.5) * 8,
              y: (r.top + Math.min(r.height / 2, 34) - bounds.top) / scale + (Math.random() - 0.5) * 6,
            };
          }
          setCursor({ shape: 'arrow' });
          if (reduce) place(to);
          else {
            const plan = planMove(pos.current, to);
            await animate(totalDuration(plan), (elapsed) => place(pathPoint(plan, elapsed)));
          }
          if (signal.aborted) return;
          setCursor({ shape: 'hand' });
          place(to);
          await clock.sleep(fast(PRE_CLICK_MS), signal);
          if (signal.aborted) return;
          if (!reduce) setCursor({ down: true }); // reduced motion: no press animation
          ripple(to);
          if (el && !reduce) {
            el.animate(
              [{ transform: 'scale(1)', filter: 'none' }, { transform: 'scale(.92)', filter: 'brightness(.85)' }, { transform: 'scale(1)', filter: 'none' }],
              { duration: fast(PRESS_MS) * 2 },
            );
          }
          await clock.sleep(fast(PRESS_MS), signal);
          if (!reduce) setCursor({ down: false });
        },
      };
    },
    [place],
  );

  const finish = useCallback((controller: AbortController, result: TourResult) => {
    if (run.current?.controller !== controller) return; // stopped (or restarted) meanwhile
    run.current = null;
    if (result !== 'finished') return;
    // Same tick: the URL hook sees the tour has ended before the windows close, so Back works as usual again.
    setCaption(null);
    setPhase('ended');
    latest.current.closeAll();
    if (latest.current.linkSync) trackEvent({ type: 'tour' });
  }, []);

  /** Stops on the spot: the window it was showing stays open. */
  const stop = useCallback(() => {
    const current = run.current;
    if (!current) return;
    run.current = null;
    current.controller.abort();
    setCaption(null);
    setPhase('idle');
  }, []);

  const start = useCallback(() => {
    const { data, linkSync } = latest.current;
    const stops = tourStops(data);
    if (stops.length === 0 || run.current) return;
    if (linkSync && wantsTour(window.location.search)) replaceSearch(withoutTourParams(window.location.search));
    const controller = new AbortController();
    const clock = createTourClock();
    run.current = { controller, clock };
    setTotal(stops.length);
    setIndex(0);
    setCaption(null);
    setPhase('playing');
    const io = makeIO(controller.signal, clock);
    // The pointer mounts with this render; start driving it on the next frame.
    requestAnimationFrame(() => {
      if (controller.signal.aborted) return;
      const overlay = overlayRef.current;
      if (overlay) place({ x: overlay.offsetWidth / 2, y: overlay.offsetHeight * 0.6 });
      runTour(stops, io, controller.signal).then(
        (result) => finish(controller, result),
        () => {
          // Something on the page broke mid-stop: end the tour as if the visitor had stopped it.
          if (run.current?.controller === controller) stop();
        },
      );
    });
  }, [finish, makeIO, place, stop]);

  const pause = useCallback(() => {
    if (!run.current) return;
    run.current.clock.pause();
    setPhase('paused');
  }, []);

  const resume = useCallback(() => {
    if (!run.current) return;
    run.current.clock.resume();
    setPhase('playing');
  }, []);

  const closeEnd = useCallback(() => setPhase('idle'), []);

  const playing = phase === 'playing' || phase === 'paused';

  // Any real input stops the tour (pointer movement too, unless the owner switched that off; phones have no mouse).
  // Flipping the switch mid-tour only re-subscribes this watcher; the tour carries on.
  useEffect(() => {
    if (!playing) return;
    return watchInteraction(stop, { swallowKeys: true, ignoreMove: !stopOnMove });
  }, [playing, stop, stopOnMove]);

  // Browser Back (or Forward) while it plays: the visitor is taking over, so stop. (The URL hook handles the windows.)
  useEffect(() => {
    if (!playing) return;
    window.addEventListener('popstate', stop);
    return () => window.removeEventListener('popstate', stop);
  }, [playing, stop]);

  // A hidden tab pauses the tour (its timers would carry on unseen); coming back resumes it, unless the visitor paused it.
  // Checked once on setup too, so a tour started in a background tab (cmd-click /?tour=1) waits until it's seen.
  useEffect(() => {
    if (!playing) return;
    let autoPaused = false;
    const onVisibility = () => {
      const clock = run.current?.clock;
      if (!clock) return;
      if (document.hidden && !clock.paused) {
        clock.pause();
        autoPaused = true;
      } else if (!document.hidden && autoPaused) {
        autoPaused = false;
        clock.resume();
      }
    };
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [playing]);

  // Leaving the page, or switching between the desktop and phone layouts, ends a running tour.
  useEffect(() => {
    const current = run;
    return () => current.current?.controller.abort();
  }, []);

  // The editor: "Preview tour" plays it in the live preview — the only way it runs there.
  useEffect(() => {
    if (linkSync) return;
    window.addEventListener(PREVIEW_TOUR_EVENT, start);
    return () => window.removeEventListener(PREVIEW_TOUR_EVENT, start);
  }, [linkSync, start]);

  // The public site: /?tour=1 starts it; otherwise maybe autoplay.
  useEffect(() => {
    if (!linkSync) return;
    const first = isFirstVisit();
    const search = window.location.search;
    if (wantsTour(search)) {
      const id = window.setTimeout(start, START_DELAY_MS);
      return () => window.clearTimeout(id);
    }
    // Autoplay (the owner's switch, off by default): a first-time visitor, not arriving on a deep link,
    // who hasn't moved, clicked, scrolled or typed for 4 s — of the tab being on screen (a background tab waits).
    if (!autoplay || !first || readDeepLink(search).open) return;
    let timer = 0;
    let unwatch = () => {};
    const arm = () => {
      window.clearTimeout(timer);
      if (document.hidden) return;
      timer = window.setTimeout(() => {
        cancel();
        start();
      }, AUTOPLAY_IDLE_MS);
    };
    const cancel = () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', arm);
      unwatch();
    };
    unwatch = watchInteraction(cancel, { swallowKeys: false });
    document.addEventListener('visibilitychange', arm);
    arm();
    return cancel;
  }, [linkSync, autoplay, start]);

  return { available, phase, playing, stopOnMove, index, total, caption, start, pause, resume, stop, closeEnd, overlayRef, cursorRef, rippleRef };
}
