// How the tour's pointer travels: a curved sweep that slows into a small correction, like a real hand. Pure (no DOM).

export interface Point {
  x: number;
  y: number;
}

export interface MovePlan {
  from: Point;
  to: Point;
  /** Bézier control points of the main sweep. */
  c1: Point;
  c2: Point;
  /** Where the sweep lands: a few px short of `to`. */
  aim: Point;
  /** Length of the sweep in ms (the correction adds CORRECTION_MS). */
  duration: number;
}

export const CORRECTION_MS = 140;
export const AIM_SHORT_PX = 6;
const JITTER_PX = 6; // ±3 px
const BEND_MIN = 0.08;
const BEND_RANGE = 0.25; // 8–33% of the distance

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Fitts-style: longer trips take longer, but not proportionally. */
export function moveDuration(dist: number): number {
  return 260 + 120 * Math.log2(dist / 20 + 1);
}

const bezier = (p0: number, p1: number, p2: number, p3: number, t: number) => {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
};

/** `rand` returns [0, 1) and is called four times: aim jitter x, aim jitter y, bend size, bend side. */
export function planMove(from: Point, to: Point, rand: () => number = Math.random): MovePlan {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  if (dist < 1) return { from, to, c1: from, c2: from, aim: to, duration: 0 };
  const ux = (to.x - from.x) / dist;
  const uy = (to.y - from.y) / dist;
  const short = Math.min(AIM_SHORT_PX, dist / 2);
  const aim = { x: to.x - ux * short + (rand() - 0.5) * JITTER_PX, y: to.y - uy * short + (rand() - 0.5) * JITTER_PX };
  const bend = (rand() * BEND_RANGE + BEND_MIN) * dist * (rand() < 0.5 ? -1 : 1);
  const nx = -uy;
  const ny = ux;
  const c1 = { x: from.x + (aim.x - from.x) * 0.3 + nx * bend, y: from.y + (aim.y - from.y) * 0.3 + ny * bend };
  const c2 = { x: from.x + (aim.x - from.x) * 0.75 + nx * bend * 0.4, y: from.y + (aim.y - from.y) * 0.75 + ny * bend * 0.4 };
  return { from, to, c1, c2, aim, duration: moveDuration(dist) };
}

/** The whole move in ms: the sweep plus the correction. */
export function totalDuration(plan: MovePlan): number {
  return plan.duration === 0 ? 0 : plan.duration + CORRECTION_MS;
}

/** Where the pointer is `ms` into the move: the eased sweep to `aim`, then an eased 140 ms correction to `to`. */
export function pointAt(plan: MovePlan, ms: number): Point {
  if (plan.duration === 0) return plan.to;
  if (ms < plan.duration) {
    const e = easeOutCubic(Math.max(0, ms) / plan.duration);
    return { x: bezier(plan.from.x, plan.c1.x, plan.c2.x, plan.aim.x, e), y: bezier(plan.from.y, plan.c1.y, plan.c2.y, plan.aim.y, e) };
  }
  const e = easeOutCubic(Math.min(1, (ms - plan.duration) / CORRECTION_MS));
  return { x: plan.aim.x + (plan.to.x - plan.aim.x) * e, y: plan.aim.y + (plan.to.y - plan.aim.y) * e };
}
