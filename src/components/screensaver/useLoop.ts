'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Calls `frame(dt)` on every animation frame while `active`. A background tab gets no frames, and `dt` is capped
 * at 50 ms, so the animation pauses there and carries on where it was.
 */
export function useLoop(frame: (dt: number) => void, active: boolean): void {
  const latest = useRef(frame);
  useEffect(() => {
    latest.current = frame;
  });
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(50, Math.max(0, now - last));
      last = now;
      latest.current(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}

/**
 * How many steps of `count` have gone by (0, 1, 2, … — it doesn't wrap), moving on after `durationOf(step % count)` ms
 * of animation time (so it pauses when hidden). Keying elements on it gives each pass its own element.
 */
export function useStepCount(count: number, durationOf: (step: number) => number, active: boolean): number {
  const [step, setStep] = useState(0);
  const elapsed = useRef(0);
  const current = useRef(0);
  useLoop((dt) => {
    if (count < 2) return;
    elapsed.current += dt;
    if (elapsed.current < durationOf(current.current % count)) return;
    elapsed.current = 0;
    current.current += 1;
    setStep(current.current);
  }, active);
  return step;
}

/** Which of `count` steps shows, moving on after `durationOf(step)` ms of animation time (so it pauses when hidden). */
export function useSequence(count: number, durationOf: (step: number) => number, active: boolean): number {
  const step = useStepCount(count, durationOf, active);
  return count > 0 ? step % count : 0;
}
