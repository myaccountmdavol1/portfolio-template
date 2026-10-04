// Pure maths for the Game Center finale: falling icons, the Breakout board, and the credits.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Body extends Rect {
  vx: number;
  vy: number;
  rot: number; // degrees
  vr: number; // degrees per second
}

const GRAVITY = 2600; // px/s²
const BOUNCE = 0.38;

/** One physics step: everything falls, bounces on the floor and walls, and slowly settles. */
export function stepGravity(bodies: Body[], dt: number, floor: number, width: number): Body[] {
  return bodies.map((b) => {
    let { x, y, vx, vy, rot, vr } = b;
    vy += GRAVITY * dt;
    x += vx * dt;
    y += vy * dt;
    rot += vr * dt;
    if (y + b.h > floor) {
      y = floor - b.h;
      vy = Math.abs(vy) > 90 ? -vy * BOUNCE : 0;
      vx *= 0.8;
      vr *= 0.7;
    }
    if (x < 0) {
      x = 0;
      vx = Math.abs(vx) * BOUNCE;
    } else if (x + b.w > width) {
      x = width - b.w;
      vx = -Math.abs(vx) * BOUNCE;
    }
    return { ...b, x, y, vx, vy, rot, vr };
  });
}

/** Where each icon sits as a Breakout brick: centred rows near the top of the screen. */
export function brickLayout(count: number, width: number, top = 72, size = 56, gap = 12): Rect[] {
  const perRow = Math.max(1, Math.min(count, Math.floor((width - 40 + gap) / (size + gap))));
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, count - row * perRow);
    const rowWidth = inRow * size + (inRow - 1) * gap;
    const left = (width - rowWidth) / 2;
    return { x: left + (i % perRow) * (size + gap), y: top + row * (size + gap), w: size, h: size };
  });
}

export interface Ball {
  x: number; // centre
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export interface BallStep {
  ball: Ball;
  hit: number | null; // index into `bricks` that was hit this step
  lost: boolean; // fell past the paddle
}

/** Moves the ball one step: walls, paddle (angle depends on where it lands), and at most one brick. */
export function stepBall(ball: Ball, dt: number, bounds: { w: number; h: number }, paddle: Rect, bricks: (Rect | null)[]): BallStep {
  let { x, y, vx, vy } = ball;
  const { r } = ball;
  x += vx * dt;
  y += vy * dt;
  if (x - r < 0) {
    x = r;
    vx = Math.abs(vx);
  } else if (x + r > bounds.w) {
    x = bounds.w - r;
    vx = -Math.abs(vx);
  }
  if (y - r < 0) {
    y = r;
    vy = Math.abs(vy);
  }
  if (vy > 0 && y + r >= paddle.y && y - r <= paddle.y + paddle.h && x >= paddle.x - r && x <= paddle.x + paddle.w + r) {
    const speed = Math.hypot(vx, vy);
    const offset = Math.max(-1, Math.min(1, (x - (paddle.x + paddle.w / 2)) / (paddle.w / 2)));
    const angle = offset * (Math.PI / 3); // up to 60° off vertical
    vx = speed * Math.sin(angle);
    vy = -speed * Math.cos(angle);
    y = paddle.y - r;
  }
  let hit: number | null = null;
  for (let i = 0; i < bricks.length; i++) {
    const b = bricks[i];
    if (!b) continue;
    const nx = Math.max(b.x, Math.min(x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(y, b.y + b.h));
    if ((x - nx) ** 2 + (y - ny) ** 2 > r * r) continue;
    hit = i;
    // Bounce off whichever side the ball went in the least.
    const overlapX = Math.min(x + r - b.x, b.x + b.w - (x - r));
    const overlapY = Math.min(y + r - b.y, b.y + b.h - (y - r));
    if (overlapX < overlapY) vx = -vx;
    else vy = -vy;
    break;
  }
  return { ball: { x, y, vx, vy, r }, hit, lost: y - r > bounds.h };
}

/** The end-credits text. */
export function creditsLines(owner: string, apps: string[], visitor: string | null): string[] {
  return [
    'A portfolio by',
    owner,
    '',
    'Starring',
    ...apps.slice(0, 12),
    '',
    'Special thanks',
    visitor ? `${visitor}, for exploring every corner` : 'You, for exploring every corner',
    '',
    'No icons were harmed in the making of this portfolio.',
    '(Well, a few.)',
    '',
    'Thanks for playing.',
  ];
}

/** "4m 32s" from a duration in milliseconds. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`;
}
