import type { ControlCenterTile, SiteSettings } from './types';

/** Every Control Center tile, in the order it's shown, with the editor's label. */
export const CONTROL_CENTER_TILES: [ControlCenterTile, string][] = [
  ['darkMode', 'Dark Mode'],
  ['airdrop', 'AirDrop (share my site)'],
  ['nightShift', 'Night Shift'],
  ['focus', 'Focus (silences the incoming call)'],
  ['nowPlaying', 'Now Playing (Spotify)'],
  ['display', 'Display brightness'],
];

/** The tiles visitors see. A hidden tile's effect is off too (no Night Shift or Focus stuck on). */
export function shownTiles(site: Pick<SiteSettings, 'controlCenter' | 'nowPlaying'>): Set<ControlCenterTile> {
  const hide = new Set(site.controlCenter?.hide ?? []);
  if (site.nowPlaying === false) hide.add('nowPlaying');
  return new Set(CONTROL_CENTER_TILES.map(([t]) => t).filter((t) => !hide.has(t)));
}
