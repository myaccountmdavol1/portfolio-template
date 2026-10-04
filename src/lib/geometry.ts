import type { AppType } from './types';

export const MENU_BAR_H = 32;
export const DOCK_RESERVED_H = 96;

export const WINDOW_WIDTHS: Record<AppType, number> = {
  project: 580,
  about: 860,
  document: 720,
  link: 720,
  note: 380,
  credentials: 980,
  stats: 1100,
  clock: 420,
  status: 420,
  messages: 440,
  guestbook: 760,
  freeform: 820,
  terminal: 680,
  photos: 820,
  maps: 860,
  calendar: 760,
  voicememos: 440,
  gamecenter: 560,
  mail: 620,
  facetime: 420,
  wallet: 440,
  social: 560,
  phone: 400,
};

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Same shape as the browser's DOMRect, so getBoundingClientRect() results can be passed directly. */
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function pctToPx(pct: number, total: number): number {
  return (pct / 100) * total;
}

export function pxToPct(px: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round(clamp((px / total) * 100, 0, 100) * 100) / 100;
}

export function windowWidth(type: AppType, viewportWidth: number): number {
  return Math.min(WINDOW_WIDTHS[type], viewportWidth - 24);
}

/** Keeps a window's title bar on screen: 12px from the sides, below the menu bar, above the dock. */
export function clampWindowPosition(pos: Point, winWidth: number, viewport: Size): Point {
  const minY = MENU_BAR_H + 8;
  const maxX = Math.max(12, viewport.width - winWidth - 12);
  const maxY = Math.max(minY, viewport.height - DOCK_RESERVED_H - 60);
  return { x: clamp(pos.x, 12, maxX), y: clamp(pos.y, minY, maxY) };
}

/** Where the Nth opened window appears: centred, then stepping 28px down-right, wrapping every 8. */
export function cascadePosition(openIndex: number, winWidth: number, viewport: Size): Point {
  const step = openIndex % 8;
  return clampWindowPosition(
    { x: (viewport.width - winWidth) / 2 + step * 28, y: MENU_BAR_H + 24 + step * 28 },
    winWidth,
    viewport,
  );
}

const round4 = (n: number) => Math.round(n * 10000) / 10000;

/** CSS transform (with transform-origin: 0 0) that shrinks a full-screen element onto `rect`. */
export function zoomFromRectTransform(rect: Rect, viewport: Size): string {
  const sx = round4(rect.width / viewport.width);
  const sy = round4(rect.height / viewport.height);
  return `translate(${rect.left}px, ${rect.top}px) scale(${sx}, ${sy})`;
}

// ---- window tiling (macOS Sequoia-style) ----

export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SnapZone = 'left' | 'right' | 'fill' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

const EDGE = 14; // how close to an edge the pointer must be
const CORNER = 80; // how far along an edge counts as its corner
const GAP = 8;

/** Where a dragged window would snap if released at this pointer position, or null. */
export function snapZoneAt(pointer: Point, viewport: Size): SnapZone | null {
  const { x, y } = pointer;
  const nearLeft = x <= EDGE;
  const nearRight = x >= viewport.width - EDGE;
  const nearTop = y <= MENU_BAR_H + EDGE;
  if (nearLeft || nearRight) {
    if (y <= MENU_BAR_H + CORNER) return nearLeft ? 'topLeft' : 'topRight';
    if (y >= viewport.height - DOCK_RESERVED_H - CORNER) return nearLeft ? 'bottomLeft' : 'bottomRight';
    return nearLeft ? 'left' : 'right';
  }
  if (nearTop) return 'fill';
  return null;
}

/** The usable desktop between the menu bar and the dock, with a small gap all round. */
export function workArea(viewport: Size): Frame {
  const top = MENU_BAR_H + GAP;
  return { x: GAP, y: top, width: Math.max(320, viewport.width - GAP * 2), height: Math.max(240, viewport.height - DOCK_RESERVED_H - top) };
}

export function zoneFrame(zone: SnapZone, viewport: Size): Frame {
  const a = workArea(viewport);
  const halfW = (a.width - GAP) / 2;
  const halfH = (a.height - GAP) / 2;
  const right = a.x + halfW + GAP;
  const bottom = a.y + halfH + GAP;
  const frames: Record<SnapZone, Frame> = {
    fill: a,
    left: { x: a.x, y: a.y, width: halfW, height: a.height },
    right: { x: right, y: a.y, width: halfW, height: a.height },
    topLeft: { x: a.x, y: a.y, width: halfW, height: halfH },
    topRight: { x: right, y: a.y, width: halfW, height: halfH },
    bottomLeft: { x: a.x, y: bottom, width: halfW, height: halfH },
    bottomRight: { x: right, y: bottom, width: halfW, height: halfH },
  };
  const f = frames[zone];
  return { x: Math.round(f.x), y: Math.round(f.y), width: Math.round(f.width), height: Math.round(f.height) };
}

/** “Arrange”: tiles `count` windows in a near-square grid over the work area. */
export function tileFrames(count: number, viewport: Size): Frame[] {
  if (count <= 0) return [];
  const a = workArea(viewport);
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const w = (a.width - GAP * (cols - 1)) / cols;
  const h = (a.height - GAP * (rows - 1)) / rows;
  return Array.from({ length: count }, (_, i) => ({
    x: Math.round(a.x + (i % cols) * (w + GAP)),
    y: Math.round(a.y + Math.floor(i / cols) * (h + GAP)),
    width: Math.round(w),
    height: Math.round(h),
  }));
}

export const MIN_WINDOW = { width: 320, height: 200 };

/** Title bar height of a desktop window. */
export const TITLE_BAR_H = 38;

/**
 * A window frame that shows `media` (e.g. a photo) as large as fits the desktop (never upscaled),
 * plus `extraHeight` of the app's own bars, staying near `at` and fully on screen.
 */
export function fitMediaFrame(media: Size, extraHeight: number, at: Point, viewport: Size): Frame {
  const a = workArea(viewport);
  const maxW = Math.min(a.width, 1200);
  const maxH = Math.max(120, a.height - TITLE_BAR_H - extraHeight);
  const scale = Math.min(1, maxW / media.width, maxH / media.height);
  const width = Math.round(clamp(media.width * scale, 480, a.width));
  const height = Math.round(clamp(media.height * scale + extraHeight + TITLE_BAR_H, 320, a.height));
  return {
    x: Math.round(clamp(at.x, a.x, a.x + a.width - width)),
    y: Math.round(clamp(at.y, a.y, a.y + a.height - height)),
    width,
    height,
  };
}
