import { sitePasses, visibleApps } from './module';
import { screensaverSettings } from './settings';
import type { LockSettings, SiteData } from '../types';

// The lock screen's rules: who's on it, how it opens, and the "While you were away" notifications —
// only things that really happened. The password is a playful easter egg, not security.

export const DEFAULT_PASSWORD = 'hello';
export const DEFAULT_HINT = 'it’s how you say hi 👋';
export const MISSED_CALL_KEY = 'portfolio:missedCall';
const NOTE_CHARS = 80;

export type UnlockHow = 'guest' | 'password';
export type LockNotificationId = 'missedCall' | 'newestBadge' | 'guestbook' | 'nowPlaying';

export interface ResolvedLock {
  enabled: boolean;
  ownerName: string;
  avatarUrl: string | null; // null = initials
  guest: boolean;
  password: string | null; // null = no password flow (Guest only)
  hint: string; // '' = no hint
  notifications: Record<LockNotificationId, boolean>;
}

function aboutPhoto(data: SiteData): string | null {
  for (const a of visibleApps(data)) {
    if (a.type === 'about' && a.content.media.kind === 'image' && a.content.media.url.trim()) return a.content.media.url.trim();
  }
  return null;
}

function readPassword(l: LockSettings): string | null {
  if (l.password === undefined) return DEFAULT_PASSWORD;
  return typeof l.password === 'string' && l.password.trim() ? l.password : null;
}

export function resolveLock(data: SiteData): ResolvedLock {
  const l: LockSettings = data.site.screensaver?.lock ?? {};
  const password = readPassword(l);
  const n = l.notifications ?? {};
  return {
    enabled: screensaverSettings(data.site).enabled && l.enabled !== false,
    ownerName: (typeof l.ownerName === 'string' && l.ownerName.trim()) || data.site.ownerName.trim() || 'Owner',
    avatarUrl: (typeof l.avatarUrl === 'string' && l.avatarUrl.trim()) || aboutPhoto(data),
    guest: password === null || l.guest !== false,
    password,
    hint: typeof l.hint === 'string' ? l.hint : DEFAULT_HINT,
    notifications: { missedCall: n.missedCall !== false, newestBadge: n.newestBadge !== false, guestbook: n.guestbook !== false, nowPlaying: n.nowPlaying !== false },
  };
}

/** Case-insensitive, surrounding spaces ignored. Never true without a password. */
export function checkPassword(lock: Pick<ResolvedLock, 'password'>, typed: string): boolean {
  return lock.password !== null && typed.trim().toLowerCase() === lock.password.trim().toLowerCase();
}

export interface LockNotification {
  id: LockNotificationId;
  app: string; // bold first line
  text: string;
  icon: string; // emoji on a coloured tile
  color: string;
  art?: string; // album art instead of the tile
  live?: boolean; // the moving equaliser bars
}

/** What the lock screen can know about: this session's missed call, the newest approved note, what's playing. */
export interface LockSources {
  missedCall: boolean;
  note: { name: string; message: string } | null;
  track: { isPlaying: boolean; title: string; artist: string; albumArt?: string } | null;
}

const clip = (text: string, max: number) => {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

export function lockNotifications(data: SiteData, lock: ResolvedLock, src: LockSources): LockNotification[] {
  const on = lock.notifications;
  const out: LockNotification[] = [];
  if (on.missedCall && src.missedCall) out.push({ id: 'missedCall', app: 'Missed call', text: data.site.incomingCall.callerName.trim() || 'Someone', icon: '📞', color: '#34c759' });
  const newest = sitePasses(data)[0];
  if (on.newestBadge && newest) out.push({ id: 'newestBadge', app: newest.wallet, text: `New: ${newest.pass.title.trim()}`, icon: '🏅', color: '#ffcc00' });
  if (on.guestbook && src.note) {
    const app = visibleApps(data).find((a) => a.type === 'guestbook');
    out.push({ id: 'guestbook', app: app?.title ?? 'Guestbook', text: `${src.note.name.trim() || 'A visitor'}: “${clip(src.note.message, NOTE_CHARS)}”`, icon: '📝', color: '#ff9500' });
  }
  if (on.nowPlaying && src.track?.isPlaying) {
    const playing: LockNotification = { id: 'nowPlaying', app: 'Now Playing', text: `${src.track.title} — ${src.track.artist}`, icon: '🎵', color: '#1db954', live: true };
    if (src.track.albumArt) playing.art = src.track.albumArt;
    out.push(playing);
  }
  return out;
}

/** The incoming call rang out unanswered (this browser session). */
export function markMissedCall(): void {
  try {
    window.sessionStorage.setItem(MISSED_CALL_KEY, '1');
  } catch {
    // storage blocked (or no window): the lock screen just won't mention it
  }
}

export function wasCallMissed(): boolean {
  try {
    return window.sessionStorage.getItem(MISSED_CALL_KEY) === '1';
  } catch {
    return false;
  }
}
