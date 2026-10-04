'use client';

import type { RefObject } from 'react';
import { useRef } from 'react';
import { usePointerDrag } from '@/hooks/usePointerDrag';
import { clamp, pxToPct } from '@/lib/geometry';

export interface PctPosition {
  xPct: number;
  yPct: number;
}

export function useAreaDrag(
  areaRef: RefObject<HTMLElement | null>,
  elementRef: RefObject<HTMLElement | null>,
  onChange: (next: PctPosition) => void,
  /** Called once when a drag finishes, with the final position. */
  onEnd?: (final: PctPosition) => void,
) {
  const start = useRef({ x: 0, y: 0, width: 1, height: 1, maxX: 0, maxY: 0 });
  const last = useRef<PctPosition | null>(null);
  return usePointerDrag({
    onStart: () => {
      last.current = null;
      const area = areaRef.current;
      const el = elementRef.current;
      if (!area || !el) return;
      const { width, height } = area.getBoundingClientRect();
      start.current = {
        x: el.offsetLeft,
        y: el.offsetTop,
        width,
        height,
        maxX: Math.max(0, width - el.offsetWidth),
        maxY: Math.max(0, height - el.offsetHeight),
      };
    },
    onMove: (dx, dy) => {
      const s = start.current;
      const next = {
        xPct: pxToPct(clamp(s.x + dx, 0, s.maxX), s.width),
        yPct: pxToPct(clamp(s.y + dy, 0, s.maxY), s.height),
      };
      last.current = next;
      onChange(next);
    },
    onEnd: (dragged) => {
      if (dragged && last.current) onEnd?.(last.current);
    },
  });
}
