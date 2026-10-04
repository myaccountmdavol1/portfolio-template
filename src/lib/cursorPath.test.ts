import { describe, expect, it } from 'vitest';
import { CORRECTION_MS, moveDuration, planMove, pointAt, totalDuration, type Point } from './cursorPath';

/** A fake rand that returns these values in turn. */
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};
const close = (p: Point, q: Point) => {
  expect(p.x).toBeCloseTo(q.x);
  expect(p.y).toBeCloseTo(q.y);
};
const from = { x: 0, y: 0 };
const to = { x: 200, y: 0 };

describe('planMove and pointAt', () => {
  it('starts at from and ends exactly on to', () => {
    const plan = planMove(from, to, seq(0.5, 0.5, 0.5, 0.2));
    close(pointAt(plan, 0), from);
    close(pointAt(plan, totalDuration(plan)), to);
    close(pointAt(plan, totalDuration(plan) + 500), to);
  });

  it('sweeps to a point 6 px short, then corrects onto the target in 140 ms', () => {
    const plan = planMove(from, to, seq(0.5, 0.5, 0.5, 0.2));
    close(plan.aim, { x: 194, y: 0 });
    close(pointAt(plan, plan.duration), plan.aim);
    expect(totalDuration(plan) - plan.duration).toBe(CORRECTION_MS);
  });

  it('jitters the aim by at most 3 px each way', () => {
    const plan = planMove(from, to, seq(0, 0.999, 0.5, 0.2));
    expect(plan.aim.x).toBeCloseTo(191);
    expect(plan.aim.y).toBeCloseTo(2.994);
  });

  it('bends 8–33% of the distance, to the side rand picks', () => {
    expect(planMove(from, to, seq(0.5, 0.5, 0, 0.2)).c1.y).toBeCloseTo(-16);
    expect(planMove(from, to, seq(0.5, 0.5, 0.999, 0.7)).c1.y).toBeCloseTo(65.95);
    const plan = planMove(from, to, seq(0.5, 0.5, 0.5, 0.7));
    expect(pointAt(plan, plan.duration / 3).y).toBeGreaterThan(0); // off the straight line, on the bend's side
  });

  it('does not move for a zero-length trip', () => {
    const plan = planMove(to, to, seq(0.5));
    expect(totalDuration(plan)).toBe(0);
    expect(pointAt(plan, 0)).toEqual(to);
  });
});

describe('moveDuration', () => {
  it('takes longer for longer trips, but not proportionally', () => {
    expect(moveDuration(0)).toBe(260);
    expect(moveDuration(20)).toBe(380);
    expect(moveDuration(60)).toBe(500);
    expect(moveDuration(800) - moveDuration(400)).toBeLessThan(moveDuration(400) - moveDuration(0));
    expect(planMove(from, { x: 600, y: 0 }, seq(0.5)).duration).toBeGreaterThan(planMove(from, to, seq(0.5)).duration);
    expect(totalDuration(planMove(from, to, seq(0.5)))).toBe(moveDuration(200) + 140);
  });
});
