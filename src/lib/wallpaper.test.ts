import { describe, expect, it } from 'vitest';
import { SCENERY } from './scenery';
import type { WallpaperPreset } from './types';
import {
  DARK_WALLPAPER_PRESETS,
  isPattern,
  PATTERN_SWATCHES,
  patternColor,
  patternStyle,
  sizedImageUrl,
  WALLPAPER_CATALOG,
  WALLPAPER_GROUPS,
  WALLPAPER_PRESETS,
  wallpaperStyle,
  wallpaperThumb,
} from './wallpaper';

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

describe('the original four presets', () => {
  it('look exactly as before, in light and dark', () => {
    expect(WALLPAPER_PRESETS.sky).toEqual({
      background: 'linear-gradient(180deg, #bfe3f7 0%, #e3f2fb 60%, #f4f9fc 100%)',
      ink: '#1d1c1a',
      menuBg: 'rgba(255,255,255,.55)',
      labelBg: 'transparent',
      labelInk: '#1d1c1a',
    });
    expect(WALLPAPER_PRESETS.paper).toEqual({ background: '#ebe7df', ink: '#1d1c1a', menuBg: 'rgba(251,250,247,.6)', labelBg: 'transparent', labelInk: '#1d1c1a' });
    expect(WALLPAPER_PRESETS.grid).toEqual({
      background:
        'linear-gradient(rgba(0,0,0,.06) 1px, transparent 1px) 0 0 / 28px 28px, linear-gradient(90deg, rgba(0,0,0,.06) 1px, transparent 1px) 0 0 / 28px 28px, #f3f1ec',
      ink: '#1d1c1a',
      menuBg: 'rgba(251,250,247,.7)',
      labelBg: 'rgba(243,241,236,.85)',
      labelInk: '#1d1c1a',
    });
    expect(WALLPAPER_PRESETS.dusk).toEqual({ background: 'linear-gradient(180deg, #2b2f45 0%, #1c1f2e 100%)', ink: '#f2efe9', menuBg: 'rgba(20,20,28,.45)', labelBg: 'transparent', labelInk: '#f2efe9' });
    expect(DARK_WALLPAPER_PRESETS.sky).toEqual({
      background: 'linear-gradient(180deg, #0f2240 0%, #1a2f52 60%, #25375a 100%)',
      ink: '#eef2f8',
      menuBg: 'rgba(20,24,36,.55)',
      labelBg: 'transparent',
      labelInk: '#eef2f8',
    });
    expect(DARK_WALLPAPER_PRESETS.paper).toEqual({ background: '#23211e', ink: '#efeae1', menuBg: 'rgba(30,28,26,.6)', labelBg: 'transparent', labelInk: '#efeae1' });
    expect(DARK_WALLPAPER_PRESETS.grid).toEqual({
      background:
        'linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px) 0 0 / 28px 28px, linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px) 0 0 / 28px 28px, #1d1c1a',
      ink: '#efeae1',
      menuBg: 'rgba(29,28,26,.7)',
      labelBg: 'rgba(29,28,26,.85)',
      labelInk: '#efeae1',
    });
    expect(DARK_WALLPAPER_PRESETS.dusk).toEqual(WALLPAPER_PRESETS.dusk);
  });

  it('keeps uploaded photos exactly as before', () => {
    expect(wallpaperStyle({ kind: 'image', imageUrl: 'https://x.com/a.jpg', tone: 'light' })).toEqual({
      background: '#2a2a2a url("https://x.com/a.jpg") center / cover no-repeat',
      ink: '#1d1c1a',
      menuBg: 'rgba(255,255,255,.55)',
      labelBg: 'rgba(255,255,255,.55)',
      labelInk: '#1d1c1a',
      inkShadow: '0 1px 2px rgba(255,255,255,.55)',
    });
    expect(wallpaperStyle({ kind: 'image', imageUrl: 'https://x.com/a.jpg' }, true)).toEqual({
      background: 'linear-gradient(rgba(0,0,0,.4), rgba(0,0,0,.4)), #111 url("https://x.com/a.jpg") center / cover no-repeat',
      ink: '#f2efe9',
      menuBg: 'rgba(20,20,24,.55)',
      labelBg: 'rgba(0,0,0,.45)',
      labelInk: '#ffffff',
      inkShadow: '0 1px 3px rgba(0,0,0,.55), 0 0 1px rgba(0,0,0,.4)',
    });
  });
});

describe('the wallpaper catalogue', () => {
  it('has unique ids, each in a known group', () => {
    const ids = WALLPAPER_CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(25 + SCENERY.length);
    const groups = new Set(WALLPAPER_GROUPS.map((g) => g.id));
    for (const p of WALLPAPER_CATALOG) expect(groups.has(p.group), p.id).toBe(true);
  });

  it('covers every preset, and every preset has text styles in light and dark', () => {
    const ids = WALLPAPER_CATALOG.map((p) => p.id).sort();
    expect(Object.keys(WALLPAPER_PRESETS).sort()).toEqual(ids);
    expect(Object.keys(DARK_WALLPAPER_PRESETS).sort()).toEqual(ids);
    for (const id of ids) {
      for (const style of [WALLPAPER_PRESETS[id], DARK_WALLPAPER_PRESETS[id]]) {
        for (const key of ['background', 'ink', 'menuBg', 'labelBg', 'labelInk'] as const) expect(style[key], `${id}.${key}`).toBeTruthy();
      }
    }
  });

  it('fills the colour, pattern and classroom groups', () => {
    const count = (group: string) => WALLPAPER_CATALOG.filter((p) => p.group === group).length;
    expect([count('colours'), count('patterns'), count('classroom'), count('scenery')]).toEqual([13, 6, 6, SCENERY.length]);
  });

  it('gives light wallpapers dark text and dark ones light text', () => {
    expect(WALLPAPER_PRESETS.lemon.ink).toBe('#1d1c1a');
    expect(WALLPAPER_PRESETS.midnight.ink).toBe('#f2efe9');
    expect(DARK_WALLPAPER_PRESETS.midnight).toEqual(WALLPAPER_PRESETS.midnight);
    expect(WALLPAPER_PRESETS.chalkboard.ink).toBe('#f4f1e8');
    expect(WALLPAPER_PRESETS.corkboard.ink).toBe('#2b1d0e');
    expect(DARK_WALLPAPER_PRESETS.notebook.background).toMatch(/^linear-gradient\(rgba\(0,0,0,.45\), rgba\(0,0,0,.45\)\), /);
    expect(DARK_WALLPAPER_PRESETS.notebook.ink).toBe('#f2efe9');
    expect(DARK_WALLPAPER_PRESETS.notebook.inkShadow).toBeTruthy();
  });
});

describe('patterns', () => {
  it('are recognised by id', () => {
    expect(isPattern('dots')).toBe(true);
    expect(isPattern('sky')).toBe(false);
    expect(isPattern('toString')).toBe(false);
  });

  it('tint with the chosen colour, else their own, and refuse anything but a hex colour', () => {
    expect(patternStyle('dots', undefined, false).background).toBe('radial-gradient(rgba(10,132,255,0.35) 2px, transparent 2.5px) 0 0 / 22px 22px, #ddeeff');
    expect(patternStyle('dots', '#FF375F', false).background).toContain('rgba(255,55,95,0.35)');
    expect(patternColor('dots', 'red; background: url(x)')).toBe('#0a84ff');
    expect(patternColor('dots', '#FF375F')).toBe('#ff375f');
    expect(patternColor('sky')).toBe('#0a84ff');
  });

  it('are drawn from the stored colour, light and dark', () => {
    expect(wallpaperStyle({ kind: 'preset', preset: 'stripes', color: '#34c759' })).toEqual(patternStyle('stripes', '#34c759', false));
    const night = wallpaperStyle({ kind: 'preset', preset: 'stripes', color: '#34c759' }, true);
    expect(night).toEqual(patternStyle('stripes', '#34c759', true));
    expect(night.ink).toBe('#f2efe9');
    expect(WALLPAPER_PRESETS.dots).toEqual(patternStyle('dots', undefined, false));
  });

  it('offer eight named swatches', () => {
    expect(PATTERN_SWATCHES).toHaveLength(8);
    expect(new Set(PATTERN_SWATCHES.map((s) => s.label)).size).toBe(8);
    for (const s of PATTERN_SWATCHES) expect(s.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(PATTERN_SWATCHES).toContainEqual({ color: '#ff375f', label: 'Pink' });
  });
});

describe('wallpaperThumb', () => {
  it('is the preset background, tinted for patterns', () => {
    expect(wallpaperThumb('sky')).toBe(WALLPAPER_PRESETS.sky.background);
    expect(wallpaperThumb('dots', '#ff375f')).toBe(patternStyle('dots', '#ff375f', false).background);
  });

  it('falls back to sky for an unknown id', () => {
    expect(wallpaperThumb('toString' as never)).toBe(WALLPAPER_PRESETS.sky.background);
  });
});
