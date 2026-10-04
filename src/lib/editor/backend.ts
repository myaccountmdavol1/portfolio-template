import type { ChatLog } from '../chat/log';
import type { InboxMessage } from '../contact';
import type { GuestbookNote } from '../guestbook/notes';
import type { HallEntry } from '../hallOfFame/entries';
import type { SiteData } from '../types';

/** A snapshot saved each time the site was published. */
export interface SiteVersion {
  id: string;
  publishedAt: string;
  data: SiteData;
}

export type UploadFolder = 'images' | 'docs' | 'videos' | 'audio';

/** A file in the media library. */
export interface MediaItem {
  /** Storage path like "images/1759200000000-photo.png" (or a local id). */
  path: string;
  folder: UploadFolder;
  name: string;
  url: string;
  size?: number;
  updated?: string; // ISO 8601
}

/** Where the editor loads, saves, publishes, and uploads: Firebase or the site's own server (`http`, Vercel backend) in real use; localStorage in dev/e2e. */
export interface EditorBackend {
  kind: 'firebase' | 'local' | 'http';
  loadDraft(): Promise<SiteData | null>;
  /** `prev` is the last successfully saved value (or null), so backends can write only what changed. */
  saveDraft(next: SiteData, prev: SiteData | null): Promise<void>;
  publish(data: SiteData): Promise<void>;
  /** Returns a URL the site can display. */
  upload(file: File, folder: UploadFolder): Promise<string>;
  /** Saved Messages-app conversations, newest first. null when this backend can't store them (local mode). */
  chatLogs: { list(): Promise<ChatLog[]>; remove(id: string): Promise<void> } | null;
  /** Guestbook moderation. null when notes can't be stored (local mode). */
  guestbook: { list(appId: string): Promise<GuestbookNote[]>; approve(id: string): Promise<void>; remove(id: string): Promise<void> } | null;
  /** Hall of Fame moderation. null in local mode. */
  hallOfFame: { list(): Promise<HallEntry[]>; approve(id: string): Promise<void>; remove(id: string): Promise<void> } | null;
  /** The Mail app's inbox. null in local mode. */
  inbox: { list(appId: string): Promise<InboxMessage[]>; markRead(id: string): Promise<void>; remove(id: string): Promise<void> } | null;
  /** Everything uploaded, per folder, newest first. */
  media: { list(folder: UploadFolder): Promise<MediaItem[]>; remove(path: string): Promise<void> };
  /** Past publishes, newest first. */
  versions: { list(): Promise<SiteVersion[]> };
}

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Storage object path like "images/1759200000000-my-photo.png". */
export function storagePath(folder: UploadFolder, fileName: string, now = Date.now()): string {
  const safe =
    fileName
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'file';
  return `${folder}/${now}-${safe}`;
}
