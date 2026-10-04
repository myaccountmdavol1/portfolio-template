import { describe, expect, it } from 'vitest';
import { seedSiteData } from '../seed';
import { storagePath, type KeyValueStore } from './backend';
import { createLocalBackend, LOCAL_PUBLISHED_KEY } from './localBackend';
import { clearUnsavedMirror, readUnsavedMirror, writeUnsavedMirror } from './unsavedMirror';

function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe('storagePath', () => {
  it('prefixes a timestamp and makes the name URL-safe', () => {
    expect(storagePath('images', 'My Photo (1).PNG', 123)).toBe('images/123-my-photo-1-.png');
    expect(storagePath('docs', '???', 5)).toBe('docs/5-file');
  });
});

describe('createLocalBackend', () => {
  it('returns null before anything is saved, then round-trips the draft', async () => {
    const backend = createLocalBackend(memoryStore());
    await expect(backend.loadDraft()).resolves.toBeNull();
    await backend.saveDraft(seedSiteData, null);
    await expect(backend.loadDraft()).resolves.toEqual(seedSiteData);
  });

  it('publish writes a separate key', async () => {
    const store = memoryStore();
    await createLocalBackend(store).publish(seedSiteData);
    expect(JSON.parse(store.map.get(LOCAL_PUBLISHED_KEY)!)).toEqual(seedSiteData);
  });

  it('upload uses the provided reader', async () => {
    const backend = createLocalBackend(memoryStore(), async () => 'data:image/png;base64,AA==');
    await expect(backend.upload({} as File, 'images')).resolves.toBe('data:image/png;base64,AA==');
  });
});

describe('unsaved mirror', () => {
  it('writes, reads, and clears per backend kind', () => {
    const store = memoryStore();
    expect(readUnsavedMirror(store, 'local')).toBeNull();
    writeUnsavedMirror(store, 'local', seedSiteData);
    expect(readUnsavedMirror(store, 'local')).toEqual(seedSiteData);
    expect(readUnsavedMirror(store, 'firebase')).toBeNull();
    clearUnsavedMirror(store, 'local');
    expect(readUnsavedMirror(store, 'local')).toBeNull();
  });

  it('treats corrupt JSON as nothing saved', () => {
    const store = memoryStore();
    store.setItem('portfolio:unsavedDraft:local', '{not json');
    expect(readUnsavedMirror(store, 'local')).toBeNull();
  });
});

describe('local version history', () => {
  it('keeps each publish, newest first', async () => {
    const backend = createLocalBackend(memoryStore());
    await expect(backend.versions.list()).resolves.toEqual([]);
    await backend.publish(seedSiteData);
    const renamed = { ...seedSiteData, site: { ...seedSiteData.site, ownerName: 'Second' } };
    await backend.publish(renamed);
    const versions = await backend.versions.list();
    expect(versions.map((v) => v.data.site.ownerName)).toEqual(['Second', seedSiteData.site.ownerName]);
  });
});

describe('local media library', () => {
  it('lists this session’s uploads per folder, newest first, and removes them', async () => {
    let n = 0;
    const backend = createLocalBackend(memoryStore(), async () => `data:image/png;base64,${n++}`);
    await backend.upload(new File(['a'], 'a.png', { type: 'image/png' }), 'images');
    await backend.upload(new File(['b'], 'b.png', { type: 'image/png' }), 'images');
    await backend.upload(new File(['c'], 'c.mp3', { type: 'audio/mpeg' }), 'audio');
    const images = await backend.media.list('images');
    expect(images.map((m) => m.name)).toEqual(['b.png', 'a.png']);
    await backend.media.remove(images[0].path);
    expect((await backend.media.list('images')).map((m) => m.name)).toEqual(['a.png']);
    expect(await backend.media.list('audio')).toHaveLength(1);
  });
});
