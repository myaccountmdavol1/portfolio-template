'use client';

import { useRef } from 'react';
import { driftBadges, type DriftSettings } from '@/lib/screensavers/drift';
import type { SaverProps } from '../saverProps';
import { useLoop } from '../useLoop';

interface Floater {
  x: number; // fraction of the stage
  y: number;
  vx: number; // fraction per ms
  vy: number;
  r: number; // sway phase
  vr: number;
  s: number; // scale
}

/** The owner's badges float slowly upward and sway, wrapping round the edges (moved straight on the elements). */
export function DriftSaver({ data, settings, reduced }: SaverProps<DriftSettings>) {
  const badges = driftBadges(data, settings);
  const stage = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLImageElement | null)[]>([]);
  const floaters = useRef<Floater[] | null>(null);
  useLoop((dt) => {
    const host = stage.current;
    if (!host) return;
    if (!floaters.current || floaters.current.length !== badges.length) {
      floaters.current = badges.map(() => ({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.00005,
        vy: -0.00003 - Math.random() * 0.00004,
        r: Math.random() * 360,
        vr: 0.004 + Math.random() * 0.006,
        s: 0.7 + Math.random() * 0.5,
      }));
    }
    const w = host.clientWidth;
    const h = host.clientHeight;
    floaters.current.forEach((b, i) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.r += b.vr * dt;
      if (b.y < -0.3) {
        b.y = 1.05;
        b.x = Math.random();
      }
      if (b.x < -0.3) b.x = 1.05;
      if (b.x > 1.05) b.x = -0.3;
      const el = els.current[i];
      if (el) el.style.transform = `translate(${b.x * w}px, ${b.y * h}px) rotate(${Math.sin(b.r / 40) * 14}deg) scale(${b.s})`;
    });
  }, !reduced);
  const background = `radial-gradient(ellipse at 50% 120%, color-mix(in srgb, ${data.site.accent} 30%, #000) 0%, #07100a 70%)`;
  if (reduced) {
    return (
      <div className="absolute inset-0 flex flex-wrap content-center items-center justify-center gap-8 p-[8vw]" style={{ background }}>
        {badges.map((b) => (
          // eslint-disable-next-line @next/next/no-img-element -- badge images from any host
          <img key={b.id} src={b.imageUrl} alt="" className="aspect-square w-[min(14vw,160px)] object-contain [filter:drop-shadow(0_6px_14px_rgba(0,0,0,.55))]" />
        ))}
      </div>
    );
  }
  return (
    <div ref={stage} className="absolute inset-0 overflow-hidden" style={{ background }}>
      {badges.map((b, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- badge images from any host
        <img
          key={b.id}
          ref={(el) => {
            els.current[i] = el;
          }}
          src={b.imageUrl}
          alt=""
          className="absolute left-0 top-0 aspect-square w-[min(22vw,220px)] object-contain will-change-transform [filter:drop-shadow(0_6px_14px_rgba(0,0,0,.55))]"
          style={{ transform: 'translate(-9999px, 0)' }}
        />
      ))}
    </div>
  );
}
