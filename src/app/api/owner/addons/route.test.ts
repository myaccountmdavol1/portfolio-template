import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServerStore } from '@/lib/store/types';

const h = vi.hoisted(() => ({ store: null as ServerStore | null }));
vi.mock('@/lib/store', () => ({ getStore: () => h.store }));

const { ensureSchema } = await import('@/lib/store/postgres/schema');
const { pgliteSql } = await import('@/lib/store/postgres/sql');
const { postgresStore } = await import('@/lib/store/postgres/store');
const { claimOwner } = await import('@/lib/auth/owner');
const { chatKey, spotifyCredentials } = await import('@/lib/addons/config');
const addons = await import('./route');

const CODE = 'addons-route-setup-code';
const KEY = 'sk-ant-api03-route-test-key-wxyz';
const sql = pgliteSql();
let cookie = '';

/** Anthropic and Spotify, faked: each test sets what they answer. */
const remote = vi.hoisted(() => ({ anthropic: 200, spotify: 200, calls: [] as string[] }));
const fakeFetch = vi.fn(async (input: string | URL | Request) => {
  const url = String(input instanceof Request ? input.url : input);
  remote.calls.push(url);
  if (url.startsWith('https://api.anthropic.com/')) {
    if (remote.anthropic === 0) throw new TypeError('fetch failed');
    return Response.json(remote.anthropic === 200 ? { data: [], has_more: false, first_id: null, last_id: null } : { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }, { status: remote.anthropic });
  }
  if (url === 'https://accounts.spotify.com/api/token') {
    if (remote.spotify === 0) throw new TypeError('fetch failed');
    return Response.json(remote.spotify === 200 ? { access_token: 't' } : { error: 'invalid_client' }, { status: remote.spotify });
  }
  throw new Error(`unexpected fetch ${url}`);
});

const req = (method: string, body?: unknown, query = '', headers: Record<string, string> = {}) =>
  new Request(`http://localhost/api/owner/addons${query}`, {
    method,
    headers: { 'content-type': 'application/json', cookie, ...headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
const textOf = async (res: Response) => res.clone().text();

beforeEach(async () => {
  vi.stubEnv('SETUP_CODE', CODE);
  vi.stubEnv('ANTHROPIC_API_KEY', '');
  vi.stubEnv('SPOTIFY_CLIENT_ID', '');
  vi.stubEnv('SPOTIFY_CLIENT_SECRET', '');
  vi.stubEnv('SPOTIFY_REFRESH_TOKEN', '');
  vi.stubEnv('ADDONS_FAKE_CHECK', '');
  vi.stubGlobal('fetch', fakeFetch);
  remote.anthropic = 200;
  remote.spotify = 200;
  remote.calls = [];
  h.store = postgresStore(sql);
  await ensureSchema(sql);
  await sql.query('truncate documents, versions, records, counters');
  const claimed = await claimOwner(h.store as never, { setupCode: CODE, password: 'a good password', visitorKey: 'v' }, CODE);
  if (!claimed.ok) throw new Error(claimed.error);
  cookie = `portfolio_owner=${claimed.token}`;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('GET /api/owner/addons', () => {
  it('reports nothing set up, with the redirect URI to paste into Spotify', async () => {
    const res = await addons.GET(req('GET'));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({
      chat: { state: 'off' },
      spotify: { state: 'off', connected: false },
      canStore: true,
      redirectUri: 'http://localhost/api/spotify/callback',
    });
  });

  it('is for the signed-in owner only', async () => {
    cookie = '';
    expect((await addons.GET(req('GET'))).status).toBe(401);
    expect((await addons.POST(req('POST', { addon: 'chat', key: KEY }))).status).toBe(401);
    expect(remote.calls).toEqual([]);
  });

  it('refuses writes from another site before checking anything', async () => {
    const res = await addons.POST(req('POST', { addon: 'chat', key: KEY }, '', { origin: 'https://evil.example' }));
    expect(res.status).toBe(403);
    expect((await addons.DELETE(req('DELETE', undefined, '?addon=chat', { 'sec-fetch-site': 'cross-site' }))).status).toBe(403);
    expect(remote.calls).toEqual([]);
  });
});

describe('POST /api/owner/addons: Claude', () => {
  it('checks the key, then seals and saves it; no reply ever contains it', async () => {
    const res = await addons.POST(req('POST', { addon: 'chat', key: `  ${KEY}\n` }));
    expect(res.status).toBe(200);
    expect(remote.calls).toEqual(['https://api.anthropic.com/v1/models?limit=1']);
    const body = await textOf(res);
    expect(body).not.toContain(KEY);
    expect(JSON.parse(body).chat).toEqual({ state: 'on', hint: 'wxyz' });
    expect(await textOf(await addons.GET(req('GET')))).not.toContain(KEY);
    // Stored sealed, and the chat route can use it.
    expect(JSON.stringify(await h.store!.addons.get())).not.toContain(KEY);
    await expect(chatKey()).resolves.toEqual({ key: KEY, source: 'stored' });
  });

  it('saves nothing when the key is refused', async () => {
    remote.anthropic = 401;
    const res = await addons.POST(req('POST', { addon: 'chat', key: KEY }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'That key didn\u2019t work \u2014 check you copied all of it.' });
    await expect(h.store!.addons.get()).resolves.toBeNull();
  });

  it('saves nothing when Anthropic can\u2019t be reached', async () => {
    remote.anthropic = 0;
    const res = await addons.POST(req('POST', { addon: 'chat', key: KEY }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Couldn\u2019t reach Anthropic \u2014 try again.' });
    await expect(h.store!.addons.get()).resolves.toBeNull();
  });

  it('refuses a key shorter than 20 characters before calling Anthropic, so the hint can never reveal a whole key', async () => {
    const res = await addons.POST(req('POST', { addon: 'chat', key: 'sk-ant-short-key-1' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'That key is too short to be a Claude API key \u2014 check you copied all of it.' });
    expect(remote.calls).toEqual([]);
    await expect(h.store!.addons.get()).resolves.toBeNull();
  });

  it('says what is wrong with an empty key and with one holding spaces or non-ASCII characters', async () => {
    const empty = await addons.POST(req('POST', { addon: 'chat', key: '   ' }));
    expect(await empty.json()).toEqual({ error: 'Paste your Claude API key first.' });
    for (const key of ['has a space', `${KEY}\u00e9`]) {
      const res = await addons.POST(req('POST', { addon: 'chat', key }));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'That doesn\u2019t look like a key \u2014 paste it again without spaces.' });
    }
    const sp = await addons.POST(req('POST', { addon: 'spotify', clientId: 'client\u00e9', clientSecret: 's' }));
    expect(sp.status).toBe(400);
    expect((await sp.json()).error).toContain('look like');
    expect(remote.calls).toEqual([]);
  });

  it('refuses an empty key, a junk body and an oversized body without calling out', async () => {
    expect((await addons.POST(req('POST', { addon: 'chat', key: '   ' }))).status).toBe(400);
    expect((await addons.POST(req('POST', { addon: 'chat', key: 'has a space' }))).status).toBe(400);
    expect((await addons.POST(req('POST', { addon: 'other', key: KEY }))).status).toBe(400);
    expect((await addons.POST(req('POST', 'not json'))).status).toBe(400);
    expect((await addons.POST(req('POST', '[1]'))).status).toBe(400);
    const huge = await addons.POST(req('POST', { addon: 'chat', key: 'k'.repeat(5_000) }));
    expect(huge.status).toBe(413);
    expect(remote.calls).toEqual([]);
  });

  it('refuses to save when the hosting sets the key, or without a usable setup code', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-env');
    const hosted = await addons.POST(req('POST', { addon: 'chat', key: KEY }));
    expect(hosted.status).toBe(409);
    expect(await textOf(hosted)).not.toContain('sk-ant-env');
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('SETUP_CODE', 'short');
    expect((await addons.POST(req('POST', { addon: 'chat', key: KEY }))).status).toBe(409);
    expect(remote.calls).toEqual([]);
    await expect(h.store!.addons.get()).resolves.toBeNull();
  });
});

describe('POST /api/owner/addons: Spotify', () => {
  it('checks and saves the credentials; the secret is never sent back', async () => {
    const res = await addons.POST(req('POST', { addon: 'spotify', clientId: 'client-abc', clientSecret: 'secret-shh' }));
    expect(res.status).toBe(200);
    const body = await textOf(res);
    expect(body).not.toContain('secret-shh');
    expect(JSON.parse(body).spotify).toEqual({ state: 'credentials', connected: false });
    await expect(spotifyCredentials()).resolves.toEqual({ clientId: 'client-abc', clientSecret: 'secret-shh', source: 'stored' });
  });

  it('saves nothing when Spotify refuses them or can\u2019t be reached', async () => {
    remote.spotify = 400;
    expect((await addons.POST(req('POST', { addon: 'spotify', clientId: 'client-abc', clientSecret: 'wrong' }))).status).toBe(400);
    remote.spotify = 0;
    expect((await addons.POST(req('POST', { addon: 'spotify', clientId: 'client-abc', clientSecret: 'x' }))).status).toBe(502);
    expect((await addons.POST(req('POST', { addon: 'spotify', clientId: 'client-abc' }))).status).toBe(400);
    await expect(h.store!.addons.get()).resolves.toBeNull();
  });

  it('keeps the connection for the same Client ID, and drops it for a new one', async () => {
    await addons.POST(req('POST', { addon: 'spotify', clientId: 'client-abc', clientSecret: 's1' }));
    await h.store!.spotify.save({ refreshToken: 'r', spotifyUserId: 'alex' });
    await addons.POST(req('POST', { addon: 'spotify', clientId: 'client-abc', clientSecret: 's2' }));
    await expect(h.store!.spotify.read()).resolves.not.toBeNull();
    const res = await addons.POST(req('POST', { addon: 'spotify', clientId: 'client-new', clientSecret: 's3' }));
    expect((await res.json()).spotify).toEqual({ state: 'credentials', connected: false });
    await expect(h.store!.spotify.read()).resolves.toBeNull();
  });
});

describe('operation order', () => {
  it('keeps the old Spotify connection when saving new credentials fails', async () => {
    await addons.POST(req('POST', { addon: 'spotify', clientId: 'client-abc', clientSecret: 's1' }));
    await h.store!.spotify.save({ refreshToken: 'r', spotifyUserId: 'alex' });
    h.store = { ...h.store!, addons: { get: h.store!.addons.get, set: async () => { throw new Error('db down'); } } };
    await expect(addons.POST(req('POST', { addon: 'spotify', clientId: 'client-new', clientSecret: 's3' }))).rejects.toThrow('db down');
    await expect(h.store!.spotify.read()).resolves.not.toBeNull();
  });
});

describe('DELETE /api/owner/addons', () => {
  it('removes one add-on and leaves the other', async () => {
    await addons.POST(req('POST', { addon: 'chat', key: KEY }));
    await addons.POST(req('POST', { addon: 'spotify', clientId: 'client-abc', clientSecret: 's1' }));
    await h.store!.spotify.save({ refreshToken: 'r', spotifyUserId: 'alex' });

    const spotify = await addons.DELETE(req('DELETE', undefined, '?addon=spotify'));
    expect(spotify.status).toBe(200);
    expect((await spotify.json()).spotify).toEqual({ state: 'off', connected: false });
    await expect(h.store!.spotify.read()).resolves.toBeNull();
    await expect(chatKey()).resolves.toMatchObject({ source: 'stored' });

    const chat = await addons.DELETE(req('DELETE', undefined, '?addon=chat'));
    expect((await chat.json()).chat).toEqual({ state: 'off' });
    await expect(chatKey()).resolves.toBeNull();
    expect((await addons.DELETE(req('DELETE', undefined, '?addon=nope'))).status).toBe(400);
  });
});
