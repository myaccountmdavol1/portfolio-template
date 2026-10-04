import { photoAlbums } from '../deepLink';
import { asRecord, visibleApps, type ScreensaverModule } from './module';
import type { SiteData } from '../types';

export interface MemoriesSettings {
  album: string | null; // null = the first album with photos
}

export const MAX_MEMORIES = 20;

const albumsOf = (site: SiteData) => visibleApps(site).flatMap((a) => (a.type === 'photos' ? photoAlbums(a.content) : []));

/** Album names with at least one uploaded photo (for the editor's picker). */
export function memoriesAlbums(site: SiteData): string[] {
  return [...new Set(albumsOf(site).map((a) => a.name))];
}

/** The photos Memories shows: the chosen album, or the first one with photos if it's gone. */
export function memoriesPhotos(site: SiteData, s: MemoriesSettings): { url: string; caption: string }[] {
  const albums = albumsOf(site);
  const chosen = (s.album !== null ? albums.find((a) => a.name === s.album) : undefined) ?? albums[0];
  return (chosen?.photos ?? []).slice(0, MAX_MEMORIES).map((p) => ({ url: p.url, caption: p.caption }));
}

export const memories: ScreensaverModule<MemoriesSettings> = {
  id: 'memories',
  name: 'Memories',
  emptyNote: 'add photos to a Photos app.',
  defaults: () => ({ album: null }),
  read: (_site, raw) => {
    const album = asRecord(raw).album;
    return { album: typeof album === 'string' ? album : null };
  },
  available: (site, s) => memoriesPhotos(site, s).length > 0,
};
