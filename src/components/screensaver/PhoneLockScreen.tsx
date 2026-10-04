'use client';

import { useEffect, useRef } from 'react';
import { useClock } from '@/hooks/useClock';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { usePointerDrag } from '@/hooks/usePointerDrag';
import { formatPhoneTime } from '@/lib/format';
import { resolveLock, type UnlockHow } from '@/lib/screensavers/lock';
import type { SiteData } from '@/lib/types';
import { wallpaperStyle } from '@/lib/wallpaper';
import { LockNotificationList } from './LockNotificationList';
import { useLockNotifications } from './useLockNotifications';

export const SWIPE_UNLOCK_PX = 80;

interface PhoneLockScreenProps {
  data: SiteData;
  dark: boolean;
  unlocking: boolean;
  /** Public site: keys aimed outside the lock screen are stopped (a hardware keyboard's Esc mustn't reach a sheet behind). */
  isolateKeys: boolean;
  onUnlock: (how: UnlockHow) => void;
}

/** The iPhone lock screen: clock, real notifications, and "Swipe up to unlock" (the bar is a button for keyboards and screen readers). */
export function PhoneLockScreen({ data, dark, unlocking, isolateKeys, onUnlock }: PhoneLockScreenProps) {
  const ref = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const lastDy = useRef(0);
  const lock = resolveLock(data);
  const notes = useLockNotifications(data, lock);
  const wp = wallpaperStyle(data.site.wallpaper, dark, 1080);
  const now = useClock();
  useDialogFocus(ref);

  useEffect(() => {
    if (!isolateKeys) return;
    const onKey = (e: KeyboardEvent) => {
      const el = ref.current;
      if (!el || (e.target instanceof Node && el.contains(e.target))) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      el.focus({ preventScroll: true });
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isolateKeys]);
  const drag = usePointerDrag({
    onMove: (_dx, dy) => {
      lastDy.current = dy;
      const el = sheetRef.current;
      if (!el) return;
      el.style.transition = 'none';
      el.style.transform = `translateY(${Math.min(0, dy)}px)`;
    },
    onEnd: (dragged) => {
      const up = dragged && lastDy.current < -SWIPE_UNLOCK_PX;
      lastDy.current = 0;
      const el = sheetRef.current;
      if (el) {
        el.style.transition = 'transform .35s cubic-bezier(.2,.9,.3,1)';
        el.style.transform = up ? 'translateY(-110%)' : '';
      }
      if (up) onUnlock('guest');
    },
  });
  const date = now ? now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : '';

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Lock screen"
      tabIndex={-1}
      data-testid="lock-screen"
      data-unlocking={unlocking || undefined}
      onKeyDown={(e) => e.stopPropagation()}
      className="lock-screen fixed inset-0 z-[9800] touch-none select-none overflow-hidden text-white"
    >
      <div ref={sheetRef} onPointerDown={drag.onPointerDown} className="absolute inset-0 cursor-grab">
        <div aria-hidden className="lock-wall" style={{ background: wp.background }} />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.05)_40%,rgba(0,0,0,.35))]" />
        <div className="lock-content relative flex h-full flex-col items-center px-[5%] pb-[calc(env(safe-area-inset-bottom)+12px)] pt-[calc(env(safe-area-inset-top)+8vh)]">
          <p className="m-0 text-[15px] font-semibold opacity-90">{date}</p>
          <p className="m-0 text-[76px] font-bold leading-none tracking-[-0.03em] tabular-nums">{now ? formatPhoneTime(now, data.site.clock24) : ''}</p>
          <div className="mt-auto w-full">
            <LockNotificationList notes={notes} />
          </div>
          <div className="mt-4 flex flex-col items-center text-[13px] opacity-85">
            Swipe up to unlock
            <button type="button" aria-label="Unlock" onClick={() => onUnlock('guest')} className="flex cursor-pointer items-center justify-center px-6 py-3">
              <span aria-hidden className="block h-[5px] w-[36vw] max-w-[140px] rounded-full bg-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
