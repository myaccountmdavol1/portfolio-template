import { describe, expect, it, vi } from 'vitest';
import { checkAnthropicKey, checkSpotifyCredentials, fakeChecksAllowed } from './check';

const env = { NODE_ENV: 'test' };
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const fetchReturning = (status: number, body: unknown) => vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>(async () => reply(status, body));
const urlOf = (f: ReturnType<typeof fetchReturning>) => String(f.mock.calls[0][0]);

describe('checkAnthropicKey', () => {
  it('lists one model with the key, and accepts it on 200', async () => {
    const f = fetchReturning(200, { data: [], has_more: false, first_id: null, last_id: null });
    await expect(checkAnthropicKey('sk-ant-real', { fetch: f as unknown as typeof fetch, env })).resolves.toEqual({ ok: true });
    expect(f).toHaveBeenCalledTimes(1);
    expect(urlOf(f)).toMatch(/^https:\/\/api\.anthropic\.com\/v1\/models\?limit=1$/);
    const headers = new Headers(f.mock.calls[0][1]?.headers);
    expect(headers.get('x-api-key')).toBe('sk-ant-real');
    expect(headers.get('authorization')).toBeNull();
  });

  it('rejects on 401 and 403, without retrying', async () => {
    for (const status of [401, 403]) {
      const f = fetchReturning(status, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } });
      await expect(checkAnthropicKey('sk-ant-wrong', { fetch: f as unknown as typeof fetch, env })).resolves.toEqual({ ok: false, reason: 'rejected' });
      expect(f).toHaveBeenCalledTimes(1);
    }
  });

  it('calls Anthropic unreachable on a network error, a 5xx or a 429', async () => {
    const down = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    await expect(checkAnthropicKey('sk-ant-x', { fetch: down as unknown as typeof fetch, env })).resolves.toEqual({ ok: false, reason: 'unreachable' });
    for (const status of [500, 529, 429]) {
      const f = fetchReturning(status, { type: 'error', error: { type: 'api_error', message: 'busy' } });
      await expect(checkAnthropicKey('sk-ant-x', { fetch: f as unknown as typeof fetch, env })).resolves.toEqual({ ok: false, reason: 'unreachable' });
    }
  });
});

describe('checkSpotifyCredentials', () => {
  it('asks for a client-credentials token with Basic auth', async () => {
    const f = fetchReturning(200, { access_token: 't', token_type: 'Bearer' });
    await expect(checkSpotifyCredentials('id-1', 'secret-1', { fetch: f as unknown as typeof fetch, env })).resolves.toEqual({ ok: true });
    expect(urlOf(f)).toBe('https://accounts.spotify.com/api/token');
    const init = f.mock.calls[0][1]!;
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('authorization')).toBe(`Basic ${Buffer.from('id-1:secret-1').toString('base64')}`);
    expect(String(init.body)).toBe('grant_type=client_credentials');
  });

  it('rejects on 400/401 and calls Spotify unreachable otherwise', async () => {
    for (const status of [400, 401]) {
      const f = fetchReturning(status, { error: 'invalid_client' });
      await expect(checkSpotifyCredentials('id', 'nope', { fetch: f as unknown as typeof fetch, env })).resolves.toEqual({ ok: false, reason: 'rejected' });
    }
    const f = fetchReturning(503, {});
    await expect(checkSpotifyCredentials('id', 's', { fetch: f as unknown as typeof fetch, env })).resolves.toEqual({ ok: false, reason: 'unreachable' });
    const down = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    await expect(checkSpotifyCredentials('id', 's', { fetch: down as unknown as typeof fetch, env })).resolves.toEqual({ ok: false, reason: 'unreachable' });
  });
});

describe('the e2e fake check', () => {
  it('needs ADDONS_FAKE_CHECK=1 and is impossible in production', () => {
    expect(fakeChecksAllowed({ ADDONS_FAKE_CHECK: '1', NODE_ENV: 'development' })).toBe(true);
    expect(fakeChecksAllowed({ ADDONS_FAKE_CHECK: '1', NODE_ENV: 'production' })).toBe(false);
    expect(fakeChecksAllowed({ ADDONS_FAKE_CHECK: 'true', NODE_ENV: 'development' })).toBe(false);
    expect(fakeChecksAllowed({ NODE_ENV: 'development' })).toBe(false);
  });

  it('answers without any network call: sk-ant- keys pass, a secret starting with bad fails', async () => {
    const f = vi.fn();
    const fake = { fetch: f as unknown as typeof fetch, env: { ADDONS_FAKE_CHECK: '1', NODE_ENV: 'development' } };
    await expect(checkAnthropicKey('sk-ant-e2e-fake-key-0001', fake)).resolves.toEqual({ ok: true });
    await expect(checkAnthropicKey('not-a-key', fake)).resolves.toEqual({ ok: false, reason: 'rejected' });
    await expect(checkSpotifyCredentials('id', 'good', fake)).resolves.toEqual({ ok: true });
    await expect(checkSpotifyCredentials('id', 'bad-secret', fake)).resolves.toEqual({ ok: false, reason: 'rejected' });
    expect(f).not.toHaveBeenCalled();
  });

  it('in production the same settings still check for real', async () => {
    const f = fetchReturning(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } });
    const prod = { fetch: f as unknown as typeof fetch, env: { ADDONS_FAKE_CHECK: '1', NODE_ENV: 'production' } };
    await expect(checkAnthropicKey('sk-ant-e2e-fake-key-0001', prod)).resolves.toEqual({ ok: false, reason: 'rejected' });
    expect(f).toHaveBeenCalledTimes(1);
  });
});
