import { describe, expect, it } from 'vitest';
import { monthGrid, osmEmbedUrl } from './maps';

describe('osmEmbedUrl', () => {
  it('centres a bounding box on the point with a marker', () => {
    const url = new URL(osmEmbedUrl(40.7, -74, 0.1));
    expect(url.hostname).toBe('www.openstreetmap.org');
    expect(url.searchParams.get('marker')).toBe('40.7,-74');
    expect(url.searchParams.get('bbox')).toBe('-74.10000,40.64000,-73.90000,40.76000');
  });
});

describe('monthGrid', () => {
  it('pads to the first weekday and counts the days', () => {
    const sept2026 = monthGrid(2026, 8); // Sep 1, 2026 is a Tuesday
    expect(sept2026.slice(0, 3)).toEqual([null, null, 1]);
    expect(sept2026.filter(Boolean)).toHaveLength(30);
  });
});
