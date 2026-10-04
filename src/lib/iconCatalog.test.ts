import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CATALOG_CATEGORIES,
  CATALOG_ICONS,
  catalogIconUrl,
  DEFAULT_CATALOG_FOR_BUILTIN,
  filterIcons,
  ICON_PACKS,
  orderedPacks,
  parseIconPackManifest,
  packIconUrl,
  PRIVATE_ICON_PACKS,
  type CatalogIconSlug,
} from './iconCatalog';
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

describe('icon packs', () => {
  it('lists the shipped packs and the private macOS pack', () => {
    expect(ICON_PACKS.map((p) => p.id)).toEqual(['default', 'glass', 'outline', 'pastel', 'mono-light', 'mono-dark', 'macos']);
    expect(PRIVATE_ICON_PACKS).toEqual(['macos']);
    expect(new Set(ICON_PACKS.map((p) => p.label)).size).toBe(ICON_PACKS.length);
  });

  it('orders served packs like the registry, unknown ones last by name', () => {
    expect(orderedPacks(['mono-dark', 'zebra', 'default', 'macos', 'apple'])).toEqual([
      { id: 'default', label: 'Default' },
      { id: 'mono-dark', label: 'Mono dark' },
      { id: 'macos', label: 'macOS' },
      { id: 'apple', label: 'apple' },
      { id: 'zebra', label: 'zebra' },
    ]);
  });
});

describe('catalogIconUrl', () => {
  it('uses the build’s default pack without a site pack (as before)', () => {
    expect(catalogIconUrl('mail')).toBe('/icons/catalog/mail.webp');
  });
  it('uses the site’s pack', () => {
    expect(catalogIconUrl('mail', 'outline')).toBe('/icons/outline/mail.webp');
  });
  it('ignores a pack id that isn’t a plain folder name', () => {
    expect(catalogIconUrl('mail', '../secret')).toBe('/icons/catalog/mail.webp');
    expect(catalogIconUrl('mail', '')).toBe('/icons/catalog/mail.webp');
  });
});

describe('packIconUrl', () => {
  it('draws saved /icons/catalog links in the site’s pack', () => {
    expect(packIconUrl('/icons/catalog/mail.png', 'glass')).toBe('/icons/glass/mail.webp');
    expect(packIconUrl('/icons/catalog/safari.webp', 'glass')).toBe('/icons/glass/safari.webp');
  });
  it('leaves everything else alone', () => {
    expect(packIconUrl('/icons/catalog/mail.png')).toBe('/icons/catalog/mail.png');
    expect(packIconUrl('https://x.com/icon.png', 'glass')).toBe('https://x.com/icon.png');
    expect(packIconUrl('/icons/catalog/mail.png', 'bad/id')).toBe('/icons/catalog/mail.png');
  });
});

describe('parseIconPackManifest', () => {
  it('accepts a valid manifest', () => {
    expect(parseIconPackManifest({ default: 'default', packs: ['default', 'glass'] })).toEqual({ default: 'default', packs: ['default', 'glass'] });
  });
  it('rejects anything of the wrong shape', () => {
    for (const bad of [{}, [], null, 'x', { packs: 'x' }, { default: 'a', packs: 'x' }, { default: 'a', packs: [1] }, { default: 1, packs: [] }, { packs: ['a'] }]) {
      expect(parseIconPackManifest(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});
