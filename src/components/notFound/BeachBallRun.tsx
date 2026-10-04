'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GROUND_Y, jump, newRun, PLAYER, RUN_H, RUN_W, step, type Obstacle, type RunState } from '@/lib/notFound';

const HI_KEY = 'portfolio:beachBallHi';
const RAINBOW = ['#ff453a', '#ff9f0a', '#ffd60a', '#30d158', '#0a84ff', '#bf5af2'];

function readHi(): number {
  try {
    return Number(window.localStorage.getItem(HI_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** The Finder face: blue on the left, light on the right, two eyes and a smile. */
function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, over: boolean) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, s, s, 8);
  ctx.clip();
  ctx.fillStyle = '#1e7cf2';
  ctx.fillRect(x, y, s / 2 + 2, s);
  ctx.fillStyle = '#dff0ff';
  ctx.fillRect(x + s / 2 + 2, y, s / 2, s);
  ctx.restore();
  ctx.fillStyle = '#10243d';
  if (over) {
    // x_x
    ctx.font = `bold ${Math.round(s * 0.32)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('×', x + s * 0.3, y + s * 0.5);
    ctx.fillText('×', x + s * 0.72, y + s * 0.5);
  } else {
    ctx.fillRect(x + s * 0.27, y + s * 0.26, 3, s * 0.2);
    ctx.fillRect(x + s * 0.68, y + s * 0.26, 3, s * 0.2);
  }
  ctx.strokeStyle = '#10243d';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (over) ctx.arc(x + s / 2, y + s * 0.86, s * 0.18, Math.PI * 1.15, Math.PI * 1.85);
  else ctx.arc(x + s / 2, y + s * 0.5, s * 0.26, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, spin: number) {
  if (o.kind === 'ball') {
    // The spinning beach ball of death.
    const r = o.w / 2;
    const cx = o.x + r;
    const cy = o.y + r;
    RAINBOW.forEach((c, i) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.fillStyle = c;
      ctx.arc(cx, cy, r, spin + (i * Math.PI) / 3, spin + ((i + 1) * Math.PI) / 3);
      ctx.fill();
    });
    return;
  }
  if (o.kind === 'dialog') {
    ctx.fillStyle = '#ececec';
    ctx.beginPath();
    ctx.roundRect(o.x, o.y, o.w, o.h, 5);
    ctx.fill();
    ctx.fillStyle = '#c9c9c9';
    ctx.fillRect(o.x, o.y + 9, o.w, 1);
    ctx.fillStyle = '#ff5f57';
    ctx.beginPath();
    ctx.arc(o.x + 6, o.y + 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d70015';
    ctx.font = 'bold 18px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('!', o.x + o.w / 2, o.y + o.h - 8);
    return;
  }
  ctx.font = `${o.h}px system-ui`;
  ctx.textAlign = 'left';
  ctx.fillText('⚠️', o.x, o.y + o.h - 3);
}

/** “Beach Ball Run”: the 404 page's take on the offline dinosaur game. Space, ↑, or tap to jump. */
export function BeachBallRun({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef<RunState>(newRun());
  const hi = useRef(0);
  const [status, setStatus] = useState<RunState['status']>('ready');
  const [lastScore, setLastScore] = useState(0);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const s = state.current;
    ctx.clearRect(0, 0, RUN_W, RUN_H);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillRect(0, GROUND_Y, RUN_W, 1.5);
    // Pebbles on the ground scroll by, so it feels like running.
    for (let i = 0; i < 24; i++) {
      const x = (((i * 97 - s.distance) % RUN_W) + RUN_W) % RUN_W;
      ctx.fillRect(x, GROUND_Y + 6 + ((i * 7) % 12), 3 + (i % 3) * 2, 1.5);
    }
    s.obstacles.forEach((o) => drawObstacle(ctx, o, -s.distance / 18));
    drawPlayer(ctx, PLAYER.x, s.y, PLAYER.size, s.status === 'over');
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = '600 15px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`HI ${String(hi.current).padStart(5, '0')}   ${String(s.score).padStart(5, '0')}`, RUN_W - 14, 26);
    if (s.status !== 'running') {
      ctx.textAlign = 'center';
      ctx.font = '600 17px system-ui';
      ctx.fillText(s.status === 'ready' ? 'Press Space or tap to jump over the beach balls' : 'Kernel panic! Press Space or tap to try again', RUN_W / 2, 88);
    }
  }, []);

  const press = useCallback(() => {
    const wasRunning = state.current.status === 'running';
    state.current = jump(state.current);
    if (!wasRunning) setStatus('running');
  }, []);

  useEffect(() => {
    hi.current = readHi();
    draw();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        press();
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draw, press, onClose]);

  useEffect(() => {
    if (status !== 'running') return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      state.current = step(state.current, (now - last) / 1000);
      last = now;
      if (state.current.status === 'over') {
        const score = state.current.score;
        if (score > hi.current) {
          hi.current = score;
          try {
            window.localStorage.setItem(HI_KEY, String(score));
          } catch {
            // ignore
          }
        }
        setLastScore(score);
        setStatus('over');
        draw();
        return;
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status, draw]);

  return (
    <div className="flex w-full max-w-[720px] flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={RUN_W}
        height={RUN_H}
        data-testid="beach-ball-run"
        aria-label="Beach Ball Run: press Space or tap to jump"
        role="img"
        onPointerDown={(e) => {
          e.preventDefault();
          press();
        }}
        className="w-full cursor-pointer touch-none rounded-2xl bg-white/[.06] ring-1 ring-white/10"
      />
      <p aria-live="polite" className="m-0 text-xs text-white/55">
        {status === 'over' ? `Game over — you scored ${lastScore}.` : 'Space / ↑ / tap to jump · Esc to stop'}
      </p>
    </div>
  );
}
