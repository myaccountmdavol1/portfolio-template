import { randomBytes } from 'node:crypto';
import { spotifyCredentials } from '@/lib/addons/config';
import { isCrossSite } from '@/lib/auth/http';
import { mayConnectSpotify, vercelStore } from '@/lib/auth/owner';
import { SPOTIFY_SCOPES } from '@/lib/spotify/nowPlaying';

const text = (status: number, body: string) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });

/** One-time setup: sends the owner to Spotify to allow Now Playing. */
export async function GET(request: Request) {
  // Vercel-backend sites: only the signed-in owner, from this site (the Add-ons card's link). Firebase sites keep
  // the old rule: the connection already exists there, and a different Spotify account is refused at the callback.
  if (vercelStore()) {
    if (isCrossSite(request)) return text(403, 'This request came from another site.');
    if (!(await mayConnectSpotify(request))) return Response.redirect(new URL('/admin', request.url), 302);
  }
  const credentials = await spotifyCredentials();
  if (!credentials) {
    return text(
      503,
      vercelStore()
        ? 'Spotify isn\u2019t set up yet. Add your Client ID and secret in Site settings \u2192 Add-ons first.'
        : 'Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to the site\u2019s environment variables first.',
    );
  }
  const state = randomBytes(16).toString('hex');
  const redirect = new URL('/api/spotify/callback', request.url).toString();
  const url = `https://accounts.spotify.com/authorize?${new URLSearchParams({ response_type: 'code', client_id: credentials.clientId, scope: SPOTIFY_SCOPES, redirect_uri: redirect, state })}`;
  return new Response(null, {
    status: 302,
    headers: { Location: url, 'Set-Cookie': `spotify_state=${state}; Path=/api/spotify; HttpOnly; Secure; SameSite=Lax; Max-Age=600` },
  });
}
