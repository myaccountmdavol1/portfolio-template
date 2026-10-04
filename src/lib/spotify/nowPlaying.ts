// Spotify “Now Playing” for Control Center: what the owner is listening to right now, or last played.
// Needs SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REFRESH_TOKEN (see /api/spotify/login).

export interface NowPlaying {
  isPlaying: boolean;
  title: string;
  artist: string;
  albumArt?: string;
  url?: string;
  /** When it was last played (only when not playing now). ISO 8601. */
  playedAt?: string;
}

interface SpotifyTrack {
  name?: string;
  artists?: { name?: string }[];
  album?: { images?: { url?: string; width?: number }[] };
  external_urls?: { spotify?: string };
}

function fromTrack(track: SpotifyTrack | null | undefined, isPlaying: boolean, playedAt?: string): NowPlaying | null {
  if (!track?.name) return null;
  const images = [...(track.album?.images ?? [])].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  // The smallest cover that's still crisp at 2× in a 56px tile.
  const art = images.find((i) => (i.width ?? 0) >= 120) ?? images[images.length - 1];
  return {
    isPlaying,
    title: track.name,
    artist: (track.artists ?? []).map((a) => a.name).filter(Boolean).join(', '),
    albumArt: art?.url,
    url: track.external_urls?.spotify,
    ...(playedAt ? { playedAt } : {}),
  };
}

/** From GET /v1/me/player/currently-playing (null when nothing is playing, or an ad/podcast). */
export function parseCurrentlyPlaying(body: unknown): NowPlaying | null {
  const b = body as { is_playing?: boolean; currently_playing_type?: string; item?: SpotifyTrack } | null;
  if (!b || b.currently_playing_type !== 'track' || !b.is_playing) return null;
  return fromTrack(b.item, true);
}

/** From GET /v1/me/player/recently-played?limit=1. */
export function parseRecentlyPlayed(body: unknown): NowPlaying | null {
  const item = (body as { items?: { track?: SpotifyTrack; played_at?: string }[] } | null)?.items?.[0];
  return fromTrack(item?.track, false, item?.played_at);
}

export const SPOTIFY_SCOPES = 'user-read-currently-playing user-read-recently-played';
