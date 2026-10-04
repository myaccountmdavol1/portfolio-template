import type { ChatLog } from '../chat/log';
import type { InboxMessage } from '../contact';
import type { GuestbookNote } from '../guestbook/notes';
import type { HallEntry } from '../hallOfFame/entries';
import type { SiteData } from '../types';
import { storagePath, type EditorBackend, type MediaItem, type SiteVersion } from './backend';

/** The owner's session ended (expired, or signed out elsewhere). */
export class SignedOutError extends Error {}

export interface HttpBackendOptions {
  /** How uploads are stored, from GET /api/owner/session. null: this site has no file storage. */
  media: 'blob' | 'blob-presigned' | 'disk' | null;
  /** Called on every 401, e.g. to send the owner back to /admin (unsaved edits stay in the local mirror). */
  onUnauthorized: () => void;
  fetch?: typeof fetch;
  uploadToBlob?: (pathname: string, file: File) => Promise<string>;
  uploadToBlobPresigned?: (pathname: string, file: File) => Promise<string>;
  now?: () => number;
}

async function uploadToVercelBlob(pathname: string, file: File): Promise<string> {
  const { upload } = await import('@vercel/blob/client');
  const blob = await upload(pathname, file, { access: 'public', handleUploadUrl: '/api/owner/upload', contentType: file.type || undefined });
  return blob.url;
}

/** For a store linked by BLOB_STORE_ID: the route hands back a presigned URL instead of a client token. */
async function uploadToVercelBlobPresigned(pathname: string, file: File): Promise<string> {
  const { uploadPresigned } = await import('@vercel/blob/client');
  const blob = await uploadPresigned(pathname, file, { access: 'public', handleUploadUrl: '/api/owner/upload', contentType: file.type || undefined });
  return blob.url;
}

const query = (key: string, value: string) => `?${key}=${encodeURIComponent(value)}`;

/** Vercel-backend editor: everything goes through the site's owner-only /api/owner routes. */
export function createHttpBackend(options: HttpBackendOptions): EditorBackend {
  const doFetch = options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  const now = options.now ?? Date.now;

  async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
    const isForm = init.body instanceof FormData;
    const res = await doFetch(url, {
      credentials: 'same-origin',
      ...init,
      headers: init.body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    });
    if (res.status === 401) {
      options.onUnauthorized();
      throw new SignedOutError('Signed out');
    }
    if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${url} failed with ${res.status}`);
    return (await res.json()) as T;
  }
  const send = (url: string, method: string, body?: unknown) =>
    call<unknown>(url, { method, body: body === undefined ? undefined : JSON.stringify(body) }).then(() => undefined);

  return {
    kind: 'http',
    loadDraft: async () => (await call<{ draft: SiteData | null }>('/api/owner/draft')).draft,
    saveDraft: (next, prev) => send('/api/owner/draft', 'PUT', { next, prev }),
    publish: (data) => send('/api/owner/publish', 'POST', { data }),
    async upload(file, folder) {
      const path = storagePath(folder, file.name, now());
      if (options.media === 'blob') return (options.uploadToBlob ?? uploadToVercelBlob)(path, file);
      if (options.media === 'blob-presigned') return (options.uploadToBlobPresigned ?? uploadToVercelBlobPresigned)(path, file);
      if (options.media !== 'disk') throw new Error('File storage isn’t set up on this site.');
      const form = new FormData();
      form.set('path', path);
      form.set('file', file);
      return (await call<{ url: string }>('/api/owner/upload', { method: 'POST', body: form })).url;
    },
    media: {
      list: async (folder) => (await call<{ items: MediaItem[] }>(`/api/owner/media${query('folder', folder)}`)).items,
      remove: (path) => send(`/api/owner/media${query('path', path)}`, 'DELETE'),
    },
    chatLogs: {
      list: async () => (await call<{ items: ChatLog[] }>('/api/owner/chat-logs')).items,
      remove: (id) => send(`/api/owner/chat-logs${query('id', id)}`, 'DELETE'),
    },
    guestbook: {
      list: async (appId) => (await call<{ items: GuestbookNote[] }>(`/api/owner/guestbook${query('appId', appId)}`)).items,
      approve: (id) => send('/api/owner/guestbook', 'POST', { action: 'approve', id }),
      remove: (id) => send(`/api/owner/guestbook${query('id', id)}`, 'DELETE'),
    },
    hallOfFame: {
      list: async () => (await call<{ items: HallEntry[] }>('/api/owner/hall-of-fame')).items,
      approve: (id) => send('/api/owner/hall-of-fame', 'POST', { action: 'approve', id }),
      remove: (id) => send(`/api/owner/hall-of-fame${query('id', id)}`, 'DELETE'),
    },
    inbox: {
      list: async (appId) => (await call<{ items: InboxMessage[] }>(`/api/owner/inbox${query('appId', appId)}`)).items,
      markRead: (id) => send('/api/owner/inbox', 'POST', { action: 'markRead', id }),
      remove: (id) => send(`/api/owner/inbox${query('id', id)}`, 'DELETE'),
    },
    versions: { list: async () => (await call<{ versions: SiteVersion[] }>('/api/owner/versions')).versions },
  };
}
