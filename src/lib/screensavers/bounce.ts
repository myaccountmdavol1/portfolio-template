import { initials } from '../format';
import { asRecord, type ScreensaverModule } from './module';
import type { SiteData } from '../types';

export interface BounceSettings {
  text: string;
}

export const MAX_BOUNCE_TEXT = 12;
/** The colour changes at every wall, cycling through these. */
export const BOUNCE_COLORS = ['#ff9f0a', '#0a84ff', '#ff375f', '#bf5af2', '#ffd60a', '#64d2ff', '#30d158'];
/** "Exactly" a corner: hitting one wall while within this many px of the other. */
export const CORNER_TOLERANCE_PX = 3;

export interface BounceState {
  x: number; // px from the left of the free space
  y: number;
  vx: number; // px per ms
  vy: number;
}

/** One frame of the DVD-logo bounce in a `width` × `height` free space (the stage minus the logo). */
export function bounceStep(s: BounceState, dt: number, width: number, height: number): { state: BounceState; hitX: boolean; hitY: boolean; corner: boolean } {
  const maxX = Math.max(0, width);
  const maxY = Math.max(0, height);
  let { x, y, vx, vy } = s;
  x += vx * dt;
  y += vy * dt;
  let hitX = false;
  let hitY = false;
  if (x <= 0) {
    x = 0;
    vx = Math.abs(vx);
    hitX = true;
  } else if (x >= maxX) {
    x = maxX;
    vx = -Math.abs(vx);
    hitX = true;
  }
  if (y <= 0) {
    y = 0;
    vy = Math.abs(vy);
    hitY = true;
  } else if (y >= maxY) {
    y = maxY;
    vy = -Math.abs(vy);
    hitY = true;
  }
  const nearX = x <= CORNER_TOLERANCE_PX || x >= maxX - CORNER_TOLERANCE_PX;
  const nearY = y <= CORNER_TOLERANCE_PX || y >= maxY - CORNER_TOLERANCE_PX;
  return { state: { x, y, vx, vy }, hitX, hitY, corner: (hitX && nearY) || (hitY && nearX) };
}

const bounceDefaults = (site: SiteData): BounceSettings => ({ text: initials(site.site.ownerName) || 'Hi' });

export const bounce: ScreensaverModule<BounceSettings> = {
  id: 'bounce',
  name: 'Bouncing initials',
  emptyNote: 'type some text to bounce.',
  defaults: bounceDefaults,
  read: (site, raw) => {
    const text = asRecord(raw).text;
    return typeof text === 'string' ? { text: text.slice(0, MAX_BOUNCE_TEXT) } : bounceDefaults(site);
  },
  available: (_site, s) => s.text.trim() !== '',
};
