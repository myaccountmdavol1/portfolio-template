import { describe, expect, it } from 'vitest';
import { shownTiles } from './controlCenter';

describe('Control Center tiles', () => {
  it('shows every tile by default', () => {
    expect(shownTiles({}).size).toBe(6);
  });

  it('leaves out switched-off tiles, including the older Now Playing switch', () => {
    const tiles = shownTiles({ controlCenter: { hide: ['focus', 'airdrop'] }, nowPlaying: false });
    expect([...tiles]).toEqual(['darkMode', 'nightShift', 'display']);
  });
});
