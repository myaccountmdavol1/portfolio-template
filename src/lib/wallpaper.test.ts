import { describe, expect, it } from 'vitest';
import type { WallpaperPreset } from './types';
import { sizedImageUrl, WALLPAPER_PRESETS, wallpaperStyle } from './wallpaper';

describe('wallpaperStyle', () => {
  it('returns the preset style', () => {
    expect(wallpaperStyle({ kind: 'preset', preset: 'dusk' })).toEqual(WALLPAPER_PRESETS.dusk);
  });

  it('falls back to sky for an unknown preset', () => {
    expect(wallpaperStyle({ kind: 'preset', preset: 'nope' as WallpaperPreset })).toEqual(WALLPAPER_PRESETS.sky);
  });

  it('uses a quoted, escaped url() for images with white labels', () => {
    const style = wallpaperStyle({ kind: 'image', imageUrl: 'https://x.com/a"b.jpg' });
    expect(style.background).toContain('url("https://x.com/a\\"b.jpg")');
    expect(style.background).toContain('center / cover no-repeat');
    expect(style.labelInk).toBe('#ffffff');
    expect(style.ink).toBe('#ffffff'); // unmeasured photos default to white text
  });
});

describe('wallpaperStyle in Dark Mode', () => {
  it('uses the night version of a preset, with light text', async () => {
    const { DARK_WALLPAPER_PRESETS } = await import('./wallpaper');
    expect(wallpaperStyle({ kind: 'preset', preset: 'sky' }, true)).toEqual(DARK_WALLPAPER_PRESETS.sky);
    expect(wallpaperStyle({ kind: 'preset', preset: 'paper' }, true).ink).toBe('#efeae1');
  });

  it('dims a custom image', () => {
    expect(wallpaperStyle({ kind: 'image', imageUrl: 'https://x.com/a.jpg' }, true).background).toMatch(/^linear-gradient\(rgba\(0,0,0,.4\)/);
  });
});

describe('sizedImageUrl', () => {
  it('optimizes Vercel Blob photos', () => {
    expect(sizedImageUrl('https://abc123.public.blob.vercel-storage.com/images/1-a.png', 1080)).toBe(
      '/_next/image?url=https%3A%2F%2Fabc123.public.blob.vercel-storage.com%2Fimages%2F1-a.png&w=1080&q=75',
    );
  });
});
