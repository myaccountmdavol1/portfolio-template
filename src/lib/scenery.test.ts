import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SCENERY, type SceneryPhoto } from './scenery';
import type { WallpaperPreset } from './types';
import { DARK_WALLPAPER_PRESETS, WALLPAPER_PRESETS } from './wallpaper';

const DIR = 'public/wallpapers';
const ALLOWED = ['CC0-1.0', 'Public Domain', 'Unsplash License', 'Pexels License'];

interface Credit {
  file: string;
  title: string;
  author: string;
  source: string;
  license: string;
  licenseUrl: string;
  verifiedOn: string;
}

const photos = SCENERY as readonly SceneryPhoto[];
const credits: Credit[] = existsSync(`${DIR}/credits.json`) ? JSON.parse(readFileSync(`${DIR}/credits.json`, 'utf8')) : [];
const licenseMd = existsSync(`${DIR}/LICENSE.md`) ? readFileSync(`${DIR}/LICENSE.md`, 'utf8') : '';

describe('scenery photos', () => {
  it('have unique kebab-case ids and labels', () => {
    expect(new Set(photos.map((p) => p.id)).size).toBe(photos.length);
    expect(new Set(photos.map((p) => p.label)).size).toBe(photos.length);
    for (const p of photos) expect(p.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('each ship a small wallpaper and a thumbnail', () => {
    for (const p of photos) {
      expect(statSync(`${DIR}/${p.id}.webp`).size, p.id).toBeLessThanOrEqual(450 * 1024);
      expect(statSync(`${DIR}/${p.id}-thumb.webp`).size, p.id).toBeLessThanOrEqual(40 * 1024);
    }
  });

  it('each have a verified, allowed licence record', () => {
    for (const p of photos) {
      const credit = credits.find((c) => c.file === `${p.id}.webp`);
      expect(credit, p.id).toBeDefined();
      expect(ALLOWED, p.id).toContain(credit!.license);
      expect(credit!.source, p.id).toMatch(/^https:\/\//);
      expect(credit!.licenseUrl, p.id).toMatch(/^https:\/\//);
      expect(credit!.author.trim(), p.id).not.toBe('');
      expect(credit!.title.trim(), p.id).not.toBe('');
      expect(credit!.verifiedOn, p.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(licenseMd, p.id).toContain(`${p.id}.webp`);
      expect(licenseMd, p.id).toContain(credit!.source);
    }
  });

  it('ship no unlisted files and no orphan credits', () => {
    const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f !== 'LICENSE.md' && f !== 'credits.json') : [];
    expect(files.sort()).toEqual(photos.flatMap((p) => [`${p.id}.webp`, `${p.id}-thumb.webp`]).sort());
    expect(credits.map((c) => c.file).sort()).toEqual(photos.map((p) => `${p.id}.webp`).sort());
  });

  it('are drawn with text that suits their tone, and dimmed in Dark Mode', () => {
    for (const p of photos) {
      const style = WALLPAPER_PRESETS[p.id as WallpaperPreset];
      expect(style.background).toContain(`url("/wallpapers/${p.id}.webp")`);
      expect(style.ink).toBe(p.tone === 'light' ? '#1d1c1a' : '#ffffff');
      expect(DARK_WALLPAPER_PRESETS[p.id as WallpaperPreset].background).toMatch(/^linear-gradient\(rgba\(0,0,0,.4\)/);
    }
  });
});
