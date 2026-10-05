import { beforeEach, describe, expect, it, vi } from 'vitest';
import { starterApp } from '../editor/starters';
import { seedSiteData } from '../seed';

const h = vi.hoisted(() => ({ key: null as { key: string; source: 'env' | 'stored' } | null, calls: 0, plain: false }));
vi.mock('../getSiteData', async () => {
  const { starterApp: app } = await import('../editor/starters');
  const { seedSiteData: seed } = await import('../seed');
  const withChat = { ...seed, apps: [...seed.apps, app('messages', 'messages-1', 99)] };
  return { getPublishedSite: async () => (h.plain ? seed : withChat) };
});
vi.mock('./config', () => ({
  chatKey: async () => {
    h.calls++;
    return h.key;
  },
}));

const { getVisitorSite } = await import('./visitorSite');
const { getPublishedSite } = await import('../getSiteData');

beforeEach(() => {
  h.key = null;
  h.calls = 0;
  h.plain = false;
});

describe('getVisitorSite', () => {
  it('leaves Messages out while chat is not connected', async () => {
    const data = await getVisitorSite();
    expect(data.apps.map((a) => a.id)).toEqual(seedSiteData.apps.map((a) => a.id));
  });

  it('keeps Messages once a key is set', async () => {
    h.key = { key: 'sk-ant-x', source: 'stored' };
    const data = await getVisitorSite();
    expect(data.apps.at(-1)).toEqual(starterApp('messages', 'messages-1', 99));
  });

  it('serves a site whose hosting sets the key byte-for-byte as published', async () => {
    h.key = { key: 'sk-ant-env', source: 'env' };
    const data = await getVisitorSite();
    expect(data).toBe(await getPublishedSite());
    expect(JSON.stringify(data)).toBe(JSON.stringify(await getPublishedSite()));
  });

  it('does not look the key up when the site has no Messages app', async () => {
    h.plain = true;
    const data = await getVisitorSite();
    expect(data).toBe(seedSiteData);
    expect(h.calls).toBe(0);
  });
});
