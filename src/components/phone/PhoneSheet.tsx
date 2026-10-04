'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppLinkContext, type AppLinkApi, type FocusRequest } from '@/components/AppLinkContext';
import { MissingItemNote } from '@/components/MissingItemNote';
import { ShareButton } from '@/components/ShareButton';
import { AppContent } from '@/components/apps/AppContent';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { usePointerDrag } from '@/hooks/usePointerDrag';
import { zoomFromRectTransform, type Rect } from '@/lib/geometry';
import type { PortfolioApp } from '@/lib/types';

const DURATION_MS = 320;
const DISMISS_PX = 120;

type Phase = 'opening' | 'open' | 'closing';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Transform that shrinks the full-screen sheet onto `origin` (or a small centred box when opened by a link/call). */
function collapsedTransform(origin: Rect | null): string {
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const rect = origin ?? {
    left: viewport.width * 0.4,
    top: viewport.height * 0.4,
    width: viewport.width * 0.2,
    height: viewport.height * 0.2,
  };
  return zoomFromRectTransform(rect, viewport);
}

interface PhoneSheetProps {
  app: PortfolioApp;
  origin: Rect | null;
  focus: FocusRequest | null;
  itemKey: string | null;
  onItemChange: (appId: string, itemKey: string | null) => void;
  pathFor: (appId: string, itemKey?: string) => string | null;
  onClosed: () => void;
}

export function PhoneSheet({ app, origin, focus, itemKey, onItemChange, pathFor, onClosed }: PhoneSheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref);

  // The sheet only mounts in the browser (after a tap), so reading window here is safe.
  const [collapsed] = useState(() => collapsedTransform(origin));
  const [reduceMotion] = useState(prefersReducedMotion);
  const [phase, setPhase] = useState<Phase>('opening');
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragYRef = useRef(0);
  const closingRef = useRef(false);

  // Frame 1 paints the collapsed sheet, frame 2 starts the grow transition.
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPhase('open'));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);

  function close() {
    if (closingRef.current) return;
    closingRef.current = true;
    setPhase('closing');
    setDragY(0);
    window.setTimeout(onClosed, reduceMotion ? 0 : DURATION_MS);
  }

  // Esc closes the sheet. Keep a ref so the listener always calls the latest close().
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const drag = usePointerDrag({
    onStart: () => setDragging(true),
    onMove: (_dx, dy) => {
      dragYRef.current = Math.max(0, dy);
      setDragY(dragYRef.current);
    },
    onEnd: (dragged) => {
      setDragging(false);
      if (!dragged) return;
      if (dragYRef.current > DISMISS_PX) {
        close();
      } else {
        dragYRef.current = 0;
        setDragY(0);
      }
    },
  });

  const transform = phase === 'open' ? (dragY > 0 ? `translateY(${dragY}px)` : 'none') : collapsed;
  const transition =
    reduceMotion || dragging ? 'none' : `transform ${DURATION_MS}ms cubic-bezier(.2,.9,.3,1), opacity ${DURATION_MS}ms ease`;

  const reportItem = useCallback((key: string | null) => onItemChange(app.id, key), [onItemChange, app.id]);
  const linkApi = useMemo<AppLinkApi>(() => ({ focus, reportItem, pathFor: (key) => pathFor(app.id, key) }), [focus, reportItem, pathFor, app.id]);
  const sharePath = pathFor(app.id, itemKey ?? undefined);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={app.title}
      tabIndex={-1}
      data-phase={phase}
      className="fixed inset-0 z-[500] flex select-text flex-col bg-[#fbfaf7] text-[#1d1c1a] outline-none"
      style={{ transform, transformOrigin: '0 0', opacity: phase === 'open' ? 1 : 0, transition }}
    >
      <div
        data-testid="sheet-titlebar"
        onPointerDown={drag.onPointerDown}
        className="window-chrome flex-none touch-none select-none border-b border-black/[.07] bg-[#f1efea]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div aria-hidden className="mx-auto mt-2 h-[5px] w-9 rounded-full bg-black/20" />
        <div className="grid h-11 grid-cols-[1fr_auto_1fr] items-center px-4">
          <span className="justify-self-start" onPointerDown={(e) => e.stopPropagation()}>
            {sharePath && <ShareButton path={sharePath} title={app.title} look="icon" />}
          </span>
          <h2 className="m-0 truncate text-[15px] font-semibold">{app.title}</h2>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={close}
            className="cursor-pointer justify-self-end text-[15px] font-semibold text-[#0a84ff]"
          >
            Done
          </button>
        </div>
      </div>
      <MissingItemNote focus={focus} />
      <div className="app-content min-h-0 flex-1 overflow-auto bg-[#fbfaf7]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <AppLinkContext.Provider value={linkApi}>
          <AppContent app={app} />
        </AppLinkContext.Provider>
      </div>
    </div>
  );
}
