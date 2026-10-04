'use client';

import { Pause, Play, Square, X } from 'lucide-react';
import { DOCK_RESERVED_H, MENU_BAR_H } from '@/lib/geometry';
import type { TourContacts } from '@/lib/tour';
import { TourCaption } from './TourCaption';
import { TourCursor } from './TourCursor';
import { TourEndCard } from './TourEndCard';
import { hideTourPill, useTourPillHidden, type TourApi } from './useTour';

interface TourPlayerProps {
  tour: TourApi;
  variant: 'desktop' | 'phone';
  /** Desktop, public site, the owner's switch on, no window open: the "Take the 60-second tour" pill. */
  showPill: boolean;
  contacts: TourContacts;
  /** The end card's Calendar / Resume buttons: a normal, counted open. */
  onOpenApp: (appId: string) => void;
}

const barButton = 'flex h-7 w-7 cursor-pointer items-center justify-center rounded-full hover:bg-white/15';

export function TourPlayer({ tour, variant, showPill, contacts, onOpenApp }: TourPlayerProps) {
  const pillHidden = useTourPillHidden();
  // Taken apart up front: the hooks lint reads `overlayRef` as "tour is a ref" and flags every other field.
  const { overlayRef, rippleRef, cursorRef, playing, stopOnMove, phase, index, total, caption, available, start, pause, resume, stop, closeEnd } = tour;
  return (
    <>
      {/* Always mounted: the player measures icons relative to it. */}
      <div ref={overlayRef} aria-hidden className="pointer-events-none fixed inset-0 z-[9600] overflow-hidden">
        <div ref={rippleRef} />
        {playing && <TourCursor variant={variant} ref={cursorRef} />}
      </div>
      {playing && (
        <>
          <div
            role="toolbar"
            aria-label="Tour"
            data-tour-ui
            className={`fixed left-1/2 z-[9601] flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-1 rounded-full bg-[#1c1c1e]/85 py-1 text-[13px] font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,.3)] backdrop-blur-lg ${variant === 'phone' ? 'pl-3.5 pr-1' : 'px-3.5'}`}
            style={variant === 'phone' ? { bottom: 'calc(env(safe-area-inset-bottom) + 36px)' } : { top: MENU_BAR_H + 10 }}
          >
            <span className="mr-1 tabular-nums">
              Tour · {index + 1} / {total}
            </span>
            {variant === 'desktop' && stopOnMove ? (
              // Desktop, default: stop-only. Reaching a button with the mouse would stop the tour anyway (the 8 px rule).
              <span className="text-white/70">— move the mouse or press any key to stop</span>
            ) : (
              <>
                {phase === 'paused' ? (
                  <button type="button" aria-label="Resume" onClick={resume} className={barButton}>
                    <Play size={14} aria-hidden />
                  </button>
                ) : (
                  <button type="button" aria-label="Pause" onClick={pause} className={barButton}>
                    <Pause size={14} aria-hidden />
                  </button>
                )}
                <button type="button" aria-label="Stop" onClick={stop} className={barButton}>
                  <Square size={12} aria-hidden />
                </button>
                {variant === 'desktop' && <span className="ml-1 text-white/70">— click elsewhere or press any key to stop</span>}
              </>
            )}
          </div>
          <TourCaption text={caption} variant={variant} />
        </>
      )}
      {phase === 'ended' && <TourEndCard variant={variant} contacts={contacts} onOpenApp={onOpenApp} onClose={closeEnd} />}
      {showPill && available && phase === 'idle' && !pillHidden && (
        <div
          className="fixed left-1/2 z-[9001] flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-[#1c1c1e]/80 p-1 text-[13px] font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,.25)] backdrop-blur-lg"
          style={{ bottom: DOCK_RESERVED_H + 8 }}
        >
          <button type="button" onClick={start} className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 hover:bg-white/15">
            <Play size={13} aria-hidden /> Take the 60-second tour
          </button>
          <button type="button" aria-label="Hide the tour button" onClick={hideTourPill} className={barButton}>
            <X size={14} aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}
