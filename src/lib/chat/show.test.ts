import { describe, expect, it } from 'vitest';
import { starterApp } from '../editor/starters';
import { withDeepLinkFixture } from '../fixtures/deepLinkFixture';
import { seedSiteData } from '../seed';
import { resolveShow } from './show';

const site = withDeepLinkFixture(seedSiteData);

describe('resolveShow', () => {
  it('turns a valid input into a canonical show event with a label', () => {
    expect(resolveShow(site, { open: 'badges', item: 'apple-learning-coach' })).toEqual({ type: 'show', open: 'badges', item: 'apple-learning-coach', label: 'Apple Learning Coach' });
    expect(resolveShow(site, { open: 'wallet-fx', item: 'pass-gce' })).toEqual({ type: 'show', open: 'badges', item: 'google-certified-educator', label: 'Google Certified Educator' });
    expect(resolveShow(site, { open: 'project-one' })).toEqual({ type: 'show', open: 'project-one', label: 'Project One' });
  });

  it('drops an item on apps without items', () => {
    expect(resolveShow(site, { open: 'project-one', item: 'whatever' })).toEqual({ type: 'show', open: 'project-one', label: 'Project One' });
  });

  it('rejects unknown targets, missing items, bad shapes, and the Messages app', () => {
    expect(resolveShow(site, { open: 'nope' })).toBeNull();
    expect(resolveShow(site, { open: 'badges', item: 'nope' })).toBeNull();
    expect(resolveShow(site, null)).toBeNull();
    expect(resolveShow(site, { open: 5 })).toBeNull();
    expect(resolveShow(site, { open: 'badges', item: 7 })).toBeNull();
    const withChat = { ...site, apps: [...site.apps, starterApp('messages', 'm-1', 99)] };
    expect(resolveShow(withChat, { open: 'm-1' })).toBeNull();
  });
});
