import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BODY_FONT,
  DEFAULT_HEADING_FONT,
  FONT_CATEGORIES,
  fontById,
  FONTS,
  fontStack,
  googleFontsHref,
  headingFontFamily,
  LEGACY_HEADLINE_FONTS,
  ogHeadingFamily,
  previewFontHref,
  resolveSiteFonts,
  siteFontsHref,
  siteFontVars,
} from './fonts';
import type { SiteSettings } from './types';

const site = (style?: SiteSettings['style'], font?: 'serif' | 'sans' | 'mono'): Pick<SiteSettings, 'style' | 'headline'> => ({
  style,
  headline: { show: true, line1: 'a', line2: 'b', style: font ? { font } : undefined },
});

describe('the font catalogue', () => {
  it('has about 18 fonts with unique ids', () => {
    expect(FONTS.length).toBeGreaterThanOrEqual(16);
    expect(FONTS.length).toBeLessThanOrEqual(20);
    expect(new Set(FONTS.map((f) => f.id)).size).toBe(FONTS.length);
  });

  it('gives every font a generic fallback and ascending weights', () => {
    for (const f of FONTS) {
      expect(f.fallback, f.id).toMatch(/(serif|sans-serif|monospace|cursive)$/);
      expect(f.weights.length, f.id).toBeGreaterThan(0);
      expect([...f.weights].sort((a, b) => a - b), f.id).toEqual(f.weights);
      expect(f.id, f.id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('uses every category, and every category is listed', () => {
    expect(new Set(FONTS.map((f) => f.category))).toEqual(new Set(FONT_CATEGORIES.map((c) => c.id)));
  });

  it('maps the headline’s older serif/sans/mono option onto the fonts next/font already loads', () => {
    const layout = readFileSync('src/app/layout.tsx', 'utf8');
    for (const id of Object.values(LEGACY_HEADLINE_FONTS)) {
      const font = fontById(id)!;
      expect(font.cssVar, id).toBeDefined();
      expect(layout).toContain(`variable: '${font.cssVar}'`);
    }
    expect(LEGACY_HEADLINE_FONTS).toEqual({ serif: 'instrument-serif', sans: 'geist', mono: 'geist-mono' });
    expect(DEFAULT_HEADING_FONT).toBe('instrument-serif');
    expect(DEFAULT_BODY_FONT).toBe('geist');
  });
});

describe('fontStack', () => {
  it('uses the next/font variable for built-in fonts and the quoted family otherwise', () => {
    expect(fontStack(fontById('instrument-serif')!)).toBe('var(--font-instrument-serif), Georgia, serif');
    expect(fontStack(fontById('nunito')!)).toBe("'Nunito', system-ui, sans-serif");
  });
});

describe('resolveSiteFonts', () => {
  it('defaults to Instrument Serif and Geist (today’s look)', () => {
    const { heading, body } = resolveSiteFonts(site());
    expect([heading.id, body.id]).toEqual(['instrument-serif', 'geist']);
  });
  it('follows the headline’s older font option', () => {
    expect(resolveSiteFonts(site(undefined, 'mono')).heading.id).toBe('geist-mono');
    expect(resolveSiteFonts(site(undefined, 'sans')).heading.id).toBe('geist');
  });
  it('lets the Style choice win, and ignores unknown ids', () => {
    expect(resolveSiteFonts(site({ headingFont: 'lora', bodyFont: 'inter' }, 'mono'))).toMatchObject({ heading: { id: 'lora' }, body: { id: 'inter' } });
    expect(resolveSiteFonts(site({ headingFont: 'nope', bodyFont: 'nope' }))).toMatchObject({ heading: { id: 'instrument-serif' }, body: { id: 'geist' } });
  });
});

describe('CSS variables and the heading family', () => {
  it('sets nothing for a site without Style choices', () => {
    expect(siteFontVars(site())).toEqual({});
    expect(headingFontFamily(site(undefined, 'mono'))).toBeUndefined();
  });
  it('sets the variables for the chosen fonts', () => {
    expect(siteFontVars(site({ headingFont: 'lora', bodyFont: 'nunito' }))).toEqual({
      '--site-heading-font': "'Lora', Georgia, serif",
      '--site-body-font': "'Nunito', system-ui, sans-serif",
    });
    expect(headingFontFamily(site({ headingFont: 'lora' }))).toBe('var(--site-heading-font)');
    expect(siteFontVars(site({ bodyFont: 'nope' }))).toEqual({});
  });
});

describe('Google Fonts URLs', () => {
  it('asks for only the families next/font doesn’t load, with their weights and italics', () => {
    expect(googleFontsHref([fontById('lora')!, fontById('inter')!])).toBe(
      'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400;1,700&family=Inter:wght@400;500;600;700&display=swap',
    );
    expect(googleFontsHref([fontById('abril-fatface')!])).toBe('https://fonts.googleapis.com/css2?family=Abril+Fatface&display=swap');
    expect(googleFontsHref([fontById('geist')!, fontById('instrument-serif')!])).toBeNull();
    expect(googleFontsHref([fontById('caveat')!, fontById('caveat')!])).toBe('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap');
  });
  it('loads nothing for a site without Style choices', () => {
    expect(siteFontsHref(site(undefined, 'mono'))).toBeNull();
    expect(siteFontsHref(site({ headingFont: 'playfair-display', bodyFont: 'geist' }))).toBe(
      'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap',
    );
  });
  it('previews a font with its regular weight only', () => {
    expect(previewFontHref(fontById('space-grotesk')!)).toBe('https://fonts.googleapis.com/css2?family=Space+Grotesk&text=Space%20Grotesk&display=swap');
    expect(previewFontHref(fontById('geist-mono')!)).toBeNull();
  });
});

describe('ogHeadingFamily', () => {
  it('keeps Instrument Serif unless the owner picked a headline font', () => {
    expect(ogHeadingFamily(site(undefined, 'mono'))).toBe('Instrument Serif');
    expect(ogHeadingFamily(site({ headingFont: 'pacifico' }))).toBe('Pacifico');
  });
});
