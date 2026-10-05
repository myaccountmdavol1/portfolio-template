import { seedSiteData } from '../seed';
import type { SiteData } from '../types';
import { classic } from './classic';
import { creative } from './creative';
import { professional } from './professional';
import { student } from './student';
import { teacher } from './teacher';
import type { StarterKit } from './types';

export { CLASSIC_ID } from './classic';
export type { KitLook, StarterKit } from './types';

/** The kits in the order the wizard shows them. Classic (the sample site) is last. */
export const STARTER_KITS: readonly StarterKit[] = [teacher, student, creative, professional, classic];

export function kitById(id: string | undefined): StarterKit | undefined {
  return id ? STARTER_KITS.find((k) => k.id === id) : undefined;
}

/** Objects with their keys sorted and undefined values dropped, so key order (e.g. after Postgres jsonb) never matters. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, canonical(v)]),
    );
  }
  return value;
}

/** Everything an owner can change, as one string. Left out: site.updatedAt (stamped by every publish) and the order the store returns apps in. */
function fingerprint(data: SiteData): string {
  const apps = [...data.apps].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return JSON.stringify(canonical({ ...data, site: { ...data.site, updatedAt: '' }, apps }));
}

const SAMPLE = fingerprint(seedSiteData);

/**
 * True while the site is still the template's sample, exactly as a new deploy serves it: the wizard then offers the
 * starter kits. Any change an owner can make (a moved icon, a renamed app, a new name or wallpaper) makes it false.
 */
export function isUntouchedSample(data: SiteData): boolean {
  try {
    return fingerprint(data) === SAMPLE;
  } catch {
    return false;
  }
}
