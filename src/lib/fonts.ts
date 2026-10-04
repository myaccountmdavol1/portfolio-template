import type { CSSProperties } from 'react';
import type { HeadlineStyle, SiteSettings } from './types';

// The fonts owners can pick in Site settings → Style. Adding a font = one entry here (any Google Fonts family;
// check its weights on fonts.google.com). Entries with `cssVar` are already loaded by next/font in
// src/app/layout.tsx, so they never need a Google Fonts link.

export type FontCategory = 'serif' | 'sans' | 'display' | 'handwriting' | 'mono';

export interface SiteFont {
  id: string;
  /** Shown in the picker. */
  name: string;
  /** The Google Fonts family name. */
  family: string;
  category: FontCategory;
  /** Weights to load, ascending. */
  weights: number[];
  /** Also load italics (the headline's small line is italic). */
  italic: boolean;
  /** Generic stack after the font, ending in a generic family. */
  fallback: string;
  /** The next/font variable in src/app/layout.tsx, for fonts the site always loads. */
  cssVar?: string;
}

const SERIF = 'Georgia, serif';
const SANS = 'system-ui, sans-serif';
const MONO = 'ui-monospace, monospace';
const HAND = 'cursive';

export const FONTS: readonly SiteFont[] = [
  { id: 'instrument-serif', name: 'Instrument Serif', family: 'Instrument Serif', category: 'serif', weights: [400], italic: true, fallback: SERIF, cssVar: '--font-instrument-serif' },
  { id: 'playfair-display', name: 'Playfair Display', family: 'Playfair Display', category: 'serif', weights: [400, 700], italic: true, fallback: SERIF },
  { id: 'lora', name: 'Lora', family: 'Lora', category: 'serif', weights: [400, 700], italic: true, fallback: SERIF },
  { id: 'merriweather', name: 'Merriweather', family: 'Merriweather', category: 'serif', weights: [400, 700], italic: true, fallback: SERIF },
  { id: 'fraunces', name: 'Fraunces', family: 'Fraunces', category: 'serif', weights: [400, 700], italic: true, fallback: SERIF },
  { id: 'geist', name: 'Geist', family: 'Geist', category: 'sans', weights: [400, 500, 600, 700], italic: false, fallback: SANS, cssVar: '--font-geist-sans' },
  { id: 'inter', name: 'Inter', family: 'Inter', category: 'sans', weights: [400, 500, 600, 700], italic: false, fallback: SANS },
  { id: 'dm-sans', name: 'DM Sans', family: 'DM Sans', category: 'sans', weights: [400, 500, 700], italic: false, fallback: SANS },
  { id: 'nunito', name: 'Nunito', family: 'Nunito', category: 'sans', weights: [400, 600, 700], italic: false, fallback: SANS },
  { id: 'space-grotesk', name: 'Space Grotesk', family: 'Space Grotesk', category: 'sans', weights: [400, 500, 700], italic: false, fallback: SANS },
  { id: 'bricolage-grotesque', name: 'Bricolage Grotesque', family: 'Bricolage Grotesque', category: 'display', weights: [400, 600, 800], italic: false, fallback: SANS },
  { id: 'abril-fatface', name: 'Abril Fatface', family: 'Abril Fatface', category: 'display', weights: [400], italic: false, fallback: SERIF },
  { id: 'caveat', name: 'Caveat', family: 'Caveat', category: 'handwriting', weights: [400, 700], italic: false, fallback: HAND },
  { id: 'patrick-hand', name: 'Patrick Hand', family: 'Patrick Hand', category: 'handwriting', weights: [400], italic: false, fallback: HAND },
  { id: 'pacifico', name: 'Pacifico', family: 'Pacifico', category: 'handwriting', weights: [400], italic: false, fallback: HAND },
  { id: 'geist-mono', name: 'Geist Mono', family: 'Geist Mono', category: 'mono', weights: [400, 500, 600], italic: false, fallback: MONO, cssVar: '--font-geist-mono' },
  { id: 'jetbrains-mono', name: 'JetBrains Mono', family: 'JetBrains Mono', category: 'mono', weights: [400, 700], italic: false, fallback: MONO },
  { id: 'space-mono', name: 'Space Mono', family: 'Space Mono', category: 'mono', weights: [400, 700], italic: true, fallback: MONO },
];

export const FONT_CATEGORIES: { id: FontCategory; label: string }[] = [
  { id: 'serif', label: 'Serif' },
  { id: 'sans', label: 'Sans-serif' },
  { id: 'display', label: 'Display' },
  { id: 'handwriting', label: 'Handwriting' },
  { id: 'mono', label: 'Monospace' },
];

/** What the headline's older `font` option meant, so sites saved before Style keep their look. */
export const LEGACY_HEADLINE_FONTS: Record<NonNullable<HeadlineStyle['font']>, string> = {
  serif: 'instrument-serif',
  sans: 'geist',
  mono: 'geist-mono',
};

export const DEFAULT_HEADING_FONT = 'instrument-serif';
export const DEFAULT_BODY_FONT = 'geist';

export type FontSite = Pick<SiteSettings, 'style' | 'headline'>;

export function fontById(id: string | undefined): SiteFont | undefined {
  return id ? FONTS.find((f) => f.id === id) : undefined;
}

/** The CSS font-family value for a font. */
export function fontStack(font: SiteFont): string {
  return font.cssVar ? `var(${font.cssVar}), ${font.fallback}` : `'${font.family}', ${font.fallback}`;
}

/** The fonts a site uses: its Style choices, else the headline's older option, else the defaults. */
export function resolveSiteFonts(site: FontSite): { heading: SiteFont; body: SiteFont } {
  const legacy = site.headline.style?.font;
  const heading =
    fontById(site.style?.headingFont) ?? fontById(legacy ? LEGACY_HEADLINE_FONTS[legacy] : undefined) ?? fontById(DEFAULT_HEADING_FONT)!;
  const body = fontById(site.style?.bodyFont) ?? fontById(DEFAULT_BODY_FONT)!;
  return { heading, body };
}

/** The headline's font-family when the owner picked one in Style; undefined keeps the older headline option. */
export function headingFontFamily(site: FontSite): string | undefined {
  return fontById(site.style?.headingFont) ? 'var(--site-heading-font)' : undefined;
}

/** CSS custom properties for the site's root element. Empty when nothing was picked, so old sites render as before. */
export function siteFontVars(site: FontSite): CSSProperties {
  const vars: Record<string, string> = {};
  const heading = fontById(site.style?.headingFont);
  const body = fontById(site.style?.bodyFont);
  if (heading) vars['--site-heading-font'] = fontStack(heading);
  if (body) vars['--site-body-font'] = fontStack(body);
  return vars as CSSProperties;
}

function familyParam(font: SiteFont): string {
  const name = font.family.replace(/ /g, '+');
  if (!font.italic && font.weights.length === 1 && font.weights[0] === 400) return name;
  if (!font.italic) return `${name}:wght@${font.weights.join(';')}`;
  const tuples = [...font.weights.map((w) => `0,${w}`), ...font.weights.map((w) => `1,${w}`)];
  return `${name}:ital,wght@${tuples.join(';')}`;
}

/** One Google Fonts stylesheet for the fonts next/font doesn't already load; null when there are none. */
export function googleFontsHref(fonts: SiteFont[]): string | null {
  const seen = new Set<string>();
  const params: string[] = [];
  for (const font of fonts) {
    if (font.cssVar || seen.has(font.id)) continue;
    seen.add(font.id);
    params.push(`family=${familyParam(font)}`);
  }
  return params.length ? `https://fonts.googleapis.com/css2?${params.join('&')}&display=swap` : null;
}

/** The stylesheet for the fonts the owner picked; null for a site without Style choices. */
export function siteFontsHref(site: FontSite): string | null {
  const picked = [fontById(site.style?.headingFont), fontById(site.style?.bodyFont)].filter((f): f is SiteFont => !!f);
  return googleFontsHref(picked);
}

/** The regular weight, subset to the letters of the font's name, to draw that name in the picker. */
export function previewFontHref(font: SiteFont): string | null {
  return font.cssVar ? null : `https://fonts.googleapis.com/css2?family=${font.family.replace(/ /g, '+')}&text=${encodeURIComponent(font.name)}&display=swap`;
}

/** The family share images draw the headline in: the Style choice, else Instrument Serif (as before Style existed). */
export function ogHeadingFamily(site: FontSite): string {
  return fontById(site.style?.headingFont)?.family ?? 'Instrument Serif';
}
