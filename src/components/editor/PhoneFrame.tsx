'use client';

import type { ReactNode } from 'react';

/**
 * A phone-sized preview on a desktop screen. `transform` makes this the containing block for the
 * phone layout's `position: fixed` elements, so they stay inside the frame.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#d9dde3] pb-4 pt-[88px]">
      <div
        data-testid="phone-frame"
        className="relative overflow-hidden rounded-[48px] border-[10px] border-[#1d1d1f] bg-black shadow-[0_30px_80px_rgba(0,0,0,.3)]"
        style={{ height: 'min(844px, calc(100dvh - 110px))', aspectRatio: '390 / 844', transform: 'translateZ(0)' }}
      >
        {children}
      </div>
    </div>
  );
}
