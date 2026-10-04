import { describe, expect, it } from 'vitest';
import { CANVAS_H, CANVAS_W, toCanvasPoint } from './freeform';

describe('toCanvasPoint', () => {
  it('maps a pointer on a scaled-down canvas to canvas pixels', () => {
    const rect = { left: 100, top: 50, width: CANVAS_W / 2, height: CANVAS_H / 2 };
    expect(toCanvasPoint(100, 50, rect)).toEqual({ x: 0, y: 0 });
    expect(toCanvasPoint(100 + CANVAS_W / 4, 50 + CANVAS_H / 4, rect)).toEqual({ x: CANVAS_W / 2, y: CANVAS_H / 2 });
  });
});
