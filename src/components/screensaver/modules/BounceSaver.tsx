'use client';

import { useRef, useState } from 'react';
import { BOUNCE_COLORS, bounceStep, type BounceSettings, type BounceState } from '@/lib/screensavers/bounce';
import type { SaverProps } from '../saverProps';
import { useLoop } from '../useLoop';

const SPEED = 0.12; // px per ms

/** The owner's initials bounce like the old DVD logo, changing colour at every wall. An exact corner earns 🎯. */
export function BounceSaver({ data, settings, reduced, onCorner }: SaverProps<BounceSettings>) {
  const stage = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLDivElement>(null);
  const state = useRef<BounceState | null>(null);
  const color = useRef(0);
  const [corners, setCorners] = useState(0);
  useLoop((dt) => {
    const host = stage.current;
    const el = logo.current;
    if (!host || !el) return;
    const w = host.clientWidth - el.offsetWidth;
    const h = host.clientHeight - el.offsetHeight;
    if (!state.current) {
      state.current = { x: Math.random() * w, y: Math.random() * h, vx: SPEED * (Math.random() < 0.5 ? -1 : 1), vy: SPEED * 0.75 * (Math.random() < 0.5 ? -1 : 1) };
    }
    const step = bounceStep(state.current, dt, w, h);
    state.current = step.state;
    if (step.hitX || step.hitY) {
      color.current = (color.current + 1) % BOUNCE_COLORS.length;
      el.style.color = BOUNCE_COLORS[color.current];
    }
    if (step.corner) {
      onCorner();
      setCorners((n) => n + 1);
    }
    el.style.transform = `translate(${step.state.x}px, ${step.state.y}px)`;
  }, !reduced);
  const logoClass = 'rounded-xl border-[3px] border-current px-3.5 py-1.5 text-[clamp(34px,5vw,64px)] font-extrabold leading-none tracking-[-0.02em]';
  if (reduced) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        <div className={logoClass} style={{ color: data.site.accent }}>
          {settings.text}
        </div>
      </div>
    );
  }
  return (
    <div ref={stage} className="absolute inset-0 overflow-hidden bg-black">
      <div ref={logo} className={`absolute left-0 top-0 will-change-transform ${logoClass}`} style={{ color: data.site.accent, transform: 'translate(-9999px, 0)' }}>
        {settings.text}
      </div>
      {corners > 0 && (
        <p key={corners} className="saver-corner absolute inset-0 m-0 flex items-center justify-center text-[clamp(18px,2.4vw,32px)] font-bold [text-shadow:0_2px_10px_#000]">
          🎯 Corner!
        </p>
      )}
    </div>
  );
}
