import { describe, expect, it } from 'vitest';
import { findAboutAppId, visibleAppsById } from './apps';
import { seedSiteData } from './seed';

describe('visibleAppsById', () => {
  it('keeps only visible apps, keyed by id', () => {
    const apps = [...seedSiteData.apps, { ...seedSiteData.apps[0], id: 'hidden', visible: false }];
    const map = visibleAppsById(apps);
    expect(map.has('hidden')).toBe(false);
    expect(map.get('p1')?.title).toBe('Project One');
    expect(map.size).toBe(seedSiteData.apps.length);
  });
});

describe('findAboutAppId', () => {
  it('finds the visible about app', () => {
    expect(findAboutAppId(seedSiteData.apps)).toBe('about');
  });
  it('returns null when the about app is hidden', () => {
    const apps = seedSiteData.apps.map((a) => (a.type === 'about' ? { ...a, visible: false } : a));
    expect(findAboutAppId(apps)).toBeNull();
  });
});

describe('resolveApp', () => {
  it('finds by id, then by type, then by title', async () => {
    const { resolveApp, visibleAppsById } = await import('./apps');
    const { seedSiteData } = await import('./seed');
    const byId = visibleAppsById(seedSiteData.apps);
    expect(resolveApp(byId, 'about')?.id).toBe('about');
    expect(resolveApp(byId, 'credentials')?.id).toBe('credentials');
    expect(resolveApp(byId, 'note')?.id).toBe('todo'); // by type
    expect(resolveApp(byId, 'My Path')?.id).toBe('stats'); // by title
    expect(resolveApp(byId, 'nope')).toBeUndefined();
  });
});
