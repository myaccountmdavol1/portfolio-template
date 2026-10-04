export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  color: string; // the eraser is a stroke in the paper colour
  size: number;
  points: Point[];
}

export const PAPER = '#ffffff';
export const CANVAS_W = 1200;
export const CANVAS_H = 800;

/** Converts a pointer position on the displayed canvas to canvas pixels (the canvas is CSS-scaled). */
export function toCanvasPoint(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): Point {
  return {
    x: Math.round(((clientX - rect.left) / Math.max(1, rect.width)) * CANVAS_W),
    y: Math.round(((clientY - rect.top) / Math.max(1, rect.height)) * CANVAS_H),
  };
}

/** Paints strokes with smooth curves through the midpoints between samples. */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[]): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of strokes) {
    const pts = s.points;
    if (pts.length === 0) continue;
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = s.size;
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, s.size / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mid = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mid.x, mid.y);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }
}
