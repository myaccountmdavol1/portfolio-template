'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { COACH_MARKS, EDITOR_TOUR_SEEN_KEY, placeBubble, wantsEditorTour, withoutWelcome, type BubblePlace } from '@/lib/setup/coachMarks';

/** The toolbar button with this accessible name; the toolbar itself when the button is hidden (e.g. Edit is off). */
function findTarget(name: string): HTMLElement | null {
  const toolbar = document.querySelector<HTMLElement>('[role="toolbar"][aria-label="Editor"]');
  if (!toolbar) return null;
  for (const button of Array.from(toolbar.querySelectorAll<HTMLElement>('button'))) {
    const label = (button.getAttribute('aria-label') ?? button.textContent ?? '').trim();
    // Publish reads "Published ✓" or "Publishing…" at times.
    if (label === name || (name === 'Publish' && label.startsWith('Publish'))) return button;
  }
  return toolbar;
}

function readSeen(): string | null {
  try {
    return window.localStorage.getItem(EDITOR_TOUR_SEEN_KEY);
  } catch {
    return null; // storage blocked: show it
  }
}

/**
 * After the setup wizard's "Start editing" (/?edit=1&welcome=1): a small bubble pointing at each main toolbar
 * button in turn. Once per browser; the editor only loads for the owner, so visitors never see it.
 */
export function EditorCoachMarks() {
  // The editor only renders in the browser (EditorShell is loaded with ssr: false), so the address can be read here.
  const [index, setIndex] = useState<number | null>(() => (wantsEditorTour(window.location.search, readSeen()) ? 0 : null));
  const [place, setPlace] = useState<BubblePlace | null>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const finish = useCallback(() => {
    setIndex(null);
    window.history.replaceState(window.history.state, '', withoutWelcome(window.location.href));
  }, []);

  // Seen as soon as it starts: an interrupted tour doesn't come back.
  const started = index !== null;
  useEffect(() => {
    if (!started) return;
    try {
      window.localStorage.setItem(EDITOR_TOUR_SEEN_KEY, '1');
    } catch {
      // storage blocked: it may show again next time
    }
  }, [started]);

  // Escape ends the tour.
  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, finish]);

  // Keyboard and screen-reader users land on the button each step (it is hidden until first placed).
  const placed = place !== null;
  useEffect(() => {
    if (index !== null && placed) primary.current?.focus();
  }, [index, placed]);

  useLayoutEffect(() => {
    if (index === null) return;
    const target = COACH_MARKS[index].target;
    let first = true;
    function measure() {
      const el = findTarget(target);
      const box = bubble.current;
      if (!el || !box) return;
      if (first) {
        first = false;
        // On narrow screens the toolbar scrolls sideways: bring the button into view (no jump at desktop width).
        const b = el.getBoundingClientRect();
        if (b.left < 0 || b.right > window.innerWidth) el.scrollIntoView({ inline: 'center', block: 'nearest' });
      }
      const r = el.getBoundingClientRect();
      const next = placeBubble(
        { left: r.left, top: r.top, width: r.width, height: r.height },
        { width: box.offsetWidth, height: box.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
      );
      setPlace((prev) => (prev && prev.left === next.left && prev.top === next.top && prev.arrowLeft === next.arrowLeft ? prev : next));
    }
    // Measured in the next frame (and then while it shows), never synchronously in the effect.
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    // The toolbar can scroll sideways on narrow screens, and Publish changes width: follow the button.
    const timer = window.setInterval(measure, 400);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      window.clearInterval(timer);
    };
  }, [index]);

  if (index === null) return null;
  const mark = COACH_MARKS[index];
  const last = index === COACH_MARKS.length - 1;

  return (
    <div
      ref={bubble}
      role="dialog"
      aria-label={'Editor tour'}
      className="fixed z-[9700] w-[280px] max-w-[calc(100vw-16px)] rounded-xl bg-[#fbfaf7] p-4 text-[#1d1c1a] shadow-[0_20px_50px_rgba(0,0,0,.3)]"
      style={place ? { left: place.left, top: place.top } : { left: 8, top: 8, visibility: 'hidden' }}
    >
      <span
        aria-hidden
        className="absolute h-3 w-3 rotate-45 bg-[#fbfaf7]"
        style={{ left: (place?.arrowLeft ?? 0) - 6, ...(place?.above ? { bottom: -6 } : { top: -6 }) }}
      />
      <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-[#6b675f]">
        {index + 1} of {COACH_MARKS.length}
      </p>
      <h2 className="m-0 mt-1 text-sm font-semibold">{mark.title}</h2>
      <p className="m-0 mt-1 text-[13px] leading-snug text-[#3d3a35]">{mark.text}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" onClick={finish} className="cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0a84ff] rounded-full px-2.5 py-1 text-xs font-medium text-[#6b675f] hover:bg-black/5">
          Skip tour
        </button>
        <button
          ref={primary}
          type="button"
          onClick={() => (last ? finish() : setIndex(index + 1))}
          className="cursor-pointer rounded-full bg-[#0a84ff] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0071e3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a84ff]"
        >
          {last ? 'Done' : 'Next'}
        </button>
      </div>
    </div>
  );
}
