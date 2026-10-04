import { describe, expect, it } from 'vitest';
import { seedSiteData } from './seed';
import { buildSearchIndex, searchSite } from './spotlight';
import type { SiteData } from './types';

const index = buildSearchIndex(seedSiteData);

describe('searchSite', () => {
  it('returns nothing for an empty query', () => {
    expect(searchSite(index, '   ')).toEqual([]);
  });

  it('ranks title matches first', () => {
    const results = searchSite(index, 'project');
    expect(results.slice(0, 2).map((r) => r.appId)).toEqual(['p1', 'p2']);
  });

  it('finds words inside content and returns a snippet', () => {
    const [hit] = searchSite(index, 'helen keller');
    expect(hit.appId).toBe('about');
    expect(hit.snippet).toContain('Helen Keller');
  });

  it('searches credentials and stats content', () => {
    expect(searchSite(index, 'master of science').map((r) => r.appId)).toEqual(['credentials']);
    expect(searchSite(index, 'returning partners').map((r) => r.appId)).toEqual(['stats']);
  });

  it('requires every word to match and is case-insensitive', () => {
    expect(searchSite(index, 'UX RESEARCH').map((r) => r.appId)).toEqual(['p1']);
    expect(searchSite(index, 'ux zzzz')).toEqual([]);
  });

  it('skips hidden apps', () => {
    const hidden: SiteData = { ...seedSiteData, apps: seedSiteData.apps.map((a) => (a.id === 'about' ? { ...a, visible: false } : a)) };
    expect(searchSite(buildSearchIndex(hidden), 'keller')).toEqual([]);
  });

  it('treats regex characters literally', () => {
    expect(() => searchSite(index, '(ux')).not.toThrow();
  });
});
