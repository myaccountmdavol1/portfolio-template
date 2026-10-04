import { describe, expect, it } from 'vitest';
import { averageLuminance, toneForLuminance } from './tone';
import { wallpaperStyle } from './wallpaper';

const px = (r: number, g: number, b: number, n = 4, a = 255) => Array.from({ length: n }, () => [r, g, b, a]).flat();

describe('image tone', () => {
  it('measures brightness', () => {
    expect(averageLuminance(px(0, 0, 0))).toBe(0);
    expect(averageLuminance(px(255, 255, 255))).toBeCloseTo(1);
    expect(averageLuminance([...px(255, 255, 255, 1, 0), ...px(0, 0, 0, 1)])).toBe(0); // transparent pixels don't count
  });

  it('dark green wallpapers get white text; bright ones get dark text', () => {
    expect(toneForLuminance(averageLuminance(px(30, 60, 40)))).toBe('dark');
    expect(toneForLuminance(averageLuminance(px(240, 240, 230)))).toBe('light');
  });
});

describe('wallpaperStyle for photos', () => {
  it('uses white text with a shadow on dark or unmeasured photos', () => {
    for (const tone of [undefined, 'dark'] as const) {
      const s = wallpaperStyle({ kind: 'image', imageUrl: 'https://x/a.jpg', tone });
      expect(s.ink).toBe('#ffffff');
      expect(s.inkShadow).toBeTruthy();
    }
  });
  it('uses dark text on bright photos', () => {
    expect(wallpaperStyle({ kind: 'image', imageUrl: 'https://x/a.jpg', tone: 'light' }).ink).toBe('#1d1c1a');
  });
});

describe('sized wallpaper photos', async () => {
  const { sizedImageUrl } = await import('./wallpaper');
  it('sends uploaded photos through the image optimizer, and leaves others alone', () => {
    const up = 'https://firebasestorage.googleapis.com/v0/b/x.firebasestorage.app/o/images%2Fa.jpg?alt=media';
    expect(sizedImageUrl(up, 1080)).toBe(`/_next/image?url=${encodeURIComponent(up)}&w=1080&q=75`);
    expect(sizedImageUrl('data:image/png;base64,AA==', 1080)).toBe('data:image/png;base64,AA==');
    expect(sizedImageUrl('https://example.com/a.jpg', 1080)).toBe('https://example.com/a.jpg');
  });
});
