'use client';

import { CalendarDays, FileText, Mail } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { isScreenHeld } from '@/lib/screensavers/screenHeld';
import type { TourContacts } from '@/lib/tour';

interface TourEndCardProps {
  variant: 'desktop' | 'phone';
  contacts: TourContacts;
  /** Calendar / Resume: a normal (counted) open, after the card closes. */
  onOpenApp: (appId: string) => void;
  onClose: () => void;
}

const action =
  'flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-black/[.06] px-4 py-2.5 text-[14px] font-semibold text-[#1d1c1a] no-underline hover:bg-black/10';

/** The tour's last card: thanks, the owner's contact actions, or back to exploring. */
export function TourEndCard({ variant, contacts, onOpenApp, onClose }: TourEndCardProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // A modal: focus moves to its first action, and goes back where it was (or to the page) when it closes.
  // (Only if focus is still on the card or lost: Calendar / Resume open a window that takes it.)
  useEffect(() => {
    const before = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>('a[href], button')?.focus();
    return () => {
      const now = document.activeElement;
      if (now && now !== document.body && !dialog?.contains(now)) return;
      if (before instanceof HTMLElement && before !== document.body && before.isConnected) before.focus();
      else if (now instanceof HTMLElement) now.blur();
    };
  }, []);
  useEffect(() => {
    // Captured and swallowed, so the same Esc doesn't also close a window (or sheet) underneath. Not while the screen
    // saver or lock screen is on top: that Esc is theirs.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || isScreenHeld()) return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const { email, calendar, resume } = contacts;
  const open = (appId: string) => {
    onClose();
    onOpenApp(appId);
  };
  return (
    <div
      className="fixed inset-0 z-[9600] flex items-center justify-center bg-black/25 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Thanks for watching"
        className={`flex w-full flex-col gap-3 rounded-[22px] bg-[#fbfaf7] p-6 text-center text-[#1d1c1a] shadow-[0_30px_80px_rgba(0,0,0,.35)] ${variant === 'phone' ? 'max-w-[340px]' : 'max-w-[380px]'}`}
      >
        <span aria-hidden className="text-4xl">
          🎬
        </span>
        <h2 className="m-0 text-xl font-semibold">Thanks for watching</h2>
        <p className="m-0 text-[13px] text-[#6b675f]">Want to talk? Here’s how to reach me.</p>
        <div className="mt-1 flex flex-col gap-2">
          {email && (
            <a href={`mailto:${email}`} onClick={onClose} className={action}>
              <Mail size={16} aria-hidden /> Email me
            </a>
          )}
          {calendar && (
            <button type="button" onClick={() => open(calendar.appId)} className={action}>
              <CalendarDays size={16} aria-hidden /> {calendar.title}
            </button>
          )}
          {resume && (
            <button type="button" onClick={() => open(resume.appId)} className={action}>
              <FileText size={16} aria-hidden /> {resume.title}
            </button>
          )}
        </div>
        <button type="button" onClick={onClose} className="mt-1 cursor-pointer text-[14px] font-semibold text-[#0a84ff]">
          Explore on your own
        </button>
      </div>
    </div>
  );
}
