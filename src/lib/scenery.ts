// Scenery wallpapers: openly licensed photos in public/wallpapers, credited per file in
// public/wallpapers/LICENSE.md and credits.json (src/lib/scenery.test.ts checks both).
// Add a photo only with a verified CC0, public-domain, Unsplash or Pexels licence.

export interface SceneryPhoto {
  id: string;
  label: string;
  /** How bright the photo is: 'light' gets dark text, 'dark' gets white text. */
  tone: 'light' | 'dark';
}

export const SCENERY = [
  { id: 'mountain-lake', label: 'Mountain lake', tone: 'dark' },
  { id: 'coastline', label: 'Coastline', tone: 'dark' },
  { id: 'desert-dunes', label: 'Desert dunes', tone: 'dark' },
  { id: 'meadow', label: 'Meadow', tone: 'light' },
  { id: 'night-sky', label: 'Night sky', tone: 'dark' },
] as const satisfies readonly SceneryPhoto[];

export type SceneryId = (typeof SCENERY)[number]['id'];

export function sceneryUrl(id: string): string {
  return `/wallpapers/${id}.webp`;
}

export function sceneryThumbUrl(id: string): string {
  return `/wallpapers/${id}-thumb.webp`;
}
