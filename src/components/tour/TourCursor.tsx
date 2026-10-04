'use client';

import type { Ref } from 'react';

/** Drawn ~1.45× real size so it's easy to follow on a projector, a big screen, or a screen recording. */
export const CURSOR_SCALE = 1.45;
/** Where the click lands: just inside the arrow's tip, the hand's fingertip (drawing units), the fingertip circle's centre (px). */
export const HOTSPOTS = { arrow: { x: 3.6, y: 3 }, hand: { x: 10.4, y: 2.6 }, finger: { x: 22, y: 22 } } as const;
export type CursorShape = keyof typeof HOTSPOTS;

/**
 * The tour's pointer. The player moves and switches it straight on the element (transform, data-shape,
 * data-down), so a glide doesn't re-render React on every frame.
 */
export function TourCursor({ variant, ref }: { variant: 'desktop' | 'phone'; ref: Ref<HTMLDivElement> }) {
  if (variant === 'phone') {
    return (
      <div ref={ref} data-testid="tour-finger" data-shape="finger" className="tour-cursor">
        <span className="tour-finger block" />
      </div>
    );
  }
  return (
    <div ref={ref} data-testid="tour-cursor" data-shape="arrow" className="tour-cursor">
      <svg className="tour-arrow" width={20 * CURSOR_SCALE} height={28 * CURSOR_SCALE} viewBox="0 0 20 28">
        <path d="M3 2 L3 22.2 L7.9 17.6 L11.4 25.4 L14.6 24 L11.2 16.4 L17.6 16.4 Z" fill="#000" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      <svg className="tour-hand" width={24 * CURSOR_SCALE} height={26 * CURSOR_SCALE} viewBox="0 0 24 26">
        <path
          d="M8.6 3.6c0-1 .8-1.8 1.8-1.8s1.8.8 1.8 1.8v6.6c.3-.6 1-1 1.7-1 .9 0 1.7.7 1.8 1.5.3-.5.9-.8 1.6-.8 1 0 1.7.7 1.8 1.7.3-.3.8-.4 1.2-.4 1 0 1.8.8 1.8 1.8v4.6c0 3.2-2.3 5.9-5.7 5.9h-2.4c-1.9 0-3.4-.8-4.5-2.3L3.4 15.6c-.6-.8-.4-2 .4-2.6.8-.5 1.8-.3 2.4.4l2.4 2.9Z"
          fill="#fff"
          stroke="#000"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M12.2 10.2v4.6M15.5 11v3.8M18.9 12.3v2.9" stroke="#000" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    </div>
  );
}
