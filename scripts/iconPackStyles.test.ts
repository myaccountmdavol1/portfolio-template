import { describe, expect, it } from 'vitest';
import { CATALOG_ICONS, ICON_PACKS } from '../src/lib/iconCatalog';
import { glyphMarkup, iconSvg } from './defaultIconGlyphs';
import { GENERATED_PACKS, mix, packLicense, PACK_STYLES } from './iconPackStyles';

const mail = CATALOG_ICONS.find((i) => i.slug === 'mail')!;
const spotify = CATALOG_ICONS.find((i) => i.slug === 'spotify')!;
const pip = CATALOG_ICONS.find((i) => i.slug === 'pip-agent')!;

describe('pack styles', () => {
  it('has a style for every shipped pack in the registry', () => {
    const shipped = ICON_PACKS.filter((p) => !p.private).map((p) => p.id);
    expect(Object.keys(PACK_STYLES).sort()).toEqual([...shipped].sort());
    expect(GENERATED_PACKS).toEqual(shipped);
  });

  it('keeps the default pack exactly as it was drawn', () => {
    expect(PACK_STYLES.default).toBe(iconSvg);
  });

  it('draws a 256x256 SVG for every icon in every pack', () => {
    for (const [pack, style] of Object.entries(PACK_STYLES)) {
      for (const icon of CATALOG_ICONS) {
        const svg = style(icon);
        expect(svg.startsWith('<svg'), `${pack}/${icon.slug}`).toBe(true);
        expect(svg, `${pack}/${icon.slug}`).toContain('width="256"');
      }
    }
  });

  it('colours the glyph for each pack', () => {
    expect(PACK_STYLES.outline(mail)).toContain('stroke="#007aff"');
    expect(PACK_STYLES['mono-light'](mail)).toContain('stroke="#1d1c1a"');
    expect(PACK_STYLES['mono-dark'](mail)).toContain('stroke="#f2efe9"');
    expect(PACK_STYLES.glass(mail)).toContain('stroke="#ffffff"');
    expect(PACK_STYLES.pastel(mail)).toContain(`stroke="${mix('#007aff', '#000000', 0.2)}"`);
  });

  it('writes a licence naming the open glyph sources', () => {
    expect(packLicense('glass')).toContain('"glass"');
    expect(packLicense('glass')).toContain('Lucide (ISC');
    expect(packLicense('glass')).toContain('Simple Icons (CC0');
  });
});

describe('glyphMarkup', () => {
  it('draws lucide, brand and initials glyphs in the given colour', () => {
    expect(glyphMarkup(mail, '#123456')).toContain('stroke="#123456"');
    expect(glyphMarkup(spotify, '#123456')).toContain('fill="#123456"');
    expect(glyphMarkup(pip, '#123456')).toContain('fill="#123456">PA<');
    expect(glyphMarkup(mail)).toContain('stroke="#fff"');
  });
});

describe('mix', () => {
  it('moves a colour towards another', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#007aff', '#ffffff', 0)).toBe('#007aff');
  });
});
