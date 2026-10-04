'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { brickLayout, creditsLines, stepGravity, type Body } from '@/lib/finale';
import { markFinaleDone, visitorName } from '@/lib/gameEvents';
import type { GameCenterContent, SiteData } from '@/lib/types';
import { Confetti } from './Confetti';
import { Credits } from './Credits';
import { FinaleBreakout, type Brick } from './FinaleBreakout';
import { Reward } from './Reward';

type Phase = 'glitch' | 'gravity' | 'rise' | 'breakout' | 'trophy' | 'credits' | 'reward';

interface Piece extends Body {
  id: string;
  img: string | null;
  label: string;
}

/** Snapshots every desktop and dock icon so they can fall, then become Breakout bricks. */
function snapshotIcons(): Piece[] {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="desktop-area"] button[data-app-id], nav[aria-label="Dock"] .dock-item'));
  return els
    .map((el, i) => {
      const img = el.querySelector('img');
      const r = (img ?? el).getBoundingClientRect();
      return {
        id: `${i}`,
        img: img?.src ?? null,
        label: el.getAttribute('aria-label') ?? '',
        x: r.left,
        y: r.top,
        w: Math.min(r.width, 72),
        h: Math.min(r.height, 72),
        vx: (Math.random() - 0.5) * 500,
        vy: -Math.random() * 400,
        rot: 0,
        vr: (Math.random() - 0.5) * 540,
      };
    })
    .filter((p) => p.w > 8);
}

interface FinaleProps {
  data: SiteData;
  variant: 'desktop' | 'phone';
  /** `reward` = just the prize (the Top Secret folder / Game Center button). */
  mode: 'full' | 'reward';
  onClose: () => void;
}

/** The Game Center finale: glitch → gravity → Breakout → Platinum → credits → reward. */
export function Finale({ data, variant, mode, onClose }: FinaleProps) {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const playable = variant === 'desktop' && !reduced;
  const [phase, setPhase] = useState<Phase>(mode === 'reward' ? 'reward' : reduced ? 'trophy' : 'glitch');
  const [pieces, setPieces] = useState<Piece[]>([]);
  const gameCenter = data.apps.find((a) => a.type === 'gamecenter');
  const settings: NonNullable<GameCenterContent['finale']> = gameCenter?.content.finale ?? {};
  const hallOfFame = gameCenter?.type === 'gamecenter' && gameCenter.content.hallOfFame !== false;

  // While the show runs, get the editor's toolbar out of the way (visitors never have one).
  useEffect(() => {
    document.documentElement.classList.add('finale-running');
    return () => document.documentElement.classList.remove('finale-running');
  }, []);

  // Hide the real icons while their stand-ins fall and break.
  useEffect(() => {
    if (!['gravity', 'rise', 'breakout'].includes(phase)) return;
    document.documentElement.classList.add('finale-active');
    return () => document.documentElement.classList.remove('finale-active');
  }, [phase]);

  // Act 1: a glitch, then gravity (desktop) or straight to the trophy (phone).
  useEffect(() => {
    if (phase !== 'glitch') return;
    const id = window.setTimeout(() => {
      if (!playable) return setPhase('trophy');
      setPieces(snapshotIcons());
      setPhase('gravity');
    }, 1100);
    return () => window.clearTimeout(id);
  }, [phase, playable]);

  // Act 2: everything falls for a couple of seconds.
  useEffect(() => {
    if (phase !== 'gravity') return;
    let frame = 0;
    let last = performance.now();
    const start = last;
    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      setPieces((ps) => stepGravity(ps, dt, window.innerHeight - 4, window.innerWidth) as Piece[]);
      if (now - start < 2600) frame = requestAnimationFrame(tick);
      else setPhase('rise');
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  // Act 3: the pile lifts into rows of bricks (the icons stop moving once gravity ends, so this is stable).
  const settled = phase === 'rise' || phase === 'breakout';
  const bricks = useMemo<Brick[]>(() => {
    if (!settled) return [];
    const layout = brickLayout(pieces.length, window.innerWidth);
    return pieces.map((p, i) => ({ id: p.id, img: p.img, label: p.label, ...layout[i] }));
  }, [settled, pieces]);
  useEffect(() => {
    if (phase !== 'rise') return;
    const id = window.setTimeout(() => setPhase('breakout'), 1000);
    return () => window.clearTimeout(id);
  }, [phase]);

  const toTrophy = useCallback(() => setPhase('trophy'), []);

  // Act 5: the trophy, then the credits.
  useEffect(() => {
    if (phase !== 'trophy') return;
    markFinaleDone();
    const id = window.setTimeout(() => setPhase('credits'), 4200);
    return () => window.clearTimeout(id);
  }, [phase]);

  const owner = data.site.ownerName;
  const cast = data.apps.filter((a) => a.visible && a.type !== 'gamecenter').map((a) => a.title);

  // Drawn at the top of the page (a portal), above every window, toolbar, and preview frame.
  return createPortal(
    <div data-testid="finale" data-phase={phase}>
      {phase === 'glitch' && <div aria-hidden className="finale-glitch fixed inset-0 z-[9950]" />}

      {(phase === 'gravity' || phase === 'rise') && (
        <div aria-hidden className="fixed inset-0 z-[9950]">
          {pieces.map((p, i) => {
            const target = phase === 'rise' ? bricks[i] : null;
            return (
              <div
                key={p.id}
                className="absolute left-0 top-0"
                style={{
                  width: target?.w ?? p.w,
                  height: target?.h ?? p.h,
                  transform: target ? `translate(${target.x}px, ${target.y}px) rotate(0deg)` : `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`,
                  transition: target ? 'transform 0.9s cubic-bezier(.2,1.2,.4,1), width .9s, height .9s' : undefined,
                }}
              >
                {p.img ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a snapshot of a desktop icon
                  <img src={p.img} alt="" className="h-full w-full object-contain drop-shadow-lg" />
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {phase === 'breakout' && <FinaleBreakout bricks={bricks} onWin={toTrophy} onSkip={toTrophy} />}

      {phase === 'trophy' && (
        <>
          <div className="fixed inset-0 z-[9955] flex flex-col items-center justify-center gap-3 bg-black/55 text-white backdrop-blur-sm" role="status" aria-label="Platinum trophy">
            <div className="trophy-pop flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-[#fff3b0] via-[#ffd60a] to-[#b8860b] text-7xl shadow-[0_0_80px_20px_rgba(255,214,10,.45)]">🏆</div>
            <div className="text-xs font-semibold uppercase tracking-[.35em] text-[#ffd60a]">Platinum</div>
            <div className="font-serif text-4xl">You found everything.</div>
            <button type="button" onClick={() => setPhase('credits')} className="mt-2 cursor-pointer rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold hover:bg-white/25">
              Continue ›
            </button>
          </div>
          <Confetti />
        </>
      )}

      {phase === 'credits' && (
        <Credits lines={creditsLines(owner, cast, visitorName())} songUrl={settings.songUrl} music={settings.music !== false} onDone={() => setPhase('reward')} />
      )}

      {phase === 'reward' && <Reward owner={owner} settings={settings} hallOfFame={hallOfFame} onClose={onClose} />}
    </div>,
    document.body,
  );
}
