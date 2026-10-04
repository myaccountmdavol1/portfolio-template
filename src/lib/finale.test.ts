import { describe, expect, it } from 'vitest';
import { brickLayout, creditsLines, formatDuration, stepBall, stepGravity, type Body } from './finale';

describe('stepGravity', () => {
  const body: Body = { x: 100, y: 0, w: 50, h: 50, vx: 0, vy: 0, rot: 0, vr: 0 };
  it('falls and comes to rest on the floor', () => {
    let bodies = [body];
    for (let i = 0; i < 400; i++) bodies = stepGravity(bodies, 1 / 60, 600, 1000);
    expect(bodies[0].y).toBeCloseTo(550);
    expect(bodies[0].vy).toBe(0);
  });
  it('stays inside the walls', () => {
    const [b] = stepGravity([{ ...body, x: 990, vx: 900 }], 1 / 30, 600, 1000);
    expect(b.x + b.w).toBeLessThanOrEqual(1000);
    expect(b.vx).toBeLessThan(0);
  });
});

describe('brickLayout', () => {
  it('centres rows that fit the width', () => {
    const bricks = brickLayout(10, 400);
    const firstRow = bricks.filter((b) => b.y === bricks[0].y);
    expect(firstRow.length).toBe(5);
    expect(Math.round(firstRow[0].x)).toBe(Math.round(400 - (firstRow.at(-1)!.x + 56)));
    expect(bricks).toHaveLength(10);
  });
});

describe('stepBall', () => {
  const bounds = { w: 400, h: 600 };
  const paddle = { x: 150, y: 560, w: 100, h: 12 };
  it('bounces off walls and the paddle', () => {
    expect(stepBall({ x: 5, y: 300, vx: -200, vy: 0, r: 8 }, 0.05, bounds, paddle, []).ball.vx).toBeGreaterThan(0);
    const off = stepBall({ x: 200, y: 548, vx: 0, vy: 300, r: 8 }, 0.02, bounds, paddle, []);
    expect(off.ball.vy).toBeLessThan(0);
  });
  it('angles the bounce by where it hits the paddle', () => {
    const right = stepBall({ x: 245, y: 548, vx: 0, vy: 300, r: 8 }, 0.02, bounds, paddle, []);
    expect(right.ball.vx).toBeGreaterThan(0);
  });
  it('hits one brick and reports it; skips broken bricks', () => {
    const bricks = [null, { x: 180, y: 100, w: 40, h: 40 }];
    const r = stepBall({ x: 200, y: 150, vx: 0, vy: -300, r: 8 }, 0.02, bounds, paddle, bricks);
    expect(r.hit).toBe(1);
    expect(r.ball.vy).toBeGreaterThan(0);
  });
  it('is lost when it falls past the bottom', () => {
    expect(stepBall({ x: 20, y: 605, vx: 0, vy: 300, r: 8 }, 0.02, bounds, paddle, []).lost).toBe(true);
  });
});

describe('credits and duration', () => {
  it('thanks the visitor by name when known', () => {
    expect(creditsLines('Alex Rivera', ['Photos'], 'Sam')).toContain('Sam, for exploring every corner');
    expect(creditsLines('Alex Rivera', [], null)).toContain('You, for exploring every corner');
  });
  it('formats durations', () => {
    expect(formatDuration(45_000)).toBe('45s');
    expect(formatDuration(272_000)).toBe('4m 32s');
    expect(formatDuration(3_900_000)).toBe('1h 5m');
  });
});
