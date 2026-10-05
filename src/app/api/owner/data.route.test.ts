import { beforeEach, describe, expect, it, vi } from 'vitest';
import { seedSiteData } from '@/lib/seed';
import type { ServerStore } from '@/lib/store/types';

const h = vi.hoisted(() => ({ store: null as ServerStore | null, revalidated: [] as string[] }));
vi.mock('@/lib/store', () => ({ getStore: () => h.store }));
vi.mock('next/cache', () => ({ revalidateTag: (tag: string) => h.revalidated.push(tag), unstable_cache: (fn: unknown) => fn }));

const { ensureSchema } = await import('@/lib/store/postgres/schema');
const { pgliteSql } = await import('@/lib/store/postgres/sql');
const { postgresStore } = await import('@/lib/store/postgres/store');
const { claimOwner } = await import('@/lib/auth/owner');
const draft = await import('./draft/route');
const publish = await import('./publish/route');
const versions = await import('./versions/route');
const guestbook = await import('./guestbook/route');
const inbox = await import('./inbox/route');
const publishedRoute = await import('./published/route');

const sql = pgliteSql();
let cookie = '';
const req = (path: string, init: RequestInit = {}, withCookie = true) =>
  new Request(`http://localhost${path}`, { ...init, headers: { 'content-type': 'application/json', ...(withCookie ? { cookie } : {}) } });

beforeEach(async () => {
  h.store = postgresStore(sql);
  h.revalidated = [];
  await ensureSchema(sql);
  await sql.query('truncate documents, versions, records, counters');
  const claimed = await claimOwner(h.store as never, { setupCode: 'test-setup-code', password: 'a good password', visitorKey: 'v' }, 'test-setup-code');
  if (!claimed.ok) throw new Error(claimed.error);
  cookie = `portfolio_owner=${claimed.token}`;
});

describe('owner data routes', () => {
  it('refuse visitors without the session cookie', async () => {
    for (const res of [await draft.GET(req('/api/owner/draft', {}, false)), await versions.GET(req('/api/owner/versions', {}, false))]) {
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Sign in again.' });
    }
  });

  it('save and load the draft, and refuse a malformed one', async () => {
    expect(await (await draft.GET(req('/api/owner/draft'))).json()).toEqual({ draft: null });
    const put = await draft.PUT(req('/api/owner/draft', { method: 'PUT', body: JSON.stringify({ next: seedSiteData, prev: null }) }));
    expect(put.status).toBe(200);
    expect(await (await draft.GET(req('/api/owner/draft'))).json()).toEqual({ draft: seedSiteData });
    const bad = await draft.PUT(req('/api/owner/draft', { method: 'PUT', body: JSON.stringify({ next: { nope: 1 }, prev: null }) }));
    expect(bad.status).toBe(400);
  });

  it('publish stores a version and refreshes the public site cache', async () => {
    const res = await publish.POST(req('/api/owner/publish', { method: 'POST', body: JSON.stringify({ data: seedSiteData }) }));
    expect(res.status).toBe(200);
    const { id } = (await res.json()) as { id: string };
    expect(h.revalidated).toEqual(['published-site']);
    const list = (await (await versions.GET(req('/api/owner/versions'))).json()) as { versions: { id: string }[] };
    expect(list.versions.map((v) => v.id)).toEqual([id]);
  });

  it('give the editor the published site exactly as stored, Messages apps included', async () => {
    expect(await (await publishedRoute.GET(req('/api/owner/published'))).json()).toEqual({ published: null });
    const { starterApp } = await import('@/lib/editor/starters');
    const withChat = { ...seedSiteData, apps: [...seedSiteData.apps, starterApp('messages', 'messages-1', 99)] };
    await publish.POST(req('/api/owner/publish', { method: 'POST', body: JSON.stringify({ data: withChat }) }));
    const { published } = (await (await publishedRoute.GET(req('/api/owner/published'))).json()) as { published: { apps: { id: string }[] } };
    expect(published.apps.map((a) => a.id)).toContain('messages-1');
    expect((await publishedRoute.GET(req('/api/owner/published', {}, false))).status).toBe(401);
  });

  it('moderate the guestbook and inbox', async () => {
    const store = h.store!;
    const noteId = await store.guestbook.add({ appId: 'gb', name: 'Alex Rivera', message: 'hi', color: 'yellow' }, 'pending');
    const items = (await (await guestbook.GET(req('/api/owner/guestbook?appId=gb'))).json()) as { items: { id: string; status: string }[] };
    expect(items.items).toEqual([expect.objectContaining({ id: noteId, status: 'pending' })]);
    await guestbook.POST(req('/api/owner/guestbook', { method: 'POST', body: JSON.stringify({ action: 'approve', id: noteId }) }));
    expect((await store.guestbook.listApproved('gb')).map((n) => n.id)).toEqual([noteId]);
    await guestbook.DELETE(req(`/api/owner/guestbook?id=${noteId}`, { method: 'DELETE' }));
    await expect(store.guestbook.list('gb')).resolves.toEqual([]);

    const msgId = await store.inbox.add({ appId: 'mail', name: 'Alex Rivera', email: 'alex@example.test', subject: 'Hi', message: 'Hello' });
    await inbox.POST(req('/api/owner/inbox', { method: 'POST', body: JSON.stringify({ action: 'markRead', id: msgId }) }));
    expect((await store.inbox.list('mail'))[0].read).toBe(true);
    const wrong = await inbox.POST(req('/api/owner/inbox', { method: 'POST', body: JSON.stringify({ action: 'approve', id: msgId }) }));
    expect(wrong.status).toBe(400);
  });
});
