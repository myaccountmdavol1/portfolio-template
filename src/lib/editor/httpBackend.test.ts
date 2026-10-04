import { describe, expect, it, vi } from 'vitest';
import { seedSiteData } from '../seed';
import { createHttpBackend, SignedOutError } from './httpBackend';

type Call = { url: string; method: string; body: unknown };

function fakeFetch(responses: Record<string, { status?: number; body: unknown }>) {
  const calls: Call[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    calls.push({ url, method, body: init.body instanceof FormData ? init.body : init.body ? JSON.parse(String(init.body)) : undefined });
    const r = responses[`${method} ${url}`] ?? { status: 404, body: { error: 'nope' } };
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200, headers: { 'content-type': 'application/json' } });
  });
  return { fetch: fn as unknown as typeof fetch, calls };
}

describe('HTTP editor backend', () => {
  it('loads, saves and publishes the draft through the owner routes', async () => {
    const { fetch, calls } = fakeFetch({
      'GET /api/owner/draft': { body: { draft: seedSiteData } },
      'PUT /api/owner/draft': { body: { ok: true } },
      'POST /api/owner/publish': { body: { id: 'v1' } },
      'GET /api/owner/versions': { body: { versions: [{ id: 'v1', publishedAt: 'x', data: seedSiteData }] } },
    });
    const backend = createHttpBackend({ media: 'disk', onUnauthorized: () => {}, fetch });
    expect(backend.kind).toBe('http');
    await expect(backend.loadDraft()).resolves.toEqual(seedSiteData);
    await backend.saveDraft(seedSiteData, null);
    expect(calls[1]).toEqual({ url: '/api/owner/draft', method: 'PUT', body: { next: seedSiteData, prev: null } });
    await backend.publish(seedSiteData);
    expect(calls[2]).toEqual({ url: '/api/owner/publish', method: 'POST', body: { data: seedSiteData } });
    await expect(backend.versions.list()).resolves.toHaveLength(1);
  });

  it('on 401 calls onUnauthorized and rejects with SignedOutError', async () => {
    const onUnauthorized = vi.fn();
    const { fetch } = fakeFetch({ 'PUT /api/owner/draft': { status: 401, body: { error: 'Sign in again.' } } });
    const backend = createHttpBackend({ media: 'disk', onUnauthorized, fetch });
    await expect(backend.saveDraft(seedSiteData, null)).rejects.toBeInstanceOf(SignedOutError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('rejects other failures with the status', async () => {
    const { fetch } = fakeFetch({ 'GET /api/owner/draft': { status: 500, body: { error: 'boom' } } });
    await expect(createHttpBackend({ media: 'disk', onUnauthorized: () => {}, fetch }).loadDraft()).rejects.toThrow(/500/);
  });

  it('uploads to disk with a form post, or to Blob with the given uploader', async () => {
    const { fetch, calls } = fakeFetch({ 'POST /api/owner/upload': { body: { url: '/api/dev-media/images/1-photo.png' } } });
    const file = new File([new Uint8Array([1])], 'Photo.PNG', { type: 'image/png' });
    const disk = createHttpBackend({ media: 'disk', onUnauthorized: () => {}, fetch, now: () => 1 });
    await expect(disk.upload(file, 'images')).resolves.toBe('/api/dev-media/images/1-photo.png');
    const form = calls[0].body as FormData;
    expect(form.get('path')).toBe('images/1-photo.png');
    expect(form.get('file')).toBeInstanceOf(File);

    const uploadToBlob = vi.fn(async (pathname: string) => `https://x.public.blob.vercel-storage.com/${pathname}`);
    const blob = createHttpBackend({ media: 'blob', onUnauthorized: () => {}, fetch, uploadToBlob, now: () => 2 });
    await expect(blob.upload(file, 'images')).resolves.toBe('https://x.public.blob.vercel-storage.com/images/2-photo.png');

    const none = createHttpBackend({ media: null, onUnauthorized: () => {}, fetch });
    await expect(none.upload(file, 'images')).rejects.toThrow(/storage/i);
  });

  it('wires media and moderation to their routes', async () => {
    const { fetch, calls } = fakeFetch({
      'GET /api/owner/media?folder=images': { body: { items: [{ path: 'images/1-a.png' }] } },
      'DELETE /api/owner/media?path=images%2F1-a.png': { body: { ok: true } },
      'GET /api/owner/guestbook?appId=gb%201': { body: { items: [] } },
      'POST /api/owner/guestbook': { body: { ok: true } },
      'POST /api/owner/inbox': { body: { ok: true } },
      'DELETE /api/owner/chat-logs?id=c1': { body: { ok: true } },
      'GET /api/owner/hall-of-fame': { body: { items: [] } },
    });
    const b = createHttpBackend({ media: 'disk', onUnauthorized: () => {}, fetch });
    await expect(b.media.list('images')).resolves.toEqual([{ path: 'images/1-a.png' }]);
    await b.media.remove('images/1-a.png');
    await b.guestbook!.list('gb 1');
    await b.guestbook!.approve('n1');
    await b.inbox!.markRead('m1');
    await b.chatLogs!.remove('c1');
    await b.hallOfFame!.list();
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'GET /api/owner/media?folder=images',
      'DELETE /api/owner/media?path=images%2F1-a.png',
      'GET /api/owner/guestbook?appId=gb%201',
      'POST /api/owner/guestbook',
      'POST /api/owner/inbox',
      'DELETE /api/owner/chat-logs?id=c1',
      'GET /api/owner/hall-of-fame',
    ]);
    expect(calls[3].body).toEqual({ action: 'approve', id: 'n1' });
    expect(calls[4].body).toEqual({ action: 'markRead', id: 'm1' });
  });
});
