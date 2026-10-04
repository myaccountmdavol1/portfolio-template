import { parseCurrentlyPlaying, parseRecentlyPlayed, type NowPlaying } from '@/lib/spotify/nowPlaying';
import { readConnection, rotateRefreshToken } from '@/lib/spotify/tokenStore';

// Shared by every visitor for 30 seconds, so Spotify is asked at most twice a minute.
const json = (body: unknown) => Response.json(body, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } });

async function accessToken(): Promise<string | null> {
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) return null;
  // Saved by /api/spotify/callback; SPOTIFY_REFRESH_TOKEN still works as a manual fallback.
  const saved = await readConnection().catch(() => null);
  const refresh = saved?.refreshToken ?? process.env.SPOTIFY_REFRESH_TOKEN;
  if (!refresh) return null;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (saved && body.refresh_token && body.refresh_token !== refresh) await rotateRefreshToken(body.refresh_token).catch(() => {});
  return body.access_token ?? null;
}

/** What the owner is playing on Spotify now, or the last thing they played. */
export async function GET() {
  const token = await accessToken().catch(() => null);
  if (!token) return json({ configured: false });
  const headers = { Authorization: `Bearer ${token}` };
  try {
    let track: NowPlaying | null = null;
    const now = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers, cache: 'no-store' });
    if (now.status === 200) track = parseCurrentlyPlaying(await now.json());
    if (!track) {
      const recent = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', { headers, cache: 'no-store' });
      if (recent.ok) track = parseRecentlyPlayed(await recent.json());
    }
    return json({ configured: true, track });
  } catch {
    return json({ configured: true, track: null });
  }
}
