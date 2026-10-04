import { describe, expect, it } from 'vitest';
import { cascadePosition, clampWindowPosition, fitMediaFrame, pctToPx, pxToPct, TITLE_BAR_H, windowWidth, zoomFromRectTransform } from './geometry';

const VP = { width: 1280, height: 800 };

describe('pct/px conversion', () => {
  it('converts both ways', () => {
    expect(pctToPx(25, 200)).toBe(50);
    expect(pxToPct(50, 200)).toBe(25);
  });
  it('clamps to 0–100 and rounds to 2 decimals', () => {
    expect(pxToPct(-10, 200)).toBe(0);
    expect(pxToPct(300, 200)).toBe(100);
    expect(pxToPct(1, 3)).toBe(33.33);
  });
  it('returns 0 when the total is 0', () => {
    expect(pxToPct(10, 0)).toBe(0);
  });
});

describe('windowWidth', () => {
  it('uses the per-type default', () => {
    expect(windowWidth('note', 1280)).toBe(380);
    expect(windowWidth('project', 1280)).toBe(580);
  });
  it('caps at viewport width minus 24', () => {
    expect(windowWidth('stats', 800)).toBe(776);
  });
});

describe('clampWindowPosition', () => {
  it('keeps the window below the menu bar and inside the left edge', () => {
    expect(clampWindowPosition({ x: -50, y: 0 }, 500, VP)).toEqual({ x: 12, y: 40 });
  });
  it('keeps the title bar reachable above the dock and inside the right edge', () => {
    expect(clampWindowPosition({ x: 2000, y: 2000 }, 500, VP)).toEqual({ x: 768, y: 644 });
  });
});

describe('cascadePosition', () => {
  it('centres the first window and offsets later ones by 28px', () => {
    expect(cascadePosition(0, 500, VP)).toEqual({ x: 390, y: 56 });
    expect(cascadePosition(1, 500, VP)).toEqual({ x: 418, y: 84 });
  });
  it('wraps back after 8 windows', () => {
    expect(cascadePosition(9, 500, VP)).toEqual(cascadePosition(1, 500, VP));
  });
});

describe('zoomFromRectTransform', () => {
  it('maps the full screen onto the icon rectangle', () => {
    expect(zoomFromRectTransform({ left: 20, top: 100, width: 60, height: 60 }, { width: 390, height: 844 })).toBe(
      'translate(20px, 100px) scale(0.1538, 0.0711)',
    );
  });
});

describe('window tiling geometry', async () => {
  const { snapZoneAt, tileFrames, workArea, zoneFrame } = await import('./geometry');
  const vp = { width: 1280, height: 800 };

  it('detects edge and corner snap zones', () => {
    expect(snapZoneAt({ x: 5, y: 400 }, vp)).toBe('left');
    expect(snapZoneAt({ x: 1278, y: 400 }, vp)).toBe('right');
    expect(snapZoneAt({ x: 640, y: 36 }, vp)).toBe('fill');
    expect(snapZoneAt({ x: 3, y: 50 }, vp)).toBe('topLeft');
    expect(snapZoneAt({ x: 1279, y: 690 }, vp)).toBe('bottomRight');
    expect(snapZoneAt({ x: 640, y: 400 }, vp)).toBeNull();
  });

  it('halves and quarters split the work area with a gap', () => {
    const a = workArea(vp);
    const left = zoneFrame('left', vp);
    const right = zoneFrame('right', vp);
    expect(left.x).toBe(a.x);
    expect(right.x + right.width).toBe(a.x + a.width);
    expect(right.x - (left.x + left.width)).toBe(8);
    expect(zoneFrame('fill', vp)).toEqual(a);
    expect(zoneFrame('bottomLeft', vp).y).toBeGreaterThan(zoneFrame('topLeft', vp).y);
  });

  it('tiles windows into a near-square grid', () => {
    expect(tileFrames(0, vp)).toEqual([]);
    const four = tileFrames(4, vp);
    expect(new Set(four.map((f) => f.x)).size).toBe(2);
    expect(new Set(four.map((f) => f.y)).size).toBe(2);
    expect(tileFrames(3, vp)).toHaveLength(3);
  });
});

describe('fitMediaFrame', () => {
  const vp = { width: 1440, height: 900 };

  it('shrinks a big wide photo to fit the desktop, keeping its shape', () => {
    const f = fitMediaFrame({ width: 3000, height: 1000 }, 100, { x: 100, y: 80 }, vp);
    const photoH = f.height - 100 - TITLE_BAR_H;
    expect(f.width / photoH).toBeCloseTo(3, 1);
    expect(f.x + f.width).toBeLessThanOrEqual(vp.width);
  });

  it('makes a tall window for a portrait photo, fully on screen', () => {
    const f = fitMediaFrame({ width: 800, height: 1600 }, 50, { x: 1300, y: 500 }, vp);
    expect(f.height).toBeGreaterThan(f.width);
    expect(f.x + f.width).toBeLessThanOrEqual(vp.width);
    expect(f.y + f.height).toBeLessThanOrEqual(vp.height - 96);
  });

  it('never upscales, but keeps room for the arrows', () => {
    const f = fitMediaFrame({ width: 200, height: 150 }, 0, { x: 50, y: 50 }, vp);
    expect(f.width).toBe(480);
    expect(f.height).toBe(320);
  });
});
