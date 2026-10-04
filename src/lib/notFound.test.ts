import { describe, expect, it } from 'vitest';
import { fillSlots, GROUND_Y, hits, jump, newRun, PLAYER, RUN_W, seeded, step, textCells, type RunState } from './notFound';

describe('404 pixel text', () => {
  it('lays out 4-0-4 on a 17×7 grid', () => {
    const { cells, cols, rows } = textCells('404');
    expect(cols).toBe(17);
    expect(rows).toBe(7);
    expect(cells).toHaveLength(14 + 16 + 14);
    expect(cells.every((c) => c.col >= 0 && c.col < cols && c.row >= 0 && c.row < rows)).toBe(true);
  });

  it('seeded randomness repeats; slots repeat the icons', () => {
    const a = seeded(7);
    const b = seeded(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(fillSlots(['x', 'y'], 5)).toEqual(['x', 'y', 'x', 'y', 'x']);
    expect(fillSlots([], 5)).toEqual([]);
  });
});

describe('Beach Ball Run', () => {
  const ball = (x: number) => ({ kind: 'ball' as const, x, y: GROUND_Y - 28, w: 28, h: 28 });

  it('jump starts the game, and the player lands again', () => {
    let s = jump(newRun());
    expect(s.status).toBe('running');
    s = { ...s, nextIn: 1e9 };
    for (let i = 0; i < 10; i++) s = step(s, 0.016);
    expect(s.y).toBeLessThan(GROUND_Y - PLAYER.size - 50); // in the air
    for (let i = 0; i < 100; i++) s = step(s, 0.016);
    expect(s.y).toBe(GROUND_Y - PLAYER.size);
    expect(s.score).toBeGreaterThan(0);
  });

  it('running into a beach ball ends the game; jumping clears it', () => {
    const base: RunState = { ...newRun(), status: 'running', nextIn: 1e9 };
    let stay: RunState = { ...base, obstacles: [ball(PLAYER.x + 60)] };
    for (let i = 0; i < 60 && stay.status === 'running'; i++) stay = step(stay, 0.016);
    expect(stay.status).toBe('over');

    let hop: RunState = { ...base, obstacles: [ball(PLAYER.x + 110)] };
    for (let i = 0; i < 120; i++) {
      if (i === 8) hop = jump(hop);
      hop = step(hop, 0.016);
    }
    expect(hop.status).toBe('running');
  });

  it('flying warnings pass over a player who stays down', () => {
    const warning = { kind: 'warning' as const, x: PLAYER.x, y: GROUND_Y - PLAYER.size - 58, w: 30, h: 26 };
    expect(hits({ ...newRun(), status: 'running' }, warning)).toBe(false);
  });

  it('spawns obstacles off the right edge and speeds up', () => {
    let s: RunState = { ...newRun(), status: 'running', nextIn: 0 };
    s = step(s, 0.016, () => 0.1);
    expect(s.obstacles[0].x).toBeGreaterThan(RUN_W - 20);
    expect(s.speed).toBeGreaterThan(newRun().speed);
  });
});
