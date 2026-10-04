import { asRecord, sitePasses, stringList, type ScreensaverModule } from './module';
import type { SiteData } from '../types';

export interface DriftSettings {
  badgeIds: string[] | null; // null = every badge with a picture
}

export interface DriftBadge {
  id: string;
  title: string;
  imageUrl: string;
}

export const MAX_DRIFT_BADGES = 12;

/** The badges that float: those with a picture, newest first (or the owner's picks, in their order). */
export function driftBadges(site: SiteData, s: DriftSettings): DriftBadge[] {
  const withImage = sitePasses(site)
    .map((p) => p.pass)
    .filter((p) => p.imageUrl?.trim());
  const chosen = s.badgeIds === null ? withImage : s.badgeIds.flatMap((id) => withImage.filter((p) => p.id === id).slice(0, 1));
  return chosen.slice(0, MAX_DRIFT_BADGES).map((p) => ({ id: p.id, title: p.title, imageUrl: (p.imageUrl ?? '').trim() }));
}

export const drift: ScreensaverModule<DriftSettings> = {
  id: 'drift',
  name: 'Badge Drift',
  emptyNote: 'add a badge with a picture to your Wallet app.',
  defaults: () => ({ badgeIds: null }),
  read: (_site, raw) => {
    const ids = asRecord(raw).badgeIds;
    return { badgeIds: ids === null ? null : (stringList(ids) ?? null) };
  },
  available: (site, s) => driftBadges(site, s).length > 0,
};
