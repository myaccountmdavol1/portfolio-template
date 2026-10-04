'use client';

import { useEffect, useRef, useState } from 'react';
import { stepBall, type Ball, type Rect } from '@/lib/finale';

export interface Brick extends Rect {
  id: string;
  img: string | null;
  label: string;
}

const PADDLE_W = 120;
const PADDLE_H = 14;
const SPEED = 460;

/** Breakout where the bricks are the visitor's desktop icons. */
export function FinaleBreakout({ bricks, onWin, onSkip }: { bricks: Brick[]; onWin: () => void; onSkip: () => void }) {
  const [alive, setAlive] = useState<boolean[]>(() => bricks.map(() => true));
  const [breaking, setBreaking] = useState<string[]>([]);
  const [lives, setLives] = useState(3);
  const [launched, setLaunched] = useState(false);
  const aliveRef = useRef(alive);
  const ballEl = useRef<HTMLDivElement>(null);
  const paddleEl = useRef<HTMLDivElement>(null);
  const paddleX = useRef(window.innerWidth / 2 - PADDLE_W / 2);
  const ball = useRef<Ball>({ x: window.innerWidth / 2, y: 0, vx: 0, vy: 0, r: 9 });
  const launchedRef = useRef(false);
  const floor = () => window.innerHeight - 70;

  useEffect(() => {
    aliveRef.current = alive;
  }, [alive]);

  // Paddle follows the mouse / finger.
  useEffect(() => {
    const move = (clientX: number) => {
      paddleX.current = Math.max(8, Math.min(window.innerWidth - PADDLE_W - 8, clientX - PADDLE_W / 2));
    };
    const onMouse = (e: MouseEvent) => move(e.clientX);
    const onTouch = (e: TouchEvent) => e.touches[0] && move(e.touches[0].clientX);
    const launch = () => {
      if (launchedRef.current) return;
      launchedRef.current = true;
      setLaunched(true);
      const angle = (Math.random() - 0.5) * 0.8;
      ball.current = { ...ball.current, vx: SPEED * Math.sin(angle), vy: -SPEED * Math.cos(angle) };
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') launch();
      if (e.key === 'ArrowLeft') move(paddleX.current + PADDLE_W / 2 - 40);
      if (e.key === 'ArrowRight') move(paddleX.current + PADDLE_W / 2 + 40);
    };
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('pointerdown', launch);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('pointerdown', launch);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // The game loop (refs + direct style updates, so 60fps doesn't mean 60 React renders).
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.03, (now - last) / 1000);
      last = now;
      const paddle = { x: paddleX.current, y: floor(), w: PADDLE_W, h: PADDLE_H };
      if (!launchedRef.current) {
        ball.current = { ...ball.current, x: paddle.x + PADDLE_W / 2, y: paddle.y - ball.current.r - 1 };
      } else {
        const rects = bricks.map((b, i) => (aliveRef.current[i] ? b : null));
        const step = stepBall(ball.current, dt, { w: window.innerWidth, h: window.innerHeight }, paddle, rects);
        ball.current = step.ball;
        if (step.hit !== null) {
          const i = step.hit;
          const next = aliveRef.current.map((v, j) => (j === i ? false : v));
          aliveRef.current = next;
          setAlive(next);
          setBreaking((b) => [...b, bricks[i].id]);
          // A little faster with every brick.
          ball.current = { ...ball.current, vx: ball.current.vx * 1.015, vy: ball.current.vy * 1.015 };
          if (next.every((v) => !v)) {
            window.setTimeout(onWin, 700);
          }
        }
        if (step.lost) {
          launchedRef.current = false;
          setLaunched(false);
          setLives((l) => l - 1);
        }
      }
      if (ballEl.current) ballEl.current.style.transform = `translate(${ball.current.x - ball.current.r}px, ${ball.current.y - ball.current.r}px)`;
      if (paddleEl.current) paddleEl.current.style.transform = `translate(${paddle.x}px, ${paddle.y}px)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [bricks, onWin]);

  const left = alive.filter(Boolean).length;
  return (
    <div data-testid="finale-breakout" className="fixed inset-0 z-[9950] cursor-none select-none">
      {bricks.map((b, i) =>
        alive[i] || breaking.includes(b.id) ? (
          <div
            key={b.id}
            data-testid={alive[i] ? 'finale-brick' : undefined}
            className={`absolute ${alive[i] ? '' : 'brick-shatter'}`}
            style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
          >
            {b.img ? (
              // eslint-disable-next-line @next/next/no-img-element -- a snapshot of a desktop icon
              <img src={b.img} alt="" className="h-full w-full object-contain drop-shadow-lg" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-white/80 text-xs font-bold text-black">{b.label.slice(0, 2)}</div>
            )}
          </div>
        ) : null,
      )}
      <div ref={ballEl} className="absolute left-0 top-0 h-[18px] w-[18px] rounded-full bg-white shadow-[0_0_14px_4px_rgba(255,214,10,.8)]" />
      <div ref={paddleEl} className="absolute left-0 top-0 rounded-full bg-gradient-to-r from-[#ffd60a] to-[#ff9f0a] shadow-lg" style={{ width: PADDLE_W, height: PADDLE_H }} />
      <div className="fixed inset-x-0 top-10 flex items-center justify-center gap-4 text-sm font-semibold text-white drop-shadow">
        <span>
          Break every icon! · {left} left · {'❤️'.repeat(Math.max(0, lives))}
        </span>
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={onSkip} className="cursor-pointer rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur hover:bg-white/30">
          Skip ›
        </button>
      </div>
      {!launched && lives > 0 && <p className="fixed inset-x-0 bottom-28 m-0 text-center text-sm font-semibold text-white drop-shadow">Click (or press Space) to launch</p>}
      {lives <= 0 && (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 text-white" onPointerDown={(e) => e.stopPropagation()}>
          <p className="m-0 text-2xl font-bold">So close!</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setLives(3)} className="cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
              Try again
            </button>
            <button type="button" onClick={onSkip} className="cursor-pointer rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
              Skip to the end
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
