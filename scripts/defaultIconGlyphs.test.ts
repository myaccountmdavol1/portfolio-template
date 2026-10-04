import { describe, expect, it } from 'vitest';
import { CATALOG_ICONS } from '../src/lib/iconCatalog';
import { GLYPHS, initials, iconSvg } from './defaultIconGlyphs';

describe('iconSvg', () => {
  it('draws a 256x256 SVG for every catalog icon', () => {
    for (const icon of CATALOG_ICONS) {
      const svg = iconSvg(icon);
      expect(svg.startsWith('<svg'), icon.slug).toBe(true);
      expect(svg).toContain('width="256"');
      expect(svg).toMatch(/<path|<text|<circle|<rect (?!x="8")/);
    }
  });

  it('uses a mapped glyph when there is one, initials otherwise', () => {
    const mail = CATALOG_ICONS.find((i) => i.slug === 'mail')!;
    expect(GLYPHS.mail).toBeDefined();
    expect(iconSvg(mail)).not.toContain('<text');
    expect(iconSvg({ slug: 'pip-agent', label: 'PiP Agent', category: 'system' })).toContain('>PA<');
  });

  it('only maps real catalog slugs', () => {
    const slugs = new Set<string>(CATALOG_ICONS.map((i) => i.slug));
    for (const slug of Object.keys(GLYPHS)) expect(slugs.has(slug), slug).toBe(true);
  });

  it('makes initials from up to two words', () => {
    expect(initials('Voice Memos')).toBe('VM');
    expect(initials('Finder')).toBe('F');
    expect(initials('Trash (Full)')).toBe('TF');
  });
});
