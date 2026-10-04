// The 404 page: a pixel font that app icons fly into, and "Beach Ball Run", a tiny runner game
// (the Finder face hops over spinning beach balls and error dialogs). Pure, so it's easy to test.

/** 5×7 pixel glyphs; '#' is where an icon sits. */
const GLYPHS: Record<string, string[]> = {
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '0': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
};

export const GLYPH_W = 5;
export const GLYPH_H = 7;
const GAP = 1;

export interface Cell {
  col: number;
  row: number;
}

/** Grid cells for `text`, left to right, with a one-column gap between characters. */
export function textCells(text: string): { cells: Cell[]; cols: number; rows: number } {
  const cells: Cell[] = [];
  const chars = [...text].filter((c) => GLYPHS[c]);
  chars.forEach((c, i) => {
    GLYPHS[c].forEach((line, row) => {
      [...line].forEach((ch, col) => {
        if (ch === '#') cells.push({ col: i * (GLYPH_W + GAP) + col, row });
      });
    });
  });
  return { cells, cols: Math.max(0, chars.length * (GLYPH_W + GAP) - GAP), rows: GLYPH_H };
}

/** A small seeded PRNG, so the server and browser scatter the icons the same way. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Repeats `items` to fill `count` slots (the site may have fewer apps than the 404 needs). */
export function fillSlots<T>(items: T[], count: number): T[] {
  if (items.length === 0) return [];
  return Array.from({ length: count }, (_, i) => items[i % items.length]);
}

// ---------------- Beach Ball Run ----------------

export const RUN_W = 720;
export const RUN_H = 200;
export const GROUND_Y = 170;
export const PLAYER = { x: 60, size: 34 };
const GRAVITY = 2400; // px/s²
const JUMP_V = -760; // px/s
const START_SPEED = 330; // px/s
const MAX_SPEED = 820;

export type ObstacleKind = 'ball' | 'dialog' | 'warning';

export interface Obstacle {
  kind: ObstacleKind;
  x: number;
  /** Top of the obstacle. */
  y: number;
  w: number;
  h: number;
}

export interface RunState {
  status: 'ready' | 'running' | 'over';
  /** Top of the player. */
  y: number;
  vy: number;
  speed: number;
  distance: number;
  obstacles: Obstacle[];
  /** Distance left before the next obstacle appears. */
  nextIn: number;
  score: number;
}

export function newRun(): RunState {
  return { status: 'ready', y: GROUND_Y - PLAYER.size, vy: 0, speed: START_SPEED, distance: 0, obstacles: [], nextIn: 260, score: 0 };
}

const onGround = (s: RunState) => s.y >= GROUND_Y - PLAYER.size - 0.5;

/** Jump if on the ground (also starts or restarts the game). */
export function jump(s: RunState): RunState {
  if (s.status !== 'running') return { ...newRun(), status: 'running', vy: JUMP_V };
  return onGround(s) ? { ...s, vy: JUMP_V } : s;
}

function makeObstacle(kind: ObstacleKind): Obstacle {
  if (kind === 'ball') return { kind, x: RUN_W + 10, y: GROUND_Y - 28, w: 28, h: 28 };
  if (kind === 'dialog') return { kind, x: RUN_W + 10, y: GROUND_Y - 40, w: 46, h: 40 };
  // Flies at head height: stay on the ground and it passes over you.
  return { kind, x: RUN_W + 10, y: GROUND_Y - PLAYER.size - 58, w: 30, h: 26 };
}

export function hits(s: RunState, o: Obstacle): boolean {
  const pad = 5; // forgiving hitboxes
  const px = PLAYER.x + pad;
  const py = s.y + pad;
  const ps = PLAYER.size - pad * 2;
  return px < o.x + o.w - pad && px + ps > o.x + pad && py < o.y + o.h - pad && py + ps > o.y + pad;
}

/** Advances the game by `dt` seconds. `rand` picks obstacle kinds and gaps. */
export function step(s: RunState, dt: number, rand: () => number = Math.random): RunState {
  if (s.status !== 'running') return s;
  dt = Math.min(dt, 0.05); // a background tab shouldn't teleport you into a beach ball
  let vy = s.vy + GRAVITY * dt;
  let y = s.y + vy * dt;
  if (y >= GROUND_Y - PLAYER.size) {
    y = GROUND_Y - PLAYER.size;
    vy = 0;
  }
  const move = s.speed * dt;
  let obstacles = s.obstacles.map((o) => ({ ...o, x: o.x - move })).filter((o) => o.x + o.w > -10);
  let nextIn = s.nextIn - move;
  const distance = s.distance + move;
  if (nextIn <= 0) {
    const r = rand();
    const kind: ObstacleKind = distance > 1800 && r < 0.25 ? 'warning' : r < 0.6 ? 'ball' : 'dialog';
    obstacles = [...obstacles, makeObstacle(kind)];
    // Gaps grow with speed so every run stays jumpable.
    nextIn = s.speed * (0.75 + rand() * 0.9);
  }
  const next: RunState = {
    ...s,
    y,
    vy,
    obstacles,
    nextIn,
    distance,
    speed: Math.min(MAX_SPEED, s.speed + 9 * dt),
    score: Math.floor(distance / 10),
  };
  return obstacles.some((o) => hits(next, o)) ? { ...next, status: 'over' } : next;
}
