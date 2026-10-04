import { SCENERY, type SceneryPhoto, sceneryThumbUrl, sceneryUrl } from './scenery';
import type { SiteSettings, WallpaperPattern, WallpaperPreset } from './types';

export interface WallpaperStyle {
  background: string; // value for the CSS `background` shorthand
  ink: string; // text colour for the menu bar, headline, and phone status bar/labels
  menuBg: string; // translucent menu bar background
  labelBg: string; // background behind desktop icon labels
  labelInk: string; // desktop icon label text colour
  /** Soft shadow behind text drawn straight on a photo (like iOS), so it stays readable. */
  inkShadow?: string;
}

export type WallpaperGroup = 'colours' | 'patterns' | 'classroom' | 'scenery';

export const WALLPAPER_GROUPS: { id: WallpaperGroup; label: string }[] = [
  { id: 'colours', label: 'Gradients & colours' },
  { id: 'patterns', label: 'Patterns' },
  { id: 'classroom', label: 'Classroom' },
  { id: 'scenery', label: 'Scenery' },
];

const LIGHT_TEXT_SHADOW = '0 1px 3px rgba(0,0,0,.55), 0 0 1px rgba(0,0,0,.4)';
const DARK_TEXT_SHADOW = '0 1px 2px rgba(255,255,255,.55)';
const INK = '#1d1c1a';
const NIGHT_INK = '#f2efe9';

/** Dark text on a light wallpaper. */
function onLight(background: string, labelBg = 'transparent', ink = INK, menuBg = 'rgba(255,255,255,.55)'): WallpaperStyle {
  return { background, ink, menuBg, labelBg, labelInk: ink };
}

/** Light text on a dark wallpaper (the same in Dark Mode). */
function onDark(background: string, labelBg = 'transparent', ink = NIGHT_INK): WallpaperStyle {
  return { background, ink, menuBg: 'rgba(20,20,28,.45)', labelBg, labelInk: ink };
}

/** Dark Mode for a light wallpaper: the same picture dimmed, with light, shadowed text. */
function dimmed(style: WallpaperStyle): WallpaperStyle {
  return {
    background: `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.45)), ${style.background}`,
    ink: NIGHT_INK,
    menuBg: 'rgba(20,20,24,.55)',
    labelBg: 'rgba(0,0,0,.35)',
    labelInk: NIGHT_INK,
    inkShadow: LIGHT_TEXT_SHADOW,
  };
}

/** A photo (scenery or the owner's upload). `tone` = how bright it is; missing = treat as dark (white text). */
function photoStyle(url: string, tone: 'light' | 'dark' | undefined, dark: boolean): WallpaperStyle {
  // JSON.stringify gives a double-quoted string with " and \ escaped, which is also a valid CSS string.
  if (dark) {
    return {
      background: `linear-gradient(rgba(0,0,0,.4), rgba(0,0,0,.4)), #111 url(${JSON.stringify(url)}) center / cover no-repeat`,
      ink: '#f2efe9',
      menuBg: 'rgba(20,20,24,.55)',
      labelBg: 'rgba(0,0,0,.45)',
      labelInk: '#ffffff',
      inkShadow: LIGHT_TEXT_SHADOW,
    };
  }
  const background = `#2a2a2a url(${JSON.stringify(url)}) center / cover no-repeat`;
  if (tone === 'light') {
    // A bright photo: dark text, with a faint light halo.
    return { background, ink: '#1d1c1a', menuBg: 'rgba(255,255,255,.55)', labelBg: 'rgba(255,255,255,.55)', labelInk: '#1d1c1a', inkShadow: DARK_TEXT_SHADOW };
  }
  // A dark photo — or one we haven't measured: white text with a soft shadow reads on almost anything (iOS does this).
  return { background, ink: '#ffffff', menuBg: 'rgba(255,255,255,.55)', labelBg: 'rgba(0,0,0,.35)', labelInk: '#ffffff', inkShadow: LIGHT_TEXT_SHADOW };
}

// ---- patterns: a motif in the chosen colour over a pale (or, in Dark Mode, deep) tint of it ----

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `hex` moved `amount` (0–1) of the way towards `base`. */
function mix(hex: string, base: string, amount: number): string {
  const a = rgb(hex);
  const b = rgb(base);
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, '0')).join('')}`;
}

const PATTERN_ART: Record<WallpaperPattern, { color: string; art: (c: (alpha: number) => string) => string }> = {
  dots: { color: '#0a84ff', art: (c) => `radial-gradient(${c(0.35)} 2px, transparent 2.5px) 0 0 / 22px 22px` },
  stripes: { color: '#ff9f0a', art: (c) => `repeating-linear-gradient(45deg, ${c(0.18)} 0 14px, transparent 14px 28px)` },
  checks: { color: '#34c759', art: (c) => `conic-gradient(${c(0.16)} 25%, transparent 0 50%, ${c(0.16)} 0 75%, transparent 0) 0 0 / 48px 48px` },
  waves: { color: '#64d2ff', art: (c) => `radial-gradient(circle at 50% 0, transparent 13px, ${c(0.3)} 14px 16px, transparent 17px) 0 0 / 32px 18px` },
  confetti: {
    color: '#ff375f',
    art: (c) =>
      `radial-gradient(${c(0.45)} 2px, transparent 3px) 0 0 / 46px 46px, radial-gradient(${c(0.3)} 3px, transparent 4px) 17px 29px / 58px 58px, radial-gradient(${c(0.25)} 1.5px, transparent 2.5px) 31px 9px / 38px 38px`,
  },
  zigzag: {
    color: '#bf5af2',
    art: (c) =>
      `linear-gradient(135deg, ${c(0.2)} 25%, transparent 25%) -14px 0 / 28px 28px, linear-gradient(225deg, ${c(0.2)} 25%, transparent 25%) -14px 0 / 28px 28px, linear-gradient(315deg, ${c(0.2)} 25%, transparent 25%) 0 0 / 28px 28px, linear-gradient(45deg, ${c(0.2)} 25%, transparent 25%) 0 0 / 28px 28px`,
  },
};

const PATTERN_IDS = Object.keys(PATTERN_ART) as WallpaperPattern[];

export const PATTERN_SWATCHES: { color: string; label: string }[] = [
  { color: '#0a84ff', label: 'Blue' },
  { color: '#34c759', label: 'Green' },
  { color: '#ff9f0a', label: 'Orange' },
  { color: '#ff375f', label: 'Pink' },
  { color: '#bf5af2', label: 'Purple' },
  { color: '#5e5ce6', label: 'Indigo' },
  { color: '#64d2ff', label: 'Teal' },
  { color: '#8e8e93', label: 'Grey' },
];

/** Own keys only, so ids like 'toString' never match (and no Object.hasOwn, for older Safari). */
function has(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

export function isPattern(preset: string): preset is WallpaperPattern {
  return has(PATTERN_ART, preset);
}

/** The pattern's colour: the stored one if it is a #rrggbb hex (it ends up in CSS), else the pattern's own. */
export function patternColor(preset: string, color?: string): string {
  if (color && /^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  return isPattern(preset) ? PATTERN_ART[preset].color : '#0a84ff';
}

export function patternStyle(preset: WallpaperPattern, color: string | undefined, dark: boolean): WallpaperStyle {
  const c = patternColor(preset, color);
  const [r, g, b] = rgb(c);
  const art = PATTERN_ART[preset].art((alpha) => `rgba(${r},${g},${b},${alpha})`);
  if (dark) {
    return { background: `${art}, ${mix(c, '#141414', 0.85)}`, ink: NIGHT_INK, menuBg: 'rgba(20,20,24,.55)', labelBg: 'rgba(20,20,24,.6)', labelInk: NIGHT_INK };
  }
  return { background: `${art}, ${mix(c, '#ffffff', 0.86)}`, ink: INK, menuBg: 'rgba(255,255,255,.6)', labelBg: 'rgba(255,255,255,.75)', labelInk: INK };
}

// ---- everything else: one light style each, and a Dark Mode version ----

// Widened: while SCENERY is empty its element type is `never`, which breaks .map/.some on it.
const PHOTOS: readonly SceneryPhoto[] = SCENERY;

type FixedPreset = Exclude<WallpaperPreset, WallpaperPattern | (typeof SCENERY)[number]['id']>;

const LIGHT: Record<FixedPreset, WallpaperStyle> = {
  // The originals, unchanged.
  sky: {
    background: 'linear-gradient(180deg, #bfe3f7 0%, #e3f2fb 60%, #f4f9fc 100%)',
    ink: '#1d1c1a',
    menuBg: 'rgba(255,255,255,.55)',
    labelBg: 'transparent',
    labelInk: '#1d1c1a',
  },
  paper: {
    background: '#ebe7df',
    ink: '#1d1c1a',
    menuBg: 'rgba(251,250,247,.6)',
    labelBg: 'transparent',
    labelInk: '#1d1c1a',
  },
  grid: {
    background:
      'linear-gradient(rgba(0,0,0,.06) 1px, transparent 1px) 0 0 / 28px 28px, linear-gradient(90deg, rgba(0,0,0,.06) 1px, transparent 1px) 0 0 / 28px 28px, #f3f1ec',
    ink: '#1d1c1a',
    menuBg: 'rgba(251,250,247,.7)',
    labelBg: 'rgba(243,241,236,.85)',
    labelInk: '#1d1c1a',
  },
  dusk: {
    background: 'linear-gradient(180deg, #2b2f45 0%, #1c1f2e 100%)',
    ink: '#f2efe9',
    menuBg: 'rgba(20,20,28,.45)',
    labelBg: 'transparent',
    labelInk: '#f2efe9',
  },
  // Gradients & colours: five light, five dark.
  sunrise: onLight('linear-gradient(180deg, #ffd8b8 0%, #ffc2c7 55%, #f9e1ef 100%)'),
  mint: onLight('linear-gradient(180deg, #c9f2e1 0%, #e6f8f0 60%, #f6fcf9 100%)'),
  lavender: onLight('linear-gradient(180deg, #ddd5fb 0%, #ece8fd 60%, #f8f6ff 100%)'),
  lemon: onLight('linear-gradient(180deg, #fff1a8 0%, #fff7d1 60%, #fffcef 100%)'),
  blush: onLight('#f4e1dc'),
  midnight: onDark('linear-gradient(180deg, #0b1026 0%, #141b3c 100%)'),
  aurora: onDark('linear-gradient(160deg, #0f2e2e 0%, #1d3b4f 45%, #3a2559 100%)'),
  evergreen: onDark('linear-gradient(180deg, #13261c 0%, #1e3a2b 100%)'),
  ember: onDark('linear-gradient(180deg, #2a1414 0%, #4a1f17 100%)'),
  graphite: onDark('#2b2b2e'),
  // Classroom.
  chalkboard: onDark('radial-gradient(ellipse at 50% 40%, rgba(255,255,255,.07), transparent 70%), linear-gradient(180deg, #2f4a3a 0%, #263d30 100%)', 'transparent', '#f4f1e8'),
  notebook: onLight(
    'linear-gradient(90deg, transparent 79px, rgba(220,80,80,.55) 79px, rgba(220,80,80,.55) 81px, transparent 81px), repeating-linear-gradient(180deg, transparent 0 31px, rgba(80,130,200,.35) 31px 32px), #fdfcf7',
    'rgba(253,252,247,.85)',
  ),
  corkboard: onLight(
    'radial-gradient(rgba(90,55,20,.25) 1px, transparent 1.5px) 0 0 / 9px 9px, radial-gradient(rgba(255,240,210,.25) 1px, transparent 1.5px) 4px 5px / 11px 11px, #c79a62',
    'rgba(255,248,235,.8)',
    '#2b1d0e',
    'rgba(255,248,235,.55)',
  ),
  blueprint: onDark(
    'linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px) 0 0 / 24px 24px, #1f4e8c',
    'rgba(31,78,140,.85)',
    '#eef4ff',
  ),
  whiteboard: onLight('radial-gradient(ellipse at 30% 20%, #ffffff 0%, #f1f3f4 60%, #e4e7e9 100%)'),
};

/** Night versions: the originals keep their own; dark wallpapers stay as they are; light ones are dimmed. */
const DARK: Record<FixedPreset, WallpaperStyle> = {
  sky: {
    background: 'linear-gradient(180deg, #0f2240 0%, #1a2f52 60%, #25375a 100%)',
    ink: '#eef2f8',
    menuBg: 'rgba(20,24,36,.55)',
    labelBg: 'transparent',
    labelInk: '#eef2f8',
  },
  paper: {
    background: '#23211e',
    ink: '#efeae1',
    menuBg: 'rgba(30,28,26,.6)',
    labelBg: 'transparent',
    labelInk: '#efeae1',
  },
  grid: {
    background:
      'linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px) 0 0 / 28px 28px, linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px) 0 0 / 28px 28px, #1d1c1a',
    ink: '#efeae1',
    menuBg: 'rgba(29,28,26,.7)',
    labelBg: 'rgba(29,28,26,.85)',
    labelInk: '#efeae1',
  },
  dusk: LIGHT.dusk,
  sunrise: dimmed(LIGHT.sunrise),
  mint: dimmed(LIGHT.mint),
  lavender: dimmed(LIGHT.lavender),
  lemon: dimmed(LIGHT.lemon),
  blush: dimmed(LIGHT.blush),
  midnight: LIGHT.midnight,
  aurora: LIGHT.aurora,
  evergreen: LIGHT.evergreen,
  ember: LIGHT.ember,
  graphite: LIGHT.graphite,
  chalkboard: LIGHT.chalkboard,
  notebook: dimmed(LIGHT.notebook),
  corkboard: dimmed(LIGHT.corkboard),
  blueprint: LIGHT.blueprint,
  whiteboard: dimmed(LIGHT.whiteboard),
};

/** Every built-in wallpaper, in picker order. */
export const WALLPAPER_CATALOG: { id: WallpaperPreset; label: string; group: WallpaperGroup }[] = [
  { id: 'sky', label: 'Sky', group: 'colours' },
  { id: 'paper', label: 'Paper', group: 'colours' },
  { id: 'dusk', label: 'Dusk', group: 'colours' },
  { id: 'sunrise', label: 'Sunrise', group: 'colours' },
  { id: 'mint', label: 'Mint', group: 'colours' },
  { id: 'lavender', label: 'Lavender', group: 'colours' },
  { id: 'lemon', label: 'Lemon', group: 'colours' },
  { id: 'blush', label: 'Blush', group: 'colours' },
  { id: 'midnight', label: 'Midnight', group: 'colours' },
  { id: 'aurora', label: 'Aurora', group: 'colours' },
  { id: 'evergreen', label: 'Evergreen', group: 'colours' },
  { id: 'ember', label: 'Ember', group: 'colours' },
  { id: 'graphite', label: 'Graphite', group: 'colours' },
  { id: 'dots', label: 'Dots', group: 'patterns' },
  { id: 'stripes', label: 'Stripes', group: 'patterns' },
  { id: 'checks', label: 'Checks', group: 'patterns' },
  { id: 'waves', label: 'Waves', group: 'patterns' },
  { id: 'confetti', label: 'Confetti', group: 'patterns' },
  { id: 'zigzag', label: 'Zigzag', group: 'patterns' },
  { id: 'chalkboard', label: 'Chalkboard', group: 'classroom' },
  { id: 'notebook', label: 'Notebook paper', group: 'classroom' },
  { id: 'corkboard', label: 'Corkboard', group: 'classroom' },
  { id: 'grid', label: 'Grid', group: 'classroom' },
  { id: 'blueprint', label: 'Blueprint', group: 'classroom' },
  { id: 'whiteboard', label: 'Whiteboard', group: 'classroom' },
  ...PHOTOS.map((p) => ({ id: p.id as WallpaperPreset, label: p.label, group: 'scenery' as const })),
];

export const WALLPAPER_PRESETS = {
  ...LIGHT,
  ...Object.fromEntries(PATTERN_IDS.map((id) => [id, patternStyle(id, undefined, false)])),
  ...Object.fromEntries(PHOTOS.map((p) => [p.id, photoStyle(sceneryUrl(p.id), p.tone, false)])),
} as Record<WallpaperPreset, WallpaperStyle>;

/** Night versions of each preset, used in Dark Mode. */
export const DARK_WALLPAPER_PRESETS = {
  ...DARK,
  ...Object.fromEntries(PATTERN_IDS.map((id) => [id, patternStyle(id, undefined, true)])),
  ...Object.fromEntries(PHOTOS.map((p) => [p.id, photoStyle(sceneryUrl(p.id), p.tone, true)])),
} as Record<WallpaperPreset, WallpaperStyle>;

/** The picker's thumbnail: small files for photos, the chosen colour for patterns. */
export function wallpaperThumb(id: WallpaperPreset, color?: string): string {
  if (isPattern(id)) return patternStyle(id, color, false).background;
  if (PHOTOS.some((p) => p.id === id)) return `#2a2a2a url(${JSON.stringify(sceneryThumbUrl(id))}) center / cover no-repeat`;
  return (has(WALLPAPER_PRESETS, id) ? WALLPAPER_PRESETS[id] : WALLPAPER_PRESETS.sky).background;
}

// Uploaded photos (Firebase Storage or Vercel Blob, allowed in next.config images) go through Next's image optimizer:
// resized for the screen and re-encoded (WebP), so a multi-megabyte camera photo doesn't hold up the page.
const OPTIMIZABLE = /^https:\/\/(firebasestorage\.googleapis\.com|[a-z0-9-]+\.firebasestorage\.app|[a-z0-9]+\.public\.blob\.vercel-storage\.com)\//;

/** `width` must be one of next.config's image deviceSizes (defaults include 1080 and 2048). */
export function sizedImageUrl(url: string, width: number): string {
  return OPTIMIZABLE.test(url) ? `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75` : url;
}

export function wallpaperStyle(wallpaper: SiteSettings['wallpaper'], dark = false, width = 2048): WallpaperStyle {
  if (wallpaper.kind === 'preset') {
    if (isPattern(wallpaper.preset)) return patternStyle(wallpaper.preset, wallpaper.color, dark);
    const presets = dark ? DARK_WALLPAPER_PRESETS : WALLPAPER_PRESETS;
    return has(presets, wallpaper.preset) ? presets[wallpaper.preset] : presets.sky;
  }
  return photoStyle(sizedImageUrl(wallpaper.imageUrl, width), wallpaper.tone, dark);
}
