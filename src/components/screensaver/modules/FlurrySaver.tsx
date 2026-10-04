'use client';

import { useEffect, useRef } from 'react';
import { hexHue, type FlurrySettings } from '@/lib/screensavers/flurry';
import type { SaverProps } from '../saverProps';
import { useLoop } from '../useLoop';

const STREAMS = 5;

interface Stream {
  hue: number;
  phase: number;
  pts: [number, number][];
}

/** Sizes the canvas to its box at the device's pixel ratio; returns the ratio. */
function fit(c: HTMLCanvasElement): number {
  const d = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(c.clientWidth * d));
  const h = Math.max(1, Math.round(c.clientHeight * d));
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  }
  return d;
}

/** Our take on the classic glowing streams, tinted from the owner's colours (additive blending on a canvas). */
export function FlurrySaver({ settings, reduced }: SaverProps<FlurrySettings>) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const streams = useRef<Stream[] | null>(null);
  const time = useRef(0);
  const hueKey = settings.colors.map(hexHue).join(',');

  // Reduced motion: one still glow per colour.
  useEffect(() => {
    if (!reduced) return;
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const d = fit(c);
    const hues = hueKey.split(',').map(Number);
    ctx.globalCompositeOperation = 'lighter';
    hues.forEach((hue, i) => {
      const x = c.width * ((i + 1) / (hues.length + 1));
      const y = c.height * (0.45 + 0.1 * Math.sin(i * 2));
      const g = ctx.createRadialGradient(x, y, 0, x, y, 160 * d);
      g.addColorStop(0, `hsla(${hue}, 90%, 70%, .8)`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 160 * d, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [reduced, hueKey]);

  useLoop((dt) => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const d = fit(c);
    const w = c.width;
    const h = c.height;
    if (!streams.current) {
      const hues = hueKey.split(',').map(Number);
      streams.current = Array.from({ length: STREAMS }, (_, i) => ({ hue: hues[i % hues.length] ?? 210, phase: Math.random() * 10, pts: [] }));
    }
    time.current += dt;
    const T = time.current / 1000;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0,0,0,0.09)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const cx = w / 2;
    const cy = h / 2;
    for (const s of streams.current) {
      const a = T * 0.7 + s.phase;
      const x = cx + Math.sin(a * 1.3) * w * 0.32 + Math.sin(a * 2.9) * w * 0.08;
      const y = cy + Math.cos(a * 1.1) * h * 0.3 + Math.sin(a * 3.7) * h * 0.06;
      s.pts.push([x, y]);
      if (s.pts.length > 40) s.pts.shift();
      for (let i = 1; i < s.pts.length; i++) {
        const k = i / s.pts.length;
        ctx.strokeStyle = `hsla(${s.hue + Math.sin(T + i * 0.1) * 20}, 80%, ${45 + k * 25}%, ${k * 0.5})`;
        ctx.lineWidth = (1 + k * 7) * d * 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s.pts[i - 1][0], s.pts[i - 1][1]);
        ctx.lineTo(s.pts[i][0], s.pts[i][1]);
        ctx.stroke();
      }
      const g = ctx.createRadialGradient(x, y, 0, x, y, 52 * d);
      g.addColorStop(0, `hsla(${s.hue}, 90%, 80%, .9)`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 52 * d, 0, Math.PI * 2);
      ctx.fill();
    }
  }, !reduced);

  return <canvas ref={canvas} className="absolute inset-0 h-full w-full bg-black" />;
}
