'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AchievementToast } from '@/components/AchievementToast';
import { IconPackContext } from '@/components/IconPackContext';
import { AppIcon } from '@/components/AppIcon';
import { setSecretAchievements, trackEvent } from '@/lib/gameEvents';
import { fillSlots, seeded, textCells } from '@/lib/notFound';
import type { IconSpec } from '@/lib/types';
import { sizedImageUrl } from '@/lib/wallpaper';
import { BeachBallRun } from './BeachBallRun';

export interface NotFoundIcon {
  icon: IconSpec;
  title: string;
}

interface NotFoundViewProps {
  icons: NotFoundIcon[];
  message?: string;
  imageUrl?: string;
  game: boolean;
  /** The site has a Game Center with the secret “Lost & found” achievement switched on. */
  lostAndFound: boolean;
  /** The site's icon pack (Site settings → Style). */
  iconPack?: string;
}

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const GAP = 6;
const FLY_MS = 900;
const STAGGER_MS = 22;
const REPEL_R = 130;

/** The site's own app icons fly in from everywhere and settle into “404”. */
export function NotFoundView({ icons, message, imageUrl, game, lostAndFound, iconPack }: NotFoundViewProps) {
  const layout = useMemo(() => textCells('404'), []);
  const slots = useMemo(() => fillSlots(icons, layout.cells.length), [icons, layout.cells.length]);
  // Seeded, so the server and the first browser render agree (no hydration mismatch).
  const starts = useMemo(() => {
    const rand = seeded(404);
    return layout.cells.map(() => {
      const angle = rand() * Math.PI * 2;
      const dist = 700 + rand() * 500;
      // Rounded: the server and browser can disagree in the last decimal places of Math.cos.
      return { x: Math.round(Math.cos(angle) * dist), y: Math.round(Math.sin(angle) * dist), rot: Math.round((rand() - 0.5) * 540), fall: rand() };
    });
  }, [layout.cells]);

  const [cell, setCell] = useState(56);
  const [phase, setPhase] = useState<'scattered' | 'flying' | 'settled'>('scattered');
  const [floor, setFloor] = useState<number | null>(null);
  const [popped, setPopped] = useState<Record<number, number>>({});
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const artRef = useRef<HTMLDivElement>(null);
  const konami = useRef<string[]>([]);

  // Size the icons to the screen, then let them fly in.
  useEffect(() => {
    const fit = () => {
      const byWidth = (window.innerWidth - 32) / layout.cols;
      const byHeight = (window.innerHeight * 0.48) / layout.rows;
      setCell(Math.floor(Math.max(14, Math.min(76, byWidth, byHeight))));
    };
    fit();
    window.addEventListener('resize', fit);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = requestAnimationFrame(() => setPhase(reduce ? 'settled' : 'flying'));
    const settle = window.setTimeout(() => setPhase('settled'), reduce ? 0 : FLY_MS + STAGGER_MS * layout.cells.length + 100);
    return () => {
      window.removeEventListener('resize', fit);
      cancelAnimationFrame(start);
      window.clearTimeout(settle);
    };
  }, [layout]);

  // Secret achievement for finding this page (a banner the first time; it shows in Game Center afterwards).
  useEffect(() => {
    if (!lostAndFound) return;
    setSecretAchievements(['lost']);
    const id = window.setTimeout(() => trackEvent({ type: 'lost' }), 1200);
    return () => window.clearTimeout(id);
  }, [lostAndFound]);

  // Easter egg: the Konami code drops every icon to the floor; they climb back a moment later.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      konami.current = [...konami.current, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-KONAMI.length);
      if (konami.current.join() === KONAMI.join()) {
        konami.current = [];
        // Distance from the top of the “404” to the bottom of the screen.
        setFloor(window.innerHeight - (artRef.current?.getBoundingClientRect().top ?? 0));
        window.setTimeout(() => setFloor(null), 2600);
      }
      if (!playing && game && e.key === ' ' && document.activeElement === document.body) {
        e.preventDefault();
        setPlaying(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing, game]);

  const stopPlaying = useCallback(() => setPlaying(false), []);
  const width = layout.cols * cell;
  const height = layout.rows * cell;

  return (
    <IconPackContext.Provider value={iconPack}>
    <main className="fixed inset-0 flex flex-col items-center justify-center gap-7 overflow-hidden bg-[#111] px-4 py-8 text-white">
      {imageUrl && (
        <>
          <div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(sizedImageUrl(imageUrl, 2048))})` }} />
          <div aria-hidden className="absolute inset-0 bg-black/55" />
        </>
      )}

      <h1 className="sr-only">404 — page not found</h1>
      <div
        ref={artRef}
        data-testid="not-found-art"
        data-fallen={floor !== null}
        className="relative flex-none"
        style={{ width, height }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setPointer({ x: e.clientX - r.left, y: e.clientY - r.top });
        }}
        onPointerLeave={() => setPointer(null)}
      >
        {slots.map((slot, i) => {
          const { col, row } = layout.cells[i];
          const s = starts[i];
          let x = 0;
          let y = 0;
          let rot = 0;
          if (phase === 'scattered') {
            x = s.x;
            y = s.y;
            rot = s.rot;
          } else if (floor !== null) {
            // Down to the bottom of the screen, tumbling.
            y = floor - row * cell - cell;
            x = (s.fall - 0.5) * 160;
            rot = (s.fall - 0.5) * 220;
          } else if (pointer && phase === 'settled') {
            // Icons lean away from the pointer.
            const dx = col * cell + cell / 2 - pointer.x;
            const dy = row * cell + cell / 2 - pointer.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d < REPEL_R) {
              const push = (1 - d / REPEL_R) * 18;
              x = (dx / d) * push;
              y = (dy / d) * push;
            }
          }
          const transition =
            phase === 'flying'
              ? `transform ${FLY_MS}ms cubic-bezier(.2,.9,.25,1.15) ${i * STAGGER_MS}ms, opacity 300ms ${i * STAGGER_MS}ms`
              : floor !== null
                ? `transform 700ms cubic-bezier(.55,0,1,.45) ${Math.round(s.fall * 250)}ms`
                : 'transform 450ms cubic-bezier(.2,.9,.25,1.2)';
          return (
            <button
              key={i}
              type="button"
              title={slot.title}
              aria-label={slot.title}
              tabIndex={-1}
              onClick={() => setPopped((p) => ({ ...p, [i]: (p[i] ?? 0) + 1 }))}
              className="absolute cursor-pointer"
              style={{
                left: col * cell + GAP / 2,
                top: row * cell + GAP / 2,
                transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`,
                opacity: phase === 'scattered' ? 0 : 1,
                transition,
              }}
            >
              {/* Easter egg: click an icon and it does a flip. The key restarts the animation on every click. */}
              <span key={popped[i] ?? 0} className={`block ${popped[i] ? 'nf-pop' : ''}`}>
                <AppIcon icon={slot.icon} size={cell - GAP} variant="tile" />
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative flex w-full flex-col items-center gap-5 text-center">
        <p className="m-0 max-w-[36ch] text-lg text-white/80 sm:text-xl">{message || 'Oops! The page you’re looking for doesn’t exist.'}</p>
        {playing ? (
          <BeachBallRun onClose={stopPlaying} />
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/" className="rounded-full bg-[#0a84ff] px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-[#0071e3]">
              Go Back Home
            </Link>
            {game && (
              <button type="button" onClick={() => setPlaying(true)} className="cursor-pointer rounded-full bg-white/10 px-5 py-3 text-base font-semibold text-white ring-1 ring-white/20 hover:bg-white/20">
                Play Beach Ball Run
              </button>
            )}
          </div>
        )}
      </div>
      {lostAndFound && <AchievementToast />}
      {/* The faintest of hints. */}
      <p aria-hidden className="absolute bottom-3 m-0 select-none text-[11px] tracking-[.3em] text-white/20">↑↑↓↓←→←→BA</p>
    </main>
    </IconPackContext.Provider>
  );
}
