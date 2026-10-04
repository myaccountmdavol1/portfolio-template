import type { SiteSettings, WallpaperPreset } from './types';

export interface WallpaperStyle {
  background: string; // value for the CSS `background` shorthand
  ink: string; // text colour for the menu bar, headline, and phone status bar/labels
  menuBg: string; // translucent menu bar background
  labelBg: string; // background behind desktop icon labels
  labelInk: string; // desktop icon label text colour
  /** Soft shadow behind text drawn straight on a photo (like iOS), so it stays readable. */
  inkShadow?: string;
}

const LIGHT_TEXT_SHADOW = '0 1px 3px rgba(0,0,0,.55), 0 0 1px rgba(0,0,0,.4)';
const DARK_TEXT_SHADOW = '0 1px 2px rgba(255,255,255,.55)';

export const WALLPAPER_PRESETS: Record<WallpaperPreset, WallpaperStyle> = {
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
};

/** Night versions of each preset, used in Dark Mode. */
export const DARK_WALLPAPER_PRESETS: Record<WallpaperPreset, WallpaperStyle> = {
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
  dusk: WALLPAPER_PRESETS.dusk,
};

// Uploaded photos (Firebase Storage or Vercel Blob, allowed in next.config images) go through Next's image optimizer:
// resized for the screen and re-encoded (WebP), so a multi-megabyte camera photo doesn't hold up the page.
const OPTIMIZABLE = /^https:\/\/(firebasestorage\.googleapis\.com|[a-z0-9-]+\.firebasestorage\.app|[a-z0-9]+\.public\.blob\.vercel-storage\.com)\//;

/** `width` must be one of next.config's image deviceSizes (defaults include 1080 and 2048). */
export function sizedImageUrl(url: string, width: number): string {
  return OPTIMIZABLE.test(url) ? `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75` : url;
}

export function wallpaperStyle(wallpaper: SiteSettings['wallpaper'], dark = false, width = 2048): WallpaperStyle {
  if (wallpaper.kind === 'preset') {
    const presets = dark ? DARK_WALLPAPER_PRESETS : WALLPAPER_PRESETS;
    return presets[wallpaper.preset] ?? presets.sky;
  }
  wallpaper = { ...wallpaper, imageUrl: sizedImageUrl(wallpaper.imageUrl, width) };
  if (dark) {
    return {
      background: `linear-gradient(rgba(0,0,0,.4), rgba(0,0,0,.4)), #111 url(${JSON.stringify(wallpaper.imageUrl)}) center / cover no-repeat`,
      ink: '#f2efe9',
      menuBg: 'rgba(20,20,24,.55)',
      labelBg: 'rgba(0,0,0,.45)',
      labelInk: '#ffffff',
      inkShadow: LIGHT_TEXT_SHADOW,
    };
  }
  // JSON.stringify gives a double-quoted string with " and \ escaped, which is also a valid CSS string.
  const background = `#2a2a2a url(${JSON.stringify(wallpaper.imageUrl)}) center / cover no-repeat`;
  if (wallpaper.tone === 'light') {
    // A bright photo: dark text, with a faint light halo.
    return { background, ink: '#1d1c1a', menuBg: 'rgba(255,255,255,.55)', labelBg: 'rgba(255,255,255,.55)', labelInk: '#1d1c1a', inkShadow: DARK_TEXT_SHADOW };
  }
  // A dark photo — or one we haven't measured: white text with a soft shadow reads on almost anything (iOS does this).
  return { background, ink: '#ffffff', menuBg: 'rgba(255,255,255,.55)', labelBg: 'rgba(0,0,0,.35)', labelInk: '#ffffff', inkShadow: LIGHT_TEXT_SHADOW };
}
