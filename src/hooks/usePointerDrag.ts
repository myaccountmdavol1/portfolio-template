'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export interface PointerDragHandlers {
  /** Called once, when the pointer has moved past the threshold. */
  onStart?: () => void;
  /** Total movement since pointer down, in px. Only called after onStart. */
  onMove: (dx: number, dy: number) => void;
  /** Called on pointer up/cancel. `dragged` is false for a plain click. `point` is where the pointer ended. */
  onEnd?: (dragged: boolean, point: { x: number; y: number }) => void;
}

const THRESHOLD_PX = 4;

export function usePointerDrag(handlers: PointerDragHandlers) {
  // Always call the latest handlers without re-creating onPointerDown.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const cleanupRef = useRef<(() => void) | null>(null);
  const draggedRef = useRef(false);

  useEffect(() => () => cleanupRef.current?.(), []);

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.button !== 0) return; // primary button / touch / pen only
    cleanupRef.current?.();
    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;
    draggedRef.current = false;

    function move(ev: PointerEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragging) {
        if (Math.hypot(dx, dy) < THRESHOLD_PX) return;
        dragging = true;
        draggedRef.current = true;
        handlersRef.current.onStart?.();
      }
      ev.preventDefault();
      handlersRef.current.onMove(dx, dy);
    }

    function end(ev: PointerEvent) {
      cleanup();
      handlersRef.current.onEnd?.(dragging, { x: ev.clientX, y: ev.clientY });
    }

    function cleanup() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      cleanupRef.current = null;
    }

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    cleanupRef.current = cleanup;
  }, []);

  /** True if the last press turned into a drag. Resets itself, so call it once per click. */
  const wasDragged = useCallback(() => {
    const dragged = draggedRef.current;
    draggedRef.current = false;
    return dragged;
  }, []);

  return { onPointerDown, wasDragged };
}
