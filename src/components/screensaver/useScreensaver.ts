'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { replaceSearch } from '@/hooks/useDeepLinkSync';
import { trackEvent } from '@/lib/gameEvents';
import { createIdleEngine, type IdleEngine } from '@/lib/screensavers/idle';
import { resolveLock, type UnlockHow } from '@/lib/screensavers/lock';
import { setScreenHeld } from '@/lib/screensavers/screenHeld';
import { chooseModule, playableModules, resolveModule } from '@/lib/screensavers/registry';
import { idleDelayMs, isModuleId, readIdleSeconds, readSaverLink, screensaverSettings, withoutSaverParams } from '@/lib/screensavers/settings';
import type { ScreensaverModuleId, SiteData } from '@/lib/types';

// The screen saver and lock screen's state: off → saver → lock → unlocking → off. Idle, the hot corner, ⌥⌘L and
// links only work on the public site; in the editor the only way in is a Preview button.

const LINK_DELAY_MS = 300; // /?lock=1, /?screensaver=: let the desktop settle first
const WAKE_GRACE_MS = 300; // the mouse settling just after it starts doesn't wake it
const WAKE_MOVE_PX = 8;
const UNLOCK_MS = 450;

/** The editor's Preview buttons → the live preview. */
export const PREVIEW_SAVER_EVENT = 'portfolio:preview-screensaver';
export interface SaverPreviewRequest {
  kind: 'screensaver' | 'lock';
  moduleId?: ScreensaverModuleId;
}
export function requestSaverPreview(request: SaverPreviewRequest): void {
  window.dispatchEvent(new CustomEvent<SaverPreviewRequest>(PREVIEW_SAVER_EVENT, { detail: request }));
}

export type SaverPhase = 'off' | 'saver' | 'lock' | 'unlocking';

export interface ScreensaverApi {
  phase: SaverPhase;
  moduleId: ScreensaverModuleId | null;
  /** Started by the editor's Preview: no achievements, and keys outside the lock aren't taken. */
  preview: boolean;
  /** The menu's "Start Screen Saver" and Control Center's "Screen Saver" (public desktop, feature on, something to show). */
  canStart: boolean;
  /** The menu's and Control Center's "Lock Screen" (public site, lock step on), and ⌥⌘L (desktop). */
  canLock: boolean;
  /** The same two, ignoring linkSync: whether the public site would offer them. The editor shows the buttons on this and plays Previews. */
  wouldStart: boolean;
  wouldLock: boolean;
  /** `returnFocus`: where focus goes after unlocking if what had it is gone (the menu or Control Center button that started it). */
  start: (returnFocus?: HTMLElement | null) => void;
  lock: (returnFocus?: HTMLElement | null) => void;
  unlock: (how: UnlockHow) => void;
  /** The bouncing initials hit a corner exactly. */
  corner: () => void;
}

interface Options {
  data: SiteData;
  variant: 'desktop' | 'phone';
  linkSync: boolean;
  /** Read when the idle timer or hot corner fires: true = something's going on, not now. */
  blocked: () => boolean;
}

/** Eats the next click (the end of the press that woke the screen saver). Another press first, or a second passing, calls it off. */
function swallowNextClick(): void {
  const swallow = (e: MouseEvent) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    done();
  };
  const done = () => {
    window.removeEventListener('click', swallow, true);
    window.removeEventListener('pointerdown', done, true);
    window.clearTimeout(timer);
  };
  window.addEventListener('click', swallow, true);
  window.addEventListener('pointerdown', done, true); // added mid-dispatch: the waking press itself doesn't reach it
  const timer = window.setTimeout(done, 1000);
}

/** Wakes the screen saver on the visitor's first real input. Every key stops here (Esc mustn't close a window behind). */
function watchWake(onWake: () => void): () => void {
  const startedAt = performance.now();
  const armed = () => performance.now() - startedAt >= WAKE_GRACE_MS;
  let anchor: { x: number; y: number } | null = null;
  const onMove = (e: PointerEvent) => {
    if (!anchor) {
      anchor = { x: e.clientX, y: e.clientY };
      return;
    }
    if (armed() && Math.hypot(e.clientX - anchor.x, e.clientY - anchor.y) > WAKE_MOVE_PX) onWake();
  };
  const onPress = (e: Event) => {
    if (!armed()) return;
    // The click that follows this press would land on whatever the screen saver covered (an icon, a window): like
    // macOS, the press that wakes it does nothing else.
    if (e.type === 'pointerdown') swallowNextClick();
    onWake();
  };
  const onKey = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (armed()) onWake();
  };
  const passive = { capture: true, passive: true } as const;
  window.addEventListener('pointermove', onMove, passive);
  window.addEventListener('pointerdown', onPress, true);
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('wheel', onPress, passive);
  window.addEventListener('touchstart', onPress, passive);
  return () => {
    window.removeEventListener('pointermove', onMove, passive);
    window.removeEventListener('pointerdown', onPress, true);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('wheel', onPress, passive);
    window.removeEventListener('touchstart', onPress, passive);
  };
}

export function useScreensaver({ data, variant, linkSync, blocked }: Options): ScreensaverApi {
  const settings = screensaverSettings(data.site);
  const lockOn = resolveLock(data).enabled;
  const playable = useMemo(() => playableModules(data), [data]);
  const [phase, setPhase] = useState<SaverPhase>('off');
  const [moduleId, setModuleId] = useState<ScreensaverModuleId | null>(null);
  const [preview, setPreview] = useState(false);
  // Listeners read these refs, so a phase change is seen at once (not after the next render).
  const phaseRef = useRef<SaverPhase>('off');
  const previewRef = useRef(false);
  const lastModule = useRef<ScreensaverModuleId | null>(null);
  const unlockTimer = useRef(0);
  const engine = useRef<IdleEngine | null>(null);
  const idleSeconds = useRef<number | null>(null);
  const latest = useRef({ data, variant, linkSync, blocked });
  useEffect(() => {
    latest.current = { data, variant, linkSync, blocked };
  });

  // Test-only speed-up (?idleSeconds=2), read once at load. Always null in production.
  useEffect(() => {
    idleSeconds.current = readIdleSeconds(window.location.search, process.env.NODE_ENV === 'production');
  }, []);

  const go = useCallback((next: SaverPhase, isPreview: boolean = previewRef.current) => {
    phaseRef.current = next;
    previewRef.current = isPreview;
    setScreenHeld(next !== 'off' && !isPreview);
    setPhase(next);
    setPreview(isPreview);
  }, []);

  const showLock = useCallback(
    (isPreview: boolean) => {
      setModuleId(null);
      go('lock', isPreview);
    },
    [go],
  );

  /** `id` if it can play (Preview: if it has something to show), else the owner's pick or a shuffle; nothing → the lock. Phones go straight to the lock. */
  const startSaver = useCallback(
    (id: ScreensaverModuleId | null, isPreview: boolean) => {
      if (phaseRef.current !== 'off') return;
      const { data, variant } = latest.current;
      const lock = resolveLock(data).enabled;
      if (variant === 'phone') {
        if (lock || isPreview) showLock(isPreview);
        return;
      }
      const wanted = id ? resolveModule(data, id) : null;
      const pick = wanted && wanted.available && (isPreview || wanted.on) ? wanted.id : chooseModule(data, lastModule.current);
      if (!pick) {
        if (lock || isPreview) showLock(isPreview);
        return;
      }
      lastModule.current = pick;
      setModuleId(pick);
      go('saver', isPreview);
    },
    [go, showLock],
  );

  // Where focus goes back to once it's over, if what had it is gone by then (a menu item that closed as it started it).
  const returnTo = useRef<HTMLElement | null>(null);
  const remember = useCallback((el: HTMLElement | null | undefined) => {
    if (phaseRef.current !== 'off') return;
    const active = document.activeElement;
    returnTo.current = el ?? (active instanceof HTMLElement && active !== document.body ? active : null);
  }, []);

  const start = useCallback(
    (returnFocus?: HTMLElement | null) => {
      remember(returnFocus);
      startSaver(null, false);
      if (phaseRef.current === 'off') returnTo.current = null; // nothing to show
    },
    [remember, startSaver],
  );

  const lock = useCallback(
    (returnFocus?: HTMLElement | null) => {
      remember(returnFocus);
      if (phaseRef.current === 'off') showLock(false);
    },
    [remember, showLock],
  );

  const wake = useCallback(() => {
    if (phaseRef.current !== 'saver') return;
    setModuleId(null);
    go(resolveLock(latest.current.data).enabled ? 'lock' : 'off');
  }, [go]);

  const unlock = useCallback(
    (how: UnlockHow) => {
      if (phaseRef.current !== 'lock') return;
      if (how === 'password' && latest.current.linkSync && !previewRef.current) trackEvent({ type: 'password' });
      go('unlocking');
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.clearTimeout(unlockTimer.current);
      unlockTimer.current = window.setTimeout(() => go('off', false), reduce ? 0 : UNLOCK_MS);
    },
    [go],
  );
  useEffect(() => () => window.clearTimeout(unlockTimer.current), []);

  const corner = useCallback(() => {
    if (latest.current.linkSync && !previewRef.current) trackEvent({ type: 'corner' });
  }, []);

  // Idle and the hot corner (public site only; phones only when they can lock).
  const idleArmed = linkSync && settings.enabled && (variant === 'desktop' || lockOn);
  const hotCorner = variant === 'desktop' ? settings.hotCorner : 'none';
  const minutes = settings.idleMinutes;
  useEffect(() => {
    if (!idleArmed) return;
    const e = createIdleEngine({
      delayMs: idleDelayMs(minutes, idleSeconds.current),
      corner: hotCorner,
      blocked: () => latest.current.blocked(),
      onTrigger: () => startSaver(null, false),
    });
    engine.current = e;
    if (phaseRef.current !== 'off' || document.hidden) e.pause();
    const onMove = (ev: PointerEvent) => e.pointer(ev.clientX, ev.clientY, window.innerWidth, window.innerHeight);
    const onInput = () => e.activity();
    const onVisibility = () => {
      if (document.hidden) e.pause();
      else if (phaseRef.current === 'off') e.resume();
    };
    const onLeave = () => e.leave();
    const passive = { capture: true, passive: true } as const;
    window.addEventListener('pointermove', onMove, passive);
    window.addEventListener('pointerdown', onInput, passive);
    window.addEventListener('keydown', onInput, passive);
    window.addEventListener('wheel', onInput, passive);
    window.addEventListener('touchstart', onInput, passive);
    document.addEventListener('visibilitychange', onVisibility);
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      e.dispose();
      engine.current = null;
      window.removeEventListener('pointermove', onMove, passive);
      window.removeEventListener('pointerdown', onInput, passive);
      window.removeEventListener('keydown', onInput, passive);
      window.removeEventListener('wheel', onInput, passive);
      window.removeEventListener('touchstart', onInput, passive);
      document.removeEventListener('visibilitychange', onVisibility);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, [idleArmed, minutes, hotCorner, startSaver]);

  // Back on the desktop: the lock screen put focus back where it was; if that's gone (focus fell to the page), it goes
  // to the button that started it. (Runs after the lock screen's own clean-up, which comes first as it unmounts.)
  useEffect(() => {
    if (phase !== 'off') return;
    const el = returnTo.current;
    returnTo.current = null;
    const active = document.activeElement;
    if (el?.isConnected && (!active || active === document.body)) el.focus({ preventScroll: true });
  }, [phase]);
  useEffect(() => () => setScreenHeld(false), []);

  // No idle timers while the screen saver or lock shows; back on the desktop the quiet spell starts again.
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    if (phase === 'off' && !document.hidden) e.resume();
    else e.pause();
  }, [phase]);

  // ⌥⌘L locks (public desktop, lock step on). e.code, because Option changes e.key on a Mac; preventDefault so the
  // page wins over the browser's own ⌥⌘L (Downloads) while it has focus. Captured, so nothing that stops a keydown
  // on its way (a window, a field) can swallow it.
  const shortcutOn = linkSync && variant === 'desktop' && lockOn;
  useEffect(() => {
    if (!shortcutOn) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey && e.altKey && e.code === 'KeyL') || phaseRef.current !== 'off') return;
      e.preventDefault();
      remember(null);
      showLock(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [shortcutOn, showLock, remember]);

  // /?lock=1 and /?screensaver=<id>: shown once the desktop has settled, then tidied out of the address bar (no history entry).
  useEffect(() => {
    if (!linkSync) return;
    const link = readSaverLink(window.location.search);
    if (!link.lock && link.screensaver === null) return;
    const id = window.setTimeout(() => {
      replaceSearch(withoutSaverParams(window.location.search));
      const { data } = latest.current;
      if (!screensaverSettings(data.site).enabled) return;
      if (link.screensaver !== null) startSaver(isModuleId(link.screensaver) ? link.screensaver : null, false);
      else if (resolveLock(data).enabled && phaseRef.current === 'off') showLock(false);
    }, LINK_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [linkSync, startSaver, showLock]);

  // While the screen saver shows, the first real input wakes it.
  useEffect(() => {
    if (phase !== 'saver') return;
    return watchWake(wake);
  }, [phase, wake]);

  // The editor: Preview buttons — the only way in there.
  useEffect(() => {
    if (linkSync) return;
    const onPreview = (e: Event) => {
      const request = (e as CustomEvent<SaverPreviewRequest>).detail ?? { kind: 'screensaver' };
      if (request.kind === 'lock') {
        if (phaseRef.current === 'off') showLock(true);
      } else startSaver(request.moduleId ?? null, true);
    };
    window.addEventListener(PREVIEW_SAVER_EVENT, onPreview);
    return () => window.removeEventListener(PREVIEW_SAVER_EVENT, onPreview);
  }, [linkSync, startSaver, showLock]);

  const wouldStart = variant === 'desktop' && settings.enabled && (playable.length > 0 || lockOn);
  const wouldLock = lockOn; // phones lock too (no screen saver there)

  return {
    phase,
    moduleId,
    preview,
    canStart: linkSync && wouldStart,
    canLock: linkSync && wouldLock,
    wouldStart,
    wouldLock,
    start,
    lock,
    unlock,
    corner,
  };
}
