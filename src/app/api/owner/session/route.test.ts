import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServerStore } from '@/lib/store/types';

const h = vi.hoisted(() => ({ store: null as ServerStore | null }));
vi.mock('@/lib/store', () => ({ getStore: () => h.store }));

const { ensureSchema } = await import('@/lib/store/postgres/schema');
const { pgliteSql } = await import('@/lib/store/postgres/sql');
const { postgresStore } = await import('@/lib/store/postgres/store');
const session = await import('./route');
const claim = await import('../claim/route');
const setup = await import('../setup/route');

const sql = pgliteSql();
let ip = 0;
const post = (body: unknown, cookie = '') =>
  new Request('http://localhost/api/owner/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie, 'x-forwarded-for': `10.0.0.${++ip}` },
    body: JSON.stringify(body),
  });
const cookieOf = (res: Response) => res.headers.get('set-cookie')?.split(';')[0] ?? '';

beforeEach(async () => {
  vi.stubEnv('SETUP_CODE', 'route-setup-code');
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
  vi.stubEnv('BLOB_STORE_ID', '');
  vi.stubEnv('MEDIA_DIR', '/tmp/portfolio-media-test');
  h.store = postgresStore(sql);
  await ensureSchema(sql);
  await sql.query('truncate documents, versions, records, counters');
});

describe('owner session routes', () => {
  it('are not available on a site without the Vercel backend', async () => {
    h.store = null;
    const res = await session.GET(new Request('http://localhost/api/owner/session'));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not available on this site.' });
    const signOut = new Request('http://localhost/api/owner/session', { method: 'DELETE' });
    for (const r of [
      await session.DELETE(signOut),
      await session.POST(post({ password: 'x' })),
      await claim.POST(post({ setupCode: 'x', password: 'x' })),
      await setup.POST(post({})),
    ]) {
      expect(r.status).toBe(404);
      expect(await r.json()).toEqual({ error: 'Not available on this site.' });
      expect(r.headers.get('set-cookie')).toBeNull();
    }
  });

  it('report which Blob upload style the site uses', async () => {
    const media = async () => ((await (await session.GET(new Request('http://localhost/api/owner/session'))).json()) as { media: unknown }).media;
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_test');
    expect(await media()).toBe('blob');
    vi.stubEnv('BLOB_STORE_ID', 'store_abc');
    expect(await media()).toBe('blob-presigned');
  });

  it('report an unclaimed site, then claim it and sign in with the cookie', async () => {
    let res = await session.GET(new Request('http://localhost/api/owner/session'));
    expect(await res.json()).toMatchObject({ configured: true, setupCodeTooShort: false, claimed: false, owner: false, media: 'disk' });
    expect(res.headers.get('cache-control')).toBe('no-store');

    res = await claim.POST(post({ setupCode: 'route-setup-code', password: 'a good password' }));
    expect(res.status).toBe(200);
    const cookie = cookieOf(res);
    expect(cookie).toMatch(/^portfolio_owner=\d+\.[a-f0-9]{64}$/);
    expect(res.headers.get('set-cookie')).toContain('HttpOnly');

    res = await session.GET(new Request('http://localhost/api/owner/session', { headers: { cookie } }));
    expect(await res.json()).toMatchObject({ configured: true, claimed: true, owner: true });
  });

  it('sign in with the password, and sign out clears the cookie', async () => {
    await claim.POST(post({ setupCode: 'route-setup-code', password: 'a good password' }));
    let res = await session.POST(post({ password: 'wrong password' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'That password isn’t right.' });
    res = await session.POST(post({ password: 'a good password' }));
    expect(res.status).toBe(200);
    expect(cookieOf(res)).toMatch(/^portfolio_owner=/);
    res = await session.DELETE(new Request('http://localhost/api/owner/session', { method: 'DELETE' }));
    expect(res.headers.get('set-cookie')).toMatch(/^portfolio_owner=; .*Max-Age=0/);
  });

  it('hint when the setup code is typed as the password', async () => {
    await claim.POST(post({ setupCode: 'route-setup-code', password: 'a good password' }));
    const res = await session.POST(post({ password: 'route-setup-code' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'That’s your setup code, not your password. Click “Forgot password?” to use it.' });
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('report configured:false and setupCodeTooShort when SETUP_CODE is shorter than 12 characters', async () => {
    const status = async () => (await session.GET(new Request('http://localhost/api/owner/session'))).json();
    vi.stubEnv('SETUP_CODE', 'a'.repeat(11));
    expect(await status()).toMatchObject({ configured: false, setupCodeTooShort: true });
    vi.stubEnv('SETUP_CODE', 'a'.repeat(12));
    expect(await status()).toMatchObject({ configured: true, setupCodeTooShort: false });
    vi.stubEnv('SETUP_CODE', '');
    expect(await status()).toMatchObject({ configured: false, setupCodeTooShort: false });
  });

  it('pass claim errors through', async () => {
    const res = await claim.POST(post({ setupCode: 'nope', password: 'a good password' }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'That setup code isn’t right.' });
  });

  it('report setupDone for the signed-in owner once POST /api/owner/setup has run, and keep it through a reset', async () => {
    const cookie = cookieOf(await claim.POST(post({ setupCode: 'route-setup-code', password: 'a good password' })));
    const status = async (c: string) => (await session.GET(new Request('http://localhost/api/owner/session', { headers: { cookie: c } }))).json();
    expect(await status(cookie)).toMatchObject({ owner: true, setupDone: false });

    const visitor = await setup.POST(post({}));
    expect(visitor.status).toBe(401);
    const res = await setup.POST(post({}, cookie));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(await status(cookie)).toMatchObject({ owner: true, setupDone: true });
    // Only the owner learns it.
    expect(await status('')).toMatchObject({ claimed: true, owner: false, setupDone: false });

    const reset = await claim.POST(post({ setupCode: 'route-setup-code', password: 'a new password!' }));
    expect(await status(cookieOf(reset))).toMatchObject({ owner: true, setupDone: true });
  });
});
