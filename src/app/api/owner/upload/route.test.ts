import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServerStore } from '@/lib/store/types';

const h = vi.hoisted(() => ({ store: null as ServerStore | null, rules: null as unknown, signed: null as unknown, urlOptions: null as unknown }));
vi.mock('@/lib/store', () => ({ getStore: () => h.store }));
vi.mock('@vercel/blob/client', () => ({
  handleUpload: async ({
    onBeforeGenerateToken,
    body,
  }: {
    onBeforeGenerateToken: (p: string, c: null, m: boolean) => Promise<unknown>;
    body: { payload: { pathname: string } };
  }) => {
    h.rules = await onBeforeGenerateToken(body.payload.pathname, null, false);
    return { type: 'blob.generate-client-token', clientToken: 'token' };
  },
  handleUploadPresigned: async ({
    getSignedToken,
    body,
  }: {
    getSignedToken: (p: string, c: null, m: boolean) => Promise<{ token: unknown; urlOptions?: unknown }>;
    body: { type: string; payload: { pathname: string } };
  }) => {
    if (body.type !== 'blob.generate-presigned-url') throw new Error('Invalid event type');
    const { urlOptions } = await getSignedToken(body.payload.pathname, null, false);
    h.urlOptions = urlOptions;
    return { type: 'blob.generate-presigned-url', presignedUrlPayload: { delegationToken: 'd', signature: 's' } };
  },
}));
vi.mock('@vercel/blob', () => ({
  issueSignedToken: async (options: unknown) => {
    h.signed = options;
    return { delegationToken: 'd', clientSigningToken: 'c', validUntil: Date.now() + 60_000 };
  },
}));

const { ensureSchema } = await import('@/lib/store/postgres/schema');
const { pgliteSql } = await import('@/lib/store/postgres/sql');
const { postgresStore } = await import('@/lib/store/postgres/store');
const { claimOwner } = await import('@/lib/auth/owner');
const upload = await import('./route');
const media = await import('../media/route');

const sql = pgliteSql();
let cookie = '';

beforeEach(async () => {
  vi.unstubAllEnvs();
  h.store = postgresStore(sql);
  await ensureSchema(sql);
  await sql.query('truncate documents, versions, records, counters');
  const claimed = await claimOwner(h.store as never, { setupCode: 'test-setup-code', password: 'a good password', visitorKey: 'v' }, 'test-setup-code');
  if (!claimed.ok) throw new Error(claimed.error);
  cookie = `portfolio_owner=${claimed.token}`;
});

describe('uploads on disk (local dev)', () => {
  beforeEach(() => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
    vi.stubEnv('BLOB_STORE_ID', '');
    vi.stubEnv('MEDIA_DIR', mkdtempSync(join(tmpdir(), 'upload-')));
  });

  const form = (path: string, type: string, bytes = 3) => {
    const body = new FormData();
    body.set('path', path);
    body.set('file', new File([new Uint8Array(bytes)], 'x', { type }));
    return body;
  };
  const post = (body: FormData, withCookie = true) =>
    new Request('http://localhost/api/owner/upload', { method: 'POST', headers: withCookie ? { cookie } : {}, body });

  it('saves an allowed file and lists it', async () => {
    const res = await upload.POST(post(form('images/1-a.png', 'image/png')));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: '/api/dev-media/images/1-a.png' });
    const list = await media.GET(new Request('http://localhost/api/owner/media?folder=images', { headers: { cookie } }));
    expect(((await list.json()) as { items: { path: string }[] }).items.map((i) => i.path)).toEqual(['images/1-a.png']);
  });

  it('refuses the wrong type, a bad path, and visitors', async () => {
    expect((await upload.POST(post(form('images/1-a.png', 'text/html')))).status).toBe(400);
    expect((await upload.POST(post(form('../x', 'image/png')))).status).toBe(400);
    expect((await upload.POST(post(form('images/1-a.png', 'image/png'), false))).status).toBe(401);
  });
});

describe('uploads to Vercel Blob', () => {
  beforeEach(() => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'vercel_blob_rw_test');
    vi.stubEnv('BLOB_STORE_ID', '');
  });

  const tokenRequest = (pathname: string, withCookie = true) =>
    new Request('http://localhost/api/owner/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(withCookie ? { cookie } : {}) },
      body: JSON.stringify({ type: 'blob.generate-client-token', payload: { pathname, multipart: false, clientPayload: null } }),
    });

  it('gives the owner a token limited by the folder’s rules', async () => {
    const res = await upload.POST(tokenRequest('videos/1-clip.mp4'));
    expect(res.status).toBe(200);
    expect(h.rules).toEqual({ allowedContentTypes: ['video/*'], maximumSizeInBytes: 100 * 1024 * 1024, addRandomSuffix: false });
  });

  it('refuses a bad path and visitors', async () => {
    expect((await upload.POST(tokenRequest('elsewhere/1-a.png'))).status).toBe(400);
    expect((await upload.POST(tokenRequest('images/1-a.png', false))).status).toBe(401);
  });
});

describe('uploads to a store-ID (OIDC) Vercel Blob store', () => {
  beforeEach(() => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
    vi.stubEnv('BLOB_STORE_ID', 'store_abc');
    h.signed = null;
    h.urlOptions = null;
  });

  const presignRequest = (pathname: string, withCookie = true) =>
    new Request('http://localhost/api/owner/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(withCookie ? { cookie } : {}) },
      body: JSON.stringify({ type: 'blob.generate-presigned-url', payload: { pathname, multipart: false, clientPayload: null } }),
    });

  it('gives the owner a presigned URL limited by the folder’s rules', async () => {
    const res = await upload.POST(presignRequest('videos/1-clip.mp4'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ type: 'blob.generate-presigned-url', presignedUrlPayload: { delegationToken: 'd', signature: 's' } });
    expect(h.signed).toEqual({
      pathname: 'videos/1-clip.mp4',
      operations: ['put'],
      allowedContentTypes: ['video/*'],
      maximumSizeInBytes: 100 * 1024 * 1024,
    });
    expect(h.urlOptions).toEqual({ allowedContentTypes: ['video/*'], maximumSizeInBytes: 100 * 1024 * 1024, addRandomSuffix: false, allowOverwrite: false });
  });

  it('refuses a bad path and visitors', async () => {
    expect((await upload.POST(presignRequest('elsewhere/1-a.png'))).status).toBe(400);
    expect(h.signed).toBeNull();
    expect((await upload.POST(presignRequest('images/1-a.png', false))).status).toBe(401);
    expect(h.signed).toBeNull();
  });
});
