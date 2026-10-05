import { spotifyCredentials } from '@/lib/addons/config';
import { mayConnectSpotify } from '@/lib/auth/owner';
import { readConnection, saveConnection } from '@/lib/spotify/tokenStore';

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>${title}</title><body style="font:16px system-ui;max-width:640px;margin:48px auto;padding:0 16px;line-height:1.5"><h1 style="font-size:22px">${title}</h1>${body}</body>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  );

/** Spotify sends the owner back here after they agree; the connection is saved for Now Playing. */
export async function GET(request: Request) {
  // Spotify's redirect is a cross-site navigation, so no Origin check here: the owner's session cookie (SameSite=Lax,
  // sent on top-level GETs) and the state cookie set by /api/spotify/login are what count. Nothing is saved without them.
  if (!(await mayConnectSpotify(request))) {
    return page('Sign in first', '<p>Only this site\u2019s owner can connect Spotify. <a href="/admin">Sign in</a>, then connect from Site settings \u2192 Add-ons.</p>', 401);
  }
  const credentials = await spotifyCredentials();
  if (!credentials) {
    return page('Spotify isn\u2019t set up', '<p>Add your Spotify Client ID and secret in Site settings \u2192 Add-ons first, then connect from there.</p>', 503);
  }
  const url = new URL(request.url);
  const cookieState = request.headers.get('cookie')?.match(/(?:^|;\s*)spotify_state=([a-f0-9]+)/)?.[1];
  const code = url.searchParams.get('code');
  if (!code || !cookieState || url.searchParams.get('state') !== cookieState) {
    return page('Spotify didn’t connect', `<p>${url.searchParams.get('error') ? 'Access was declined.' : 'The sign-in expired.'} <a href="/api/spotify/login">Try again</a>.</p>`, 400);
  }
  const { clientId, clientSecret } = credentials;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: new URL('/api/spotify/callback', request.url).toString() }),
    cache: 'no-store',
  });
  const tokens = res.ok ? ((await res.json()) as { access_token?: string; refresh_token?: string }) : null;
  if (!tokens?.access_token || !tokens.refresh_token) return page('Spotify didn’t connect', '<p>Spotify didn’t accept the sign-in. <a href="/api/spotify/login">Try again</a>.</p>', 400);

  // Whose account is this? Once connected, only the same Spotify account can reconnect.
  const me = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: 'no-store' });
  const spotifyUserId = me.ok ? ((await me.json()) as { id?: string }).id : undefined;
  if (!spotifyUserId) return page('Spotify didn’t connect', '<p>Couldn’t read your Spotify account. <a href="/api/spotify/login">Try again</a>.</p>', 400);
  const existing = await readConnection().catch(() => null);
  if (existing && existing.spotifyUserId !== spotifyUserId) return page('Not this account', '<p>This site is connected to a different Spotify account.</p>', 403);

  try {
    await saveConnection({ refreshToken: tokens.refresh_token, spotifyUserId });
  } catch {
    return page('Spotify didn’t connect', '<p>Couldn’t save the connection. Try again in a minute.</p>', 500);
  }
  return page('Spotify is connected 🎵', '<p>Open Control Center on <a href="/">your site</a> to see what you’re playing. Spotify asks you to reconnect about every 6 months — just visit this link again then.</p>');
}
