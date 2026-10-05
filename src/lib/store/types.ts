import type { StoredAddons } from '../addons/types';
import type { ChatLog } from '../chat/log';
import type { CounterStore } from '../chat/limits';
import type { ContactSubmission, InboxMessage } from '../contact';
import type { SiteVersion } from '../editor/backend';
import type { GuestbookNote, NoteSubmission, PublicNote } from '../guestbook/notes';
import type { HallEntry, HallSubmission, PublicHallEntry } from '../hallOfFame/entries';
import type { SiteData } from '../types';

export type SiteScope = 'draft' | 'published';
export type BackendKind = 'firebase' | 'vercel';

export interface SpotifyConnection {
  refreshToken: string;
  /** The Spotify account that connected; only it can reconnect. */
  spotifyUserId: string;
  updatedAt: string; // ISO 8601
}

export interface EditorStore {
  /** Writes only what changed since `prev`; with no `prev`, writes everything and removes apps not in `next`. */
  writeDraft(next: SiteData, prev: SiteData | null): Promise<void>;
  /** Copies `data` to published (site.updatedAt = now) and saves a version, atomically. Returns the version id. */
  publish(data: SiteData, now?: Date): Promise<string>;
  /** Newest first, default 30. */
  versions(limit?: number): Promise<SiteVersion[]>;
}

/** The Vercel backend's owner: a scrypt password and the secret that signs their session cookies. */
export interface OwnerRecord {
  passwordHash: string;
  salt: string;
  sessionSecret: string;
  updatedAt: string; // ISO 8601
  /** When the owner finished the setup wizard (ISO 8601). Missing = not finished, as in records from before it existed. */
  setupDoneAt?: string;
}

/** Everything the server keeps. One implementation per backend (Firebase now, Postgres + Blob in 2b). */
export interface ServerStore {
  kind: BackendKind;
  site: {
    /** null when that scope has never been written. */
    read(scope: SiteScope): Promise<SiteData | null>;
    /** Replaces the whole scope, including removing apps that are gone. */
    write(scope: SiteScope, data: SiteData): Promise<void>;
  };
  guestbook: {
    add(note: NoteSubmission, status: GuestbookNote['status'], now?: Date): Promise<string>;
    /** Approved notes for one guestbook, newest first, without moderation fields. */
    listApproved(appId: string, limit?: number): Promise<PublicNote[]>;
    /** Every note for one guestbook (owner moderation), newest first. */
    list(appId: string): Promise<GuestbookNote[]>;
    approve(id: string): Promise<void>;
    remove(id: string): Promise<void>;
  };
  hallOfFame: {
    /** New entries always wait for approval. */
    add(entry: HallSubmission, now?: Date): Promise<string>;
    listApproved(limit?: number): Promise<PublicHallEntry[]>;
    list(): Promise<HallEntry[]>;
    approve(id: string): Promise<void>;
    remove(id: string): Promise<void>;
  };
  inbox: {
    add(message: ContactSubmission, now?: Date): Promise<string>;
    list(appId: string): Promise<InboxMessage[]>;
    markRead(id: string): Promise<void>;
    remove(id: string): Promise<void>;
  };
  chatLogs: {
    append(conversationId: string, appId: string, question: string, answer: string, now?: Date): Promise<void>;
    /** Newest activity first. */
    list(limit?: number): Promise<ChatLog[]>;
    remove(id: string): Promise<void>;
  };
  counters: CounterStore;
  spotify: {
    read(): Promise<SpotifyConnection | null>;
    save(connection: Omit<SpotifyConnection, 'updatedAt'>, now?: Date): Promise<void>;
    /** Keeps spotifyUserId; replaces only the token. */
    rotate(refreshToken: string, now?: Date): Promise<void>;
    /** Forgets the connection (Add-ons, Remove). Removing nothing is fine. */
    remove(): Promise<void>;
  };
  /** Add-on keys, sealed with the setup code (src/lib/addons/secrets.ts). Server-only; never sent to a browser. */
  addons: { get(): Promise<StoredAddons | null>; set(value: StoredAddons): Promise<void> };
  editor?: EditorStore;
  /** Vercel backend only: the owner's password and session secret (Firebase sites sign in with Google). */
  owner?: { get(): Promise<OwnerRecord | null>; set(record: OwnerRecord): Promise<void> };
}
