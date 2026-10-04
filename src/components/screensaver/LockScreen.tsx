'use client';

import { User } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useClock } from '@/hooks/useClock';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { formatPhoneTime, initials } from '@/lib/format';
import { checkPassword, resolveLock, type ResolvedLock, type UnlockHow } from '@/lib/screensavers/lock';
import type { SiteData } from '@/lib/types';
import { wallpaperStyle } from '@/lib/wallpaper';
import { LockNotificationList } from './LockNotificationList';
import { useLockNotifications } from './useLockNotifications';

/** The click that woke the screen saver can't land on Guest: the tiles ignore the pointer for this long. */
export const LOCK_ARM_MS = 300;

interface LockScreenProps {
  data: SiteData;
  dark: boolean;
  /** Fading out after an unlock (the wallpaper stops where it was). */
  unlocking: boolean;
  /** The public site: keys aimed at the page behind come back here. Off in the editor's preview, so the inspector still types. */
  isolateKeys: boolean;
  onUnlock: (how: UnlockHow) => void;
}

const tile = 'flex cursor-pointer flex-col items-center gap-1.5 rounded-xl p-1 text-[13px] font-semibold [text-shadow:0_1px_4px_rgba(0,0,0,.5)]';
const disc = 'flex flex-none items-center justify-center rounded-full border-2 border-white/35 shadow-[0_6px_18px_rgba(0,0,0,.35)]';

function Avatar({ lock, size }: { lock: ResolvedLock; size: number }) {
  if (lock.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- an uploaded or About Me photo from any host
    return <img src={lock.avatarUrl} alt="" style={{ width: size, height: size }} className={`${disc} object-cover`} />;
  }
  return (
    <span aria-hidden style={{ width: size, height: size }} className={`${disc} bg-gradient-to-b from-[#9aa0a8] to-[#6b717a] text-xl font-semibold`}>
      {initials(lock.ownerName)}
    </span>
  );
}

/** A Sonoma-style lock screen: wallpaper, big clock, real notifications, the owner's tile (password) and Guest. */
export function LockScreen({ data, dark, unlocking, isolateKeys, onUnlock }: LockScreenProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lock = resolveLock(data);
  const notes = useLockNotifications(data, lock);
  const wp = wallpaperStyle(data.site.wallpaper, dark);
  const now = useClock();
  const [armed, setArmed] = useState(false);
  const [asking, setAsking] = useState(false);
  const [typed, setTyped] = useState('');
  const [wrong, setWrong] = useState(false);
  useDialogFocus(ref);

  useEffect(() => {
    const id = window.setTimeout(() => setArmed(true), LOCK_ARM_MS);
    return () => window.clearTimeout(id);
  }, []);

  // A key aimed outside the lock screen (focus left on the page behind) is stopped, and focus comes back here.
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

  useEffect(() => {
    if (asking) inputRef.current?.focus();
  }, [asking]);

  const back = () => {
    setAsking(false);
    setTyped('');
    setWrong(false);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (checkPassword(lock, typed)) {
      onUnlock('password');
      return;
    }
    setTyped('');
    setWrong(true);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      inputRef.current?.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
        { duration: 400 },
      );
    }
  };
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
      // Keys stay here: Esc, ⌘K or / never reach the windows behind (React's root listener sits below window).
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape' && asking) back();
      }}
      className="lock-screen fixed inset-0 z-[9800] select-none overflow-hidden text-white"
    >
      <div aria-hidden className="lock-wall" style={{ background: wp.background }} />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.05)_40%,rgba(0,0,0,.35))]" />
      <div className="lock-content relative flex h-full flex-col items-center px-4">
        <p className="m-0 mt-[7vh] text-[clamp(14px,1.5vw,20px)] font-semibold opacity-90">{date}</p>
        <p className="m-0 text-[clamp(64px,10vw,128px)] font-bold leading-none tracking-[-0.03em] tabular-nums [text-shadow:0_2px_30px_rgba(0,0,0,.25)]">
          {now ? formatPhoneTime(now, data.site.clock24) : ''}
        </p>
        <div className="mt-[5vh] w-[min(360px,100%)]">
          <LockNotificationList notes={notes} />
        </div>
        <div className={`mb-[7vh] mt-auto flex flex-col items-center gap-2 ${armed ? '' : 'pointer-events-none'}`}>
          {asking ? (
            <form onSubmit={submit} className="flex flex-col items-center gap-2">
              <Avatar lock={lock} size={56} />
              <span className="text-[13px] font-semibold [text-shadow:0_1px_4px_rgba(0,0,0,.5)]">{lock.ownerName}</span>
              <input
                ref={inputRef}
                type="password"
                aria-label="Password"
                placeholder="Enter Password"
                autoComplete="off"
                value={typed}
                onChange={(e) => {
                  setTyped(e.target.value);
                  setWrong(false);
                }}
                className="w-[190px] rounded-full border-none bg-white/30 px-3 py-1.5 text-center text-[13px] text-white outline-none backdrop-blur-xl placeholder:text-white/75"
              />
              <p role="status" className="m-0 min-h-4 text-xs opacity-85">
                {wrong ? 'Incorrect password' : lock.hint.trim() ? `Hint: ${lock.hint.trim()}` : ''}
              </p>
              <button type="button" onClick={back} className="cursor-pointer text-xs underline opacity-80">
                Back
              </button>
            </form>
          ) : (
            <div className="flex items-end justify-center gap-9">
              {lock.password !== null ? (
                <button type="button" onClick={() => setAsking(true)} className={tile}>
                  <Avatar lock={lock} size={62} />
                  {lock.ownerName}
                </button>
              ) : (
                <div className={`${tile} cursor-default`}>
                  <Avatar lock={lock} size={62} />
                  {lock.ownerName}
                </div>
              )}
              {lock.guest && (
                <button type="button" onClick={() => onUnlock('guest')} className={tile}>
                  <span aria-hidden className={`${disc} h-[62px] w-[62px] bg-gradient-to-b from-[#9aa0a8] to-[#6b717a]`}>
                    <User size={30} />
                  </span>
                  Guest
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
