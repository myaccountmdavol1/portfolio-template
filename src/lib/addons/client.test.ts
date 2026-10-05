import { describe, expect, it, vi } from 'vitest';
import { createAddonsClient } from './client';
import type { AddonsResponse } from './types';

const STATUS: AddonsResponse = {
  chat: { state: 'on', hint: 'abcd' },
  spotify: { state: 'off', connected: false },
  canStore: true,
  redirectUri: 'https://example.com/api/spotify/callback',
};

function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = vi.fn(async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  });
  return { fetch: fn as unknown as typeof fetch, calls };
}

describe('the add-ons client', () => {
  it('loads the status', async () => {
    const { fetch, calls } = fakeFetch(200, STATUS);
    await expect(createAddonsClient(fetch).load()).resolves.toEqual({ ok: true, status: STATUS });
    expect(calls[0].url).toBe('/api/owner/addons');
    expect(calls[0].init.method).toBeUndefined();
  });

  it('posts a key or credentials as JSON, and deletes by add-on', async () => {
    const { fetch, calls } = fakeFetch(200, STATUS);
    const client = createAddonsClient(fetch);
    await client.saveChat('sk-ant-x');
    await client.saveSpotify('id', 'secret');
    await client.remove('spotify');
    expect(calls.map((c) => [c.url, c.init.method, c.init.body ? JSON.parse(String(c.init.body)) : undefined])).toEqual([
      ['/api/owner/addons', 'POST', { addon: 'chat', key: 'sk-ant-x' }],
      ['/api/owner/addons', 'POST', { addon: 'spotify', clientId: 'id', clientSecret: 'secret' }],
      ['/api/owner/addons?addon=spotify', 'DELETE', undefined],
    ]);
    expect(new Headers(calls[0].init.headers).get('content-type')).toBe('application/json');
  });

  it('passes the server\u2019s plain reason through, and words a lost session or network', async () => {
    const refused = fakeFetch(400, { error: 'That key didn\u2019t work \u2014 check you copied all of it.' });
    await expect(createAddonsClient(refused.fetch).saveChat('k')).resolves.toEqual({ ok: false, error: 'That key didn\u2019t work \u2014 check you copied all of it.' });
    const signedOut = fakeFetch(401, { error: 'Sign in again.' });
    await expect(createAddonsClient(signedOut.fetch).load()).resolves.toEqual({ ok: false, error: 'Your session ended. Sign in again.' });
    const down = vi.fn(async () => {
      throw new TypeError('offline');
    });
    await expect(createAddonsClient(down as unknown as typeof fetch).load()).resolves.toMatchObject({ ok: false });
  });
});
