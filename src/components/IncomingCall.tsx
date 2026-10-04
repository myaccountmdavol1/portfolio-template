'use client';

import Image from 'next/image';
import { PhoneOff, Phone as PhoneGlyph } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { usePageHidden } from '@/hooks/usePageHidden';
import { initials } from '@/lib/format';
import { markMissedCall } from '@/lib/screensavers/lock';
import { MENU_BAR_H } from '@/lib/geometry';
import { readPref } from '@/lib/visitorPrefs';
import type { SiteSettings } from '@/lib/types';

export const CALL_SHOWN_KEY = 'portfolio:incomingCallShown';

interface IncomingCallProps {
  call: SiteSettings['incomingCall'];
  variant: 'desktop' | 'phone';
  onAnswer: () => void;
  /** Focus is a Control Center tile on this site (switched off, it can't silence the call). */
  focusAllowed?: boolean;
  /** The guided tour is playing (or the screen is locked): a call that's due waits until it ends. */
  held?: boolean;
  /** Told when it starts and stops ringing (the screen saver waits while it rings). */
  onRingingChange?: (ringing: boolean) => void;
}

const MISSED_MS = 9000;
/** A call nobody answers stops ringing after this long on screen (a background tab doesn't count), leaves the missed-call banner, and the lock screen mentions it. */
export const RING_MS = 20_000;

export function IncomingCall({ call, variant, onAnswer, focusAllowed = true, held = false, onRingingChange }: IncomingCallProps) {
  const [visible, setVisible] = useState(false);
  const ringRef = useRef(onRingingChange);
  useEffect(() => {
    ringRef.current = onRingingChange;
  });
  // After a decline, iOS-style: a “Missed call” banner with Call back, so the call isn't gone for good.
  const [missed, setMissed] = useState(false);

  useEffect(() => {
    if (!missed) return;
    const id = window.setTimeout(() => setMissed(false), MISSED_MS);
    return () => window.clearTimeout(id);
  }, [missed]);

  useEffect(() => {
    if (!call.enabled) return;
    try {
      if (window.sessionStorage.getItem(CALL_SHOWN_KEY)) return;
    } catch {
      // Storage blocked: still show it once for this page load.
    }
    const id = window.setTimeout(() => {
      // Focus (Control Center) is on: don't ring.
      if (focusAllowed && readPref('focus')) return;
      setVisible(true);
      ringRef.current?.(true);
      try {
        window.sessionStorage.setItem(CALL_SHOWN_KEY, '1');
      } catch {
        // ignore
      }
    }, Math.max(0, call.delaySec) * 1000);
    return () => window.clearTimeout(id);
  }, [call.enabled, call.delaySec, focusAllowed]);

  // Nobody answers: it stops ringing and counts as missed. Held (tour, lock screen) = not ringing, so no count-down.
  // Nor in a background tab (cmd-clicked open, or switched away): it only rings out once it's been on screen for
  // the whole RING_MS, so a visitor who comes back later still finds it ringing.
  const pageHidden = usePageHidden();
  useEffect(() => {
    if (!visible || held || pageHidden) return;
    const id = window.setTimeout(() => {
      setVisible(false);
      setMissed(true);
      markMissedCall();
      ringRef.current?.(false);
    }, RING_MS);
    return () => window.clearTimeout(id);
  }, [visible, held, pageHidden]);

  const isPhone = variant === 'phone';
  const top = isPhone ? 'calc(env(safe-area-inset-top) + 8px)' : MENU_BAR_H + 12;

  if (held) return null; // it still rang on time; it shows once the tour ends
  if (missed) {
    return (
      <section
        aria-label="Missed call"
        className="call-in fixed inset-x-0 z-[9500] mx-auto flex w-[min(360px,calc(100%-16px))] items-center gap-3 rounded-[20px] bg-[#1c1c1e]/90 px-3.5 py-2.5 text-white shadow-[0_18px_44px_rgba(0,0,0,.32)] backdrop-blur-xl"
        style={{ top }}
      >
        <PhoneOff size={18} aria-hidden className="flex-none text-[#ff453a]" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs text-white/60">Missed call</span>
          <span className="truncate text-sm font-semibold">{call.callerName}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setMissed(false);
            onAnswer();
          }}
          className="flex flex-none cursor-pointer items-center gap-1.5 rounded-full bg-[#34c759] px-3 py-1.5 text-[13px] font-semibold"
        >
          <PhoneGlyph size={14} aria-hidden /> Call back
        </button>
      </section>
    );
  }

  if (!visible) return null;
  const answer = () => {
    setVisible(false);
    ringRef.current?.(false);
    onAnswer();
  };

  return (
    <section
      aria-label="Incoming call"
      className="call-in fixed inset-x-0 z-[9500] mx-auto flex w-[min(400px,calc(100%-16px))] items-center gap-3 rounded-[22px] bg-[#1c1c1e]/90 p-3 text-white shadow-[0_18px_44px_rgba(0,0,0,.32)] backdrop-blur-xl"
      style={{ top }}
    >
      <span className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-full bg-[#6e6e73] text-base font-semibold">
        {call.imageUrl ? (
          <Image src={call.imageUrl} alt="" width={48} height={48} className="h-full w-full object-cover" />
        ) : (
          initials(call.callerName)
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs text-white/60">{isPhone ? 'mobile' : 'Incoming call'}</span>
        <span className="truncate text-[15px] font-semibold">{call.callerName}</span>
      </span>
      <button
        type="button"
        aria-label="Decline"
        onClick={() => {
          setVisible(false);
          setMissed(true);
          ringRef.current?.(false);
        }}
        className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full bg-[#ff3b30]"
      >
        <PhoneOff size={20} aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Answer"
        onClick={answer}
        className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full bg-[#34c759]"
      >
        <PhoneGlyph size={20} aria-hidden />
      </button>
    </section>
  );
}
