import type { SiteData } from '../types';
import type { EditorBackend, KeyValueStore, MediaItem, SiteVersion } from './backend';

export const LOCAL_DRAFT_KEY = 'portfolio:localDraft';
export const LOCAL_PUBLISHED_KEY = 'portfolio:localPublished';
export const LOCAL_VERSIONS_KEY = 'portfolio:localVersions';
const MAX_LOCAL_VERSIONS = 20;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/** Dev/e2e backend: everything lives in this browser's localStorage. Uploads become data: URLs. */
export function createLocalBackend(store: KeyValueStore, readFile: (file: File) => Promise<string> = readAsDataUrl): EditorBackend {
  // Uploads made in this session (data: URLs are too big to keep in localStorage).
  const media: MediaItem[] = [];
  const readVersions = (): SiteVersion[] => {
    try {
      return JSON.parse(store.getItem(LOCAL_VERSIONS_KEY) ?? '[]') as SiteVersion[];
    } catch {
      return [];
    }
  };
  return {
    kind: 'local',
    async loadDraft() {
      const raw = store.getItem(LOCAL_DRAFT_KEY);
      return raw ? (JSON.parse(raw) as SiteData) : null;
    },
    async saveDraft(next) {
      store.setItem(LOCAL_DRAFT_KEY, JSON.stringify(next));
    },
    async publish(data) {
      store.setItem(LOCAL_PUBLISHED_KEY, JSON.stringify(data));
      const publishedAt = new Date().toISOString();
      const versions = [{ id: publishedAt, publishedAt, data }, ...readVersions()].slice(0, MAX_LOCAL_VERSIONS);
      store.setItem(LOCAL_VERSIONS_KEY, JSON.stringify(versions));
    },
    upload: async (file, folder) => {
      const url = await readFile(file);
      media.unshift({ path: `${folder}/${Date.now()}-${file.name}`, folder, name: file.name, url, size: file.size, updated: new Date().toISOString() });
      return url;
    },
    media: {
      list: async (folder) => media.filter((m) => m.folder === folder),
      remove: async (path) => {
        const i = media.findIndex((m) => m.path === path);
        if (i >= 0) media.splice(i, 1);
      },
    },
    chatLogs: null, // conversations are only saved when Firebase is connected
    guestbook: null,
    hallOfFame: null,
    inbox: null,
    versions: { list: async () => readVersions() },
  };
}
