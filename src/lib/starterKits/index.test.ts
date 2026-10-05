import { describe, expect, it } from 'vitest';
import { seedSiteData } from '../seed';
import type { SiteData } from '../types';
import { isUntouchedSample, kitById, STARTER_KITS } from '.';

/** The same data with every object's keys in reverse order, as a database may return it. */
function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).reverse().map(([k, v]) => [k, reverseKeys(v)]));
  return value;
}

describe('the kit registry', () => {
  it('lists the kits in display order, Classic last, with unique ids', () => {
    expect(STARTER_KITS.map((k) => k.id)).toEqual(['teacher', 'student', 'creative', 'professional', 'classic']);
    expect(new Set(STARTER_KITS.map((k) => k.id)).size).toBe(STARTER_KITS.length);
  });

  it('finds a kit by id, and nothing for an unknown or missing one', () => {
    expect(kitById('classic')?.name).toBe('Classic');
    expect(kitById('nope')).toBeUndefined();
    expect(kitById(undefined)).toBeUndefined();
    expect(kitById('toString')).toBeUndefined();
  });

  it('Classic is the sample site, unchanged', () => {
    expect(kitById('classic')!.build()).toStrictEqual(seedSiteData);
  });
});

describe('isUntouchedSample', () => {
  it('is true for the sample as a new deploy serves it: published, reordered, round-tripped', () => {
    expect(isUntouchedSample(seedSiteData)).toBe(true);
    expect(isUntouchedSample(kitById('classic')!.build())).toBe(true);
    // Publishing stamps updatedAt; the store returns apps sorted by order and objects with keys in any order.
    expect(isUntouchedSample({ ...seedSiteData, site: { ...seedSiteData.site, updatedAt: '2030-01-01T00:00:00.000Z' } })).toBe(true);
    expect(isUntouchedSample({ ...seedSiteData, apps: [...seedSiteData.apps].reverse() })).toBe(true);
    expect(isUntouchedSample(reverseKeys(JSON.parse(JSON.stringify(seedSiteData))) as SiteData)).toBe(true);
  });

  it('is false after any real edit', () => {
    const s = seedSiteData;
    const edits: SiteData[] = [
      // a moved icon
      { ...s, layout: { ...s.layout, desktop: { ...s.layout.desktop, icons: s.layout.desktop.icons.map((i) => (i.appId === 'p2' ? { ...i, xPct: 30 } : i)) } } },
      // a renamed, hidden or deleted app
      { ...s, apps: s.apps.map((a) => (a.id === 'p1' ? { ...a, title: 'My project' } : a)) },
      { ...s, apps: s.apps.map((a) => (a.id === 'todo' ? { ...a, visible: false } : a)) },
      { ...s, apps: s.apps.filter((a) => a.id !== 'stats') },
      // the owner's name, headline, wallpaper or style, changed in the editor
      { ...s, site: { ...s.site, ownerName: 'Sam Taylor' } },
      { ...s, site: { ...s.site, headline: { ...s.site.headline, line2: 'studio.' } } },
      { ...s, site: { ...s.site, wallpaper: { kind: 'preset', preset: 'dusk' } } },
      { ...s, site: { ...s.site, style: { iconPack: 'glass' } } },
      // another kit
      ...STARTER_KITS.filter((k) => k.id !== 'classic').map((k) => k.build()),
    ];
    for (const [i, data] of edits.entries()) expect(isUntouchedSample(data), `edit ${i}`).toBe(false);
  });

  it('is false for anything that is not a site', () => {
    expect(isUntouchedSample(null as unknown as SiteData)).toBe(false);
    expect(isUntouchedSample({} as SiteData)).toBe(false);
  });
});
