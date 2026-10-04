import { getStore } from '../store';
import type { SpotifyConnection } from '../store/types';

// Server-only. The Spotify connection lives in the site's storage (Firestore `private/spotify` on Firebase,
// closed to every browser), so connecting — and reconnecting when Spotify's 180-day token runs out — needs no copying.

export type { SpotifyConnection } from '../store/types';

export async function readConnection(): Promise<SpotifyConnection | null> {
  return (await getStore()?.spotify.read()) ?? null;
}

function requireStore() {
  const store = getStore();
  if (!store) throw new Error('No storage is set up on this site.');
  return store;
}

export async function saveConnection(connection: Omit<SpotifyConnection, 'updatedAt'>): Promise<void> {
  await requireStore().spotify.save(connection);
}

/** Spotify may hand back a new refresh token when refreshing; keep the newest. */
export async function rotateRefreshToken(refreshToken: string): Promise<void> {
  await requireStore().spotify.rotate(refreshToken);
}
