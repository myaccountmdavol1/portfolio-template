import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServerStore } from '@/lib/store/types';

const h = vi.hoisted(() => ({ store: null as ServerStore | null }));
vi.mock('@/lib/store', () => ({ getStore: () => h.store }));

const { ensureSchema } = await import('@/lib/store/postgres/schema');
const { pgliteSql } = await import('@/lib/store/postgres/sql');
const { postgresStore } = await import('@/lib/store/postgres/store');
const { claimOwner } = await import('@/lib/auth/owner');
const { encryptSecret } = await import('@/lib/addons/secrets');
const login = await import('./login/route');
const callback = await import('./callback/route');

const CODE = 'spotify-route-setup-code';
const sql = pgliteSql();
let owner = '';

/** Spotify, faked: the token exchange and /v1/me. */
const spotifyFetch = vi.fn(async (input: string | URL | Request) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url === 'https://accounts.spotify.com/api/token') return Response.json({ access_token: 'a', refresh_token: 'r' });
  if (url === 'https://api.spotify.com/v1/me') return Response.json({ id: 'someone' });
  throw new Error(`unexpected fetch ${url}`);
});

const get = (path: string, cookie = '', headers: Record<string, string> = {}) => new Request(`http://localhost${path}`, { headers: { cookie, ...headers } });
/** Spotify's redirect back, with the state cookie /api/spotify/login set. */
const back = (session = '') => get('/api/spotify/callback?code=c&state=abc123', [session, 'spotify_state=abc123'].filter(Boolean).join('; '));
const saveKeys = () => h.store!.addons.set({ spotify: { clientId: 'saved-client-id', clientSecret: encryptSecret('saved-secret', CODE) }, updatedAt: 'x' });

beforeEach(async () => {
  vi.stubEnv('SETUP_CODE', CODE);
  vi.stubEnv('SPOTIFY_CLIENT_ID', '');
  vi.stubEnv('SPOTIFY_CLIENT_SECRET', '');
  vi.stubGlobal('fetch', spotifyFetch);
  spotifyFetch.mockClear();
  h.store = postgresStore(sql);
  await ensureSchema(sql);
  await sql.query('truncate documents, versions, records, counters');
  const claimed = await claimOwner(h.store as never, { setupCode: CODE, password: 'a good password', visitorKey: 'v' }, CODE);
  if (!claimed.ok) throw new Error(claimed.error);
  owner = `portfolio_owner=${claimed.token}`;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Spotify sign-in on a Vercel-backend site', () => {
  it('sends a visitor to /admin, never to Spotify', async () => {
    await saveKeys();
    const res = await login.GET(get('/api/spotify/login'));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost/admin');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('refuses a cross-site start, even for the owner', async () => {
    await saveKeys();
    expect((await login.GET(get('/api/spotify/login', owner, { 'sec-fetch-site': 'cross-site' }))).status).toBe(403);
  });

  it('sends the owner to Spotify with the Client ID saved in Add-ons', async () => {
    await saveKeys();
    const res = await login.GET(get('/api/spotify/login', owner));
    expect(res.status).toBe(302);
    const to = new URL(res.headers.get('location')!);
    expect(to.origin).toBe('https://accounts.spotify.com');
    expect(to.searchParams.get('client_id')).toBe('saved-client-id');
    expect(to.searchParams.get('redirect_uri')).toBe('http://localhost/api/spotify/callback');
    expect(res.headers.get('location')).not.toContain('saved-secret');
  });

  it('prefers the hosting variables', async () => {
    vi.stubEnv('SPOTIFY_CLIENT_ID', 'env-client-id');
    vi.stubEnv('SPOTIFY_CLIENT_SECRET', 'env-secret');
    await saveKeys();
    const res = await login.GET(get('/api/spotify/login', owner));
    expect(new URL(res.headers.get('location')!).searchParams.get('client_id')).toBe('env-client-id');
  });

  it('explains plainly to the owner when no Client ID and secret are set anywhere', async () => {
    const res = await login.GET(get('/api/spotify/login', owner));
    expect(res.status).toBe(503);
    expect(await res.text()).toContain('Site settings');
    const done = await callback.GET(back(owner));
    expect(done.status).toBe(503);
    expect(await done.text()).toContain('Add-ons');
  });

  it('refuses a visitor\u2019s callback without calling Spotify or saving anything', async () => {
    await saveKeys();
    const res = await callback.GET(back());
    expect(res.status).toBe(401);
    expect(await res.text()).toContain('Sign in');
    expect(spotifyFetch).not.toHaveBeenCalled();
    await expect(h.store!.spotify.read()).resolves.toBeNull();
  });

  it('saves the owner\u2019s connection', async () => {
    await saveKeys();
    const res = await callback.GET(back(owner));
    expect(res.status).toBe(200);
    await expect(h.store!.spotify.read()).resolves.toMatchObject({ refreshToken: 'r', spotifyUserId: 'someone' });
  });
});

describe('Spotify sign-in on a Firebase site (no password owner): unchanged', () => {
  beforeEach(() => {
    // What vercelStore() sees on a Firebase site: not the Vercel backend, so no owner session to check.
    h.store = { ...postgresStore(sql), kind: 'firebase', owner: undefined, editor: undefined };
    vi.stubEnv('SPOTIFY_CLIENT_ID', 'env-client-id');
    vi.stubEnv('SPOTIFY_CLIENT_SECRET', 'env-secret');
  });

  it('starts without a session, and the callback saves the first account', async () => {
    const res = await login.GET(get('/api/spotify/login'));
    expect(new URL(res.headers.get('location')!).origin).toBe('https://accounts.spotify.com');
    expect((await callback.GET(back())).status).toBe(200);
    await expect(h.store!.spotify.read()).resolves.toMatchObject({ spotifyUserId: 'someone' });
  });

  it('tells the owner to set the hosting variables, not to use Add-ons, when no credentials exist', async () => {
    vi.stubEnv('SPOTIFY_CLIENT_ID', '');
    vi.stubEnv('SPOTIFY_CLIENT_SECRET', '');
    const res = await login.GET(get('/api/spotify/login'));
    expect(res.status).toBe(503);
    const body = await res.text();
    expect(body).toBe('Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to the site\u2019s environment variables first.');
    expect(body).not.toContain('Add-ons');
  });

  it('still refuses a different account once one is connected', async () => {
    await h.store!.spotify.save({ refreshToken: 'old', spotifyUserId: 'the-owner' });
    const res = await callback.GET(back());
    expect(res.status).toBe(403);
    await expect(h.store!.spotify.read()).resolves.toMatchObject({ spotifyUserId: 'the-owner' });
  });
});
