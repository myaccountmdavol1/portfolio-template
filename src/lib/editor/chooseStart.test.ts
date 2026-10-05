import { describe, expect, it } from 'vitest';
import { seedSiteData } from '../seed';
import type { SiteData } from '../types';
import { chooseStart } from './chooseStart';

const page = { ...seedSiteData, apps: [] } as SiteData;
const stored = { ...seedSiteData } as SiteData;
const draft = { ...seedSiteData, apps: [...seedSiteData.apps] } as SiteData;

describe('chooseStart', () => {
  it('uses the stored copy for both the start and published', () => {
    expect(chooseStart({ kind: 'http', draft: null, stored, storedFailed: false, hostingChat: false, page })).toEqual({ start: stored, published: stored });
  });
  it('uses the page copy when nothing is stored', () => {
    expect(chooseStart({ kind: 'http', draft: null, stored: null, storedFailed: false, hostingChat: false, page })).toEqual({ start: page, published: page });
  });
  it('errors on http when the read failed', () => {
    expect(chooseStart({ kind: 'http', draft, stored: null, storedFailed: true, hostingChat: false, page })).toBe('error');
  });
  it('falls back to the page copy on local when the read failed', () => {
    expect(chooseStart({ kind: 'local', draft: null, stored: null, storedFailed: true, hostingChat: false, page })).toEqual({ start: page, published: page });
  });
  it('errors on firebase when the read failed and the hosting does not set chat (the page copy may be filtered)', () => {
    expect(chooseStart({ kind: 'firebase', draft: null, stored: null, storedFailed: true, hostingChat: false, page })).toBe('error');
  });
  it('falls back to the page copy on firebase when the read failed and the hosting sets chat', () => {
    expect(chooseStart({ kind: 'firebase', draft: null, stored: null, storedFailed: true, hostingChat: true, page })).toEqual({ start: page, published: page });
  });
  it('starts from an existing draft while published still comes from stored', () => {
    expect(chooseStart({ kind: 'http', draft, stored, storedFailed: false, hostingChat: false, page })).toEqual({ start: draft, published: stored });
  });
  it('prefers unsaved edits over the draft', () => {
    const mirror = { ...seedSiteData, apps: seedSiteData.apps.slice(1) } as SiteData;
    expect(chooseStart({ kind: 'http', mirror, draft, stored, storedFailed: false, hostingChat: false, page })).toEqual({ start: mirror, published: stored });
  });
});
