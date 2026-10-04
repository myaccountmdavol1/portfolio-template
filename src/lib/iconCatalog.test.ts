import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CATALOG_CATEGORIES, CATALOG_ICONS, DEFAULT_CATALOG_FOR_BUILTIN, filterIcons, type CatalogIconSlug } from './iconCatalog';
import type { BuiltinIconName } from './types';

const ALL_BUILTIN: BuiltinIconName[] = ['folder', 'file', 'note', 'person', 'chart', 'badge', 'link', 'music', 'mail', 'globe'];
const packsDir = fileURLToPath(new URL('../../icon-packs/', import.meta.url));
const packs = readdirSync(packsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

describe('CATALOG_ICONS', () => {
  it('has unique slugs', () => {
    const slugs = CATALOG_ICONS.map((i) => i.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('has at least 100 icons', () => {
    expect(CATALOG_ICONS.length).toBeGreaterThanOrEqual(100);
  });

  it.each(packs)('pack "%s" has a PNG and a WebP for every slug', (pack) => {
    for (const { slug } of CATALOG_ICONS) {
      expect(existsSync(`${packsDir}${pack}/${slug}.png`), `${pack}: missing ${slug}.png`).toBe(true);
      expect(existsSync(`${packsDir}${pack}/${slug}.webp`), `${pack}: missing ${slug}.webp (the site serves WebP)`).toBe(true);
    }
  });

  it('gives every icon a non-empty label and category', () => {
    for (const i of CATALOG_ICONS) {
      expect(i.label.length).toBeGreaterThan(0);
      expect(i.category.length).toBeGreaterThan(0);
    }
  });
});

describe('DEFAULT_CATALOG_FOR_BUILTIN', () => {
  const validSlugs = new Set<CatalogIconSlug>(CATALOG_ICONS.map((i) => i.slug));

  it('maps every builtin name to a real catalog slug', () => {
    for (const name of ALL_BUILTIN) {
      expect(validSlugs.has(DEFAULT_CATALOG_FOR_BUILTIN[name]), name).toBe(true);
    }
  });
});

describe('filterIcons', () => {
  it('returns everything for an empty query in All', () => {
    expect(filterIcons('', 'all')).toHaveLength(CATALOG_ICONS.length);
  });

  it('matches labels case-insensitively', () => {
    expect(filterIcons('SAF', 'all').map((i) => i.slug)).toEqual(['safari']);
  });

  it('limits to a category', () => {
    const drives = filterIcons('', 'drives');
    expect(drives.length).toBeGreaterThan(0);
    expect(drives.every((i) => i.category === 'drives')).toBe(true);
    expect(filterIcons('safari', 'drives')).toEqual([]);
  });

  it('every category in the picker has icons', () => {
    for (const c of CATALOG_CATEGORIES) expect(filterIcons('', c.id).length, c.label).toBeGreaterThan(0);
  });
});
