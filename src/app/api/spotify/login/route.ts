import { randomBytes } from 'node:crypto';
import { SPOTIFY_SCOPES } from '@/lib/spotify/nowPlaying';

/** One-time setup: sends the owner to Spotify to allow “Now Playing”. */
export async function GET(request: Request) {
  const id = process.env.SPOTIFY_CLIENT_ID;
  if (!id) return new Response('Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to the site’s environment variables first.', { status: 503 });
  const state = randomBytes(16).toString('hex');
  const redirect = new URL('/api/spotify/callback', request.url).toString();
  const url = `https://accounts.spotify.com/authorize?${new URLSearchParams({ response_type: 'code', client_id: id, scope: SPOTIFY_SCOPES, redirect_uri: redirect, state })}`;
  return new Response(null, {
    status: 302,
    headers: { Location: url, 'Set-Cookie': `spotify_state=${state}; Path=/api/spotify; HttpOnly; Secure; SameSite=Lax; Max-Age=600` },
  });
}
