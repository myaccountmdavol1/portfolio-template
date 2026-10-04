import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const blobApi = vi.hoisted(() => ({ list: vi.fn(), del: vi.fn() }));
vi.mock('@vercel/blob', () => blobApi);

const { checkUpload, folderOfPath, typeAllowed } = await import('./rules');
const { diskMedia } = await import('./disk');
const { blobMedia } = await import('./blob');
const { getMedia } = await import('./index');

describe('upload rules', () => {
  it('accept storagePath-style paths only', () => {
    expect(folderOfPath('images/1759200000000-photo.png')).toBe('images');
    for (const bad of ['icons/1-a.png', 'images/../x', 'images/photo.png', '/images/1-a.png', 'images/1-a.png/x']) expect(folderOfPath(bad)).toBeNull();
  });

  it('match the storage rules', () => {
    expect(typeAllowed('images', 'image/webp')).toBe(true);
    expect(typeAllowed('images', 'application/pdf')).toBe(false);
    expect(typeAllowed('docs', 'application/pdf')).toBe(true);
    expect(checkUpload('images/1-a.png', 'image/png', 10 * 1024 * 1024)).toBeNull();
    expect(checkUpload('images/1-a.png', 'image/png', 10 * 1024 * 1024 + 1)).toMatch(/too big/i);
    expect(checkUpload('videos/1-a.mp4', 'video/mp4', 100 * 1024 * 1024)).toBeNull();
    expect(checkUpload('audio/1-a.mp3', 'image/png', 1)).toMatch(/type/i);
    expect(checkUpload('nope/1-a.png', 'image/png', 1)).toMatch(/path/i);
  });
});

describe('disk media (local dev)', () => {
  it('saves, lists newest first, reads and removes', async () => {
    const media = diskMedia(mkdtempSync(join(tmpdir(), 'media-')));
    expect(await media.save('images/1000-old.png', new Uint8Array([1]))).toBe('/api/dev-media/images/1000-old.png');
    await new Promise((r) => setTimeout(r, 20));
    await media.save('images/2000-new.png', new Uint8Array([2, 3]));
    const items = await media.list('images');
    expect(items.map((i) => [i.path, i.name, i.url, i.size])).toEqual([
      ['images/2000-new.png', 'new.png', '/api/dev-media/images/2000-new.png', 2],
      ['images/1000-old.png', 'old.png', '/api/dev-media/images/1000-old.png', 1],
    ]);
    expect(await media.read('images/2000-new.png')).toEqual(new Uint8Array([2, 3]));
    await media.remove('images/2000-new.png');
    expect((await media.list('images')).map((i) => i.path)).toEqual(['images/1000-old.png']);
    await expect(media.list('docs')).resolves.toEqual([]);
    await expect(media.save('../escape.png', new Uint8Array())).rejects.toThrow(/path/i);
  });
});

describe('blob media', () => {
  it('lists a folder from Vercel Blob and deletes by pathname', async () => {
    blobApi.list.mockResolvedValueOnce({
      blobs: [
        { pathname: 'images/1000-a.png', url: 'https://x.public.blob.vercel-storage.com/images/1000-a.png', size: 5, uploadedAt: new Date('2026-10-01T00:00:00Z') },
        { pathname: 'images/2000-b.png', url: 'https://x.public.blob.vercel-storage.com/images/2000-b.png', size: 6, uploadedAt: new Date('2026-10-02T00:00:00Z') },
      ],
    });
    const items = await blobMedia().list('images');
    expect(blobApi.list).toHaveBeenCalledWith({ prefix: 'images/', limit: 1000 });
    expect(items.map((i) => [i.path, i.name, i.size, i.updated])).toEqual([
      ['images/2000-b.png', 'b.png', 6, '2026-10-02T00:00:00.000Z'],
      ['images/1000-a.png', 'a.png', 5, '2026-10-01T00:00:00.000Z'],
    ]);
    await blobMedia().remove('images/1000-a.png');
    expect(blobApi.del).toHaveBeenCalledWith('images/1000-a.png');
  });
});

describe('getMedia', () => {
  it('prefers Blob, falls back to disk outside production, and is null otherwise', () => {
    expect(getMedia({ BLOB_READ_WRITE_TOKEN: 't', NODE_ENV: 'production' })?.kind).toBe('blob');
    expect(getMedia({ MEDIA_DIR: '/tmp/m', NODE_ENV: 'development' })?.kind).toBe('disk');
    expect(getMedia({ PGLITE_DIR: '/tmp/x/db', NODE_ENV: 'test' })?.kind).toBe('disk');
    expect(getMedia({ MEDIA_DIR: '/tmp/m', NODE_ENV: 'production' })).toBeNull();
    expect(getMedia({ NODE_ENV: 'development' })).toBeNull();
  });
});
