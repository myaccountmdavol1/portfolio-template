import { afterEach, describe, expect, it, vi } from 'vitest';
import { withDeepLinkFixture } from '../fixtures/deepLinkFixture';
import { seedSiteData } from '../seed';
import type { LockSettings, SiteData } from '../types';
import { checkPassword, DEFAULT_HINT, lockNotifications, markMissedCall, resolveLock, wasCallMissed, type LockSources } from './lock';

const withLock = (data: SiteData, lock: LockSettings, enabled?: boolean): SiteData => ({ ...data, site: { ...data.site, screensaver: { enabled, lock } } });

describe('resolveLock', () => {
  it('works with zero setup: the owner’s name, Guest, the password hello and its hint', () => {
    expect(resolveLock(seedSiteData)).toEqual({
      enabled: true,
      ownerName: 'Your Name',
      avatarUrl: null,
      guest: true,
      password: 'hello',
      hint: 'it’s how you say hi 👋',
      notifications: { missedCall: true, newestBadge: true, guestbook: true, nowPlaying: true },
    });
    expect(DEFAULT_HINT).toBe('it’s how you say hi 👋');
  });

  it('uses the About Me photo unless the owner picked a picture', () => {
    const photo = { ...seedSiteData, apps: seedSiteData.apps.map((a) => (a.type === 'about' ? { ...a, content: { ...a.content, media: { kind: 'image' as const, url: '/me.jpg' } } } : a)) };
    expect(resolveLock(photo).avatarUrl).toBe('/me.jpg');
    expect(resolveLock(withLock(photo, { avatarUrl: '/lock.jpg', ownerName: 'Sam' }))).toMatchObject({ avatarUrl: '/lock.jpg', ownerName: 'Sam' });
  });

  it('with no password, Guest is always there', () => {
    expect(resolveLock(withLock(seedSiteData, { password: null, guest: false }))).toMatchObject({ password: null, guest: true });
    expect(resolveLock(withLock(seedSiteData, { password: '  ' })).password).toBeNull();
    expect(resolveLock(withLock(seedSiteData, { password: 'sesame', guest: false }))).toMatchObject({ password: 'sesame', guest: false });
  });

  it('is off when the owner turned off the lock step or the whole feature', () => {
    expect(resolveLock(withLock(seedSiteData, { enabled: false })).enabled).toBe(false);
    expect(resolveLock(withLock(seedSiteData, {}, false)).enabled).toBe(false);
  });
});

describe('checkPassword', () => {
  it('ignores case and surrounding spaces', () => {
    const lock = resolveLock(seedSiteData);
    expect(checkPassword(lock, '  HeLLo ')).toBe(true);
    expect(checkPassword(lock, 'hell')).toBe(false);
    expect(checkPassword(resolveLock(withLock(seedSiteData, { password: 'Open Sesame' })), 'open sesame')).toBe(true);
    expect(checkPassword(resolveLock(withLock(seedSiteData, { password: null })), '')).toBe(false);
  });
});

describe('lockNotifications', () => {
  const site = withDeepLinkFixture(seedSiteData);
  const all: LockSources = { missedCall: true, note: { name: 'Ana', message: 'Lovely site!' }, track: { isPlaying: true, title: 'Song', artist: 'Band', albumArt: 'https://x/art.jpg' } };

  it('shows only real things, in order', () => {
    expect(lockNotifications(site, resolveLock(site), all)).toEqual([
      { id: 'missedCall', app: 'Missed call', text: 'Your Name', icon: '📞', color: '#34c759' },
      { id: 'newestBadge', app: 'Badges', text: 'New: Google Certified Educator', icon: '🏅', color: '#ffcc00' },
      { id: 'guestbook', app: 'Guestbook', text: 'Ana: “Lovely site!”', icon: '📝', color: '#ff9500' },
      { id: 'nowPlaying', app: 'Now Playing', text: 'Song — Band', icon: '🎵', color: '#1db954', art: 'https://x/art.jpg', live: true },
    ]);
  });

  it('leaves out what didn’t happen and what the owner switched off', () => {
    const none: LockSources = { missedCall: false, note: null, track: { isPlaying: false, title: 'Old', artist: 'Band' } };
    expect(lockNotifications(site, resolveLock(site), none).map((n) => n.id)).toEqual(['newestBadge']);
    expect(lockNotifications(seedSiteData, resolveLock(seedSiteData), none)).toEqual([]); // no Wallet in the sample site
    const off = withLock(site, { notifications: { missedCall: false, newestBadge: false, guestbook: false, nowPlaying: false } });
    expect(lockNotifications(off, resolveLock(off), all)).toEqual([]);
  });

  it('shortens long notes', () => {
    const long: LockSources = { ...all, note: { name: '', message: 'x'.repeat(200) } };
    expect(lockNotifications(site, resolveLock(site), long).find((n) => n.id === 'guestbook')?.text).toBe(`A visitor: “${'x'.repeat(79)}…”`);
  });
});

describe('the missed-call flag', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is remembered for the session, and quietly false without storage', () => {
    expect(wasCallMissed()).toBe(false); // node: no window
    const store = new Map<string, string>();
    vi.stubGlobal('window', { sessionStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } });
    expect(wasCallMissed()).toBe(false);
    markMissedCall();
    expect(wasCallMissed()).toBe(true);
  });
});
