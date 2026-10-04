import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServerStore } from '@/lib/store/types';

const h = vi.hoisted(() => ({ store: null as ServerStore | null }));
vi.mock('@/lib/store', () => ({ getStore: () => h.store }));
vi.mock('next/cache', () => ({ revalidateTag: () => undefined, unstable_cache: (fn: unknown) => fn }));

const { ensureSchema } = await import('@/lib/store/postgres/schema');
const { pgliteSql } = await import('@/lib/store/postgres/sql');
const { postgresStore } = await import('@/lib/store/postgres/store');
const { claimOwner } = await import('@/lib/auth/owner');

const session = await import('./session/route');
const claim = await import('./claim/route');
const draft = await import('./draft/route');
const publish = await import('./publish/route');
const versions = await import('./versions/route');
const media = await import('./media/route');
const upload = await import('./upload/route');
const guestbook = await import('./guestbook/route');
const hallOfFame = await import('./hall-of-fame/route');
const inbox = await import('./inbox/route');
const chatLogs = await import('./chat-logs/route');

type Handler = (request: Request) => Promise<Response> | Response;
type Entry = { name: string; handler: Handler; method: string; path: string; ownerOnly: boolean };

const entry = (name: string, method: string, handler: unknown, ownerOnly = true): Entry => ({
  name: `${method} ${name}`,
  method,
  handler: handler as Handler,
  path: `/api/owner/${name}`,
  ownerOnly,
});
const crud = (name: string, mod: { GET: unknown; POST: unknown; DELETE: unknown }) => [
  entry(name, 'GET', mod.GET),
  entry(name, 'POST', mod.POST),
  entry(name, 'DELETE', mod.DELETE),
];

// Every exported handler of every owner route.
const ROUTES: Entry[] = [
  entry('session', 'GET', session.GET, false),
  entry('session', 'POST', session.POST, false),
  entry('session', 'DELETE', session.DELETE, false),
  entry('claim', 'POST', claim.POST, false),
  entry('draft', 'GET', draft.GET),
  entry('draft', 'PUT', draft.PUT),
  entry('publish', 'POST', publish.POST),
  entry('versions', 'GET', versions.GET),
  entry('media', 'GET', media.GET),
  entry('media', 'DELETE', media.DELETE),
  entry('upload', 'POST', upload.POST),
  ...crud('guestbook', guestbook),
  ...crud('hall-of-fame', hallOfFame),
  ...crud('inbox', inbox),
  ...crud('chat-logs', chatLogs),
];

const call = (e: Entry) =>
  Promise.resolve(
    e.handler(
      new Request(`http://localhost${e.path}`, {
        method: e.method,
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.9.9.9' },
        ...(e.method === 'GET' || e.method === 'DELETE' ? {} : { body: JSON.stringify({}) }),
      }),
    ),
  );

describe('owner routes on a Firebase-like site (no Vercel store)', () => {
  beforeEach(() => {
    h.store = null;
  });

  it.each(ROUTES.map((e) => [e.name, e] as const))('%s answers 404', async (_name, e) => {
    const res = await call(e);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not available on this site.' });
  });
});

describe('owner routes on the Vercel backend without the session cookie', () => {
  const sql = pgliteSql();

  beforeEach(async () => {
    vi.stubEnv('SETUP_CODE', 'gate-setup-code');
    h.store = postgresStore(sql);
    await ensureSchema(sql);
    await sql.query('truncate documents, versions, records, counters');
    const claimed = await claimOwner(h.store as never, { setupCode: 'gate-setup-code', password: 'a good password', visitorKey: 'v' }, 'gate-setup-code');
    if (!claimed.ok) throw new Error(claimed.error);
  });

  it.each(ROUTES.filter((e) => e.ownerOnly).map((e) => [e.name, e] as const))('%s answers 401', async (_name, e) => {
    const res = await call(e);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Sign in again.' });
  });

  // Session and claim are public by design: they are how the owner signs in.
  it('leaves session and claim reachable, and still refuses a wrong password or code', async () => {
    const get = await call(ROUTES.find((e) => e.name === 'GET session')!);
    expect(get.status).toBe(200);
    expect(await get.json()).toMatchObject({ claimed: true, owner: false });
    expect((await call(ROUTES.find((e) => e.name === 'DELETE session')!)).status).toBe(200);
    expect((await call(ROUTES.find((e) => e.name === 'POST session')!)).status).toBe(401); // empty password is wrong
    expect((await call(ROUTES.find((e) => e.name === 'POST claim')!)).status).toBe(400); // empty password is too short
  });
});
