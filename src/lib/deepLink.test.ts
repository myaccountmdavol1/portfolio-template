import { describe, expect, it } from 'vitest';
import { deepLinkParams, linkPreview, photoAlbums, readDeepLink, resolveDeepLink, slugify, withDeepLink } from './deepLink';
import { fixturePhotos, fixtureWallet, withDeepLinkFixture } from './fixtures/deepLinkFixture';
import { seedSiteData } from './seed';
import type { SiteData } from './types';

const site: SiteData = withDeepLinkFixture(seedSiteData);

describe('slugify', () => {
  it('lowercases, drops accents, and joins words with hyphens', () => {
    expect(slugify('Google Certified Educator')).toBe('google-certified-educator');
    expect(slugify('  Résumé.pdf  ')).toBe('resume-pdf');
    expect(slugify('A — B & C!')).toBe('a-b-c');
    expect(slugify('***')).toBe('');
  });

  it('caps long titles at 80 characters without a trailing hyphen', () => {
    const slug = slugify('word '.repeat(40));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('readDeepLink', () => {
  it('reads open and item', () => {
    expect(readDeepLink('?open=badges&item=apple-learning-coach')).toEqual({ open: 'badges', item: 'apple-learning-coach' });
  });

  it('takes the first value, trims, and ignores empty or over-long values', () => {
    expect(readDeepLink('?open=a&open=b')).toEqual({ open: 'a', item: undefined });
    expect(readDeepLink('?open=%20%20&item=x')).toEqual({ open: undefined, item: 'x' });
    expect(readDeepLink(`?open=${'x'.repeat(201)}`)).toEqual({ open: undefined, item: undefined });
    expect(readDeepLink('')).toEqual({ open: undefined, item: undefined });
  });
});

describe('resolveDeepLink', () => {
  it('finds an app by title slug, or by id', () => {
    expect(resolveDeepLink(site, 'project-one')).toEqual({ appId: 'p1', itemMissing: false });
    expect(resolveDeepLink(site, 'p1')).toEqual({ appId: 'p1', itemMissing: false });
    expect(resolveDeepLink(site, 'Project One')).toEqual({ appId: 'p1', itemMissing: false });
  });

  it('returns null without open, for unknown apps, hidden apps, and widgets', () => {
    expect(resolveDeepLink(site)).toBeNull();
    expect(resolveDeepLink(site, 'nope')).toBeNull();
    expect(resolveDeepLink(site, 'to-do')).toBeNull(); // the sticky note
    const hidden = { ...site, apps: site.apps.map((a) => (a.id === 'p1' ? { ...a, visible: false } : a)) };
    expect(resolveDeepLink(hidden, 'project-one')).toBeNull();
  });

  it('refuses link apps that open a new tab', () => {
    const tabLink = { ...site, apps: site.apps.map((a) => (a.type === 'link' ? { ...a, content: { ...a.content, mode: 'open' as const } } : a)) };
    const link = site.apps.find((a) => a.type === 'link')!;
    expect(resolveDeepLink(tabLink, link.id)).toBeNull();
  });

  it('finds a pass by title slug or id', () => {
    expect(resolveDeepLink(site, 'badges', 'apple-learning-coach')).toEqual({ appId: 'wallet-fx', itemKey: 'pass-alc', itemMissing: false });
    expect(resolveDeepLink(site, 'badges', 'pass-gce')).toEqual({ appId: 'wallet-fx', itemKey: 'pass-gce', itemMissing: false });
  });

  it('finds a photo by caption slug or 1-based position, skipping empty albums', () => {
    expect(resolveDeepLink(site, 'photos', 'robotics-club')).toEqual({ appId: 'photos-fx', itemKey: '0:0', itemMissing: false });
    expect(resolveDeepLink(site, 'photos', '2')).toEqual({ appId: 'photos-fx', itemKey: '0:1', itemMissing: false });
  });

  it('flags an unknown item but still opens the app', () => {
    expect(resolveDeepLink(site, 'badges', 'nope')).toEqual({ appId: 'wallet-fx', itemMissing: true });
    expect(resolveDeepLink(site, 'photos', '99')).toEqual({ appId: 'photos-fx', itemMissing: true });
  });

  it('ignores item for apps without items', () => {
    expect(resolveDeepLink(site, 'project-one', 'anything')).toEqual({ appId: 'p1', itemMissing: false });
  });

  it('picks the first app in published order when two titles share a slug', () => {
    const twin = { ...site.apps.find((a) => a.id === 'p1')!, id: 'p1-copy' };
    const dup = { ...site, apps: [...site.apps, twin] };
    expect(resolveDeepLink(dup, 'project-one')?.appId).toBe('p1');
    expect(resolveDeepLink(dup, 'p1-copy')?.appId).toBe('p1-copy');
  });
});

describe('deepLinkParams', () => {
  it('uses slugs, round-tripping through resolveDeepLink', () => {
    expect(deepLinkParams(site, { appId: 'wallet-fx', itemKey: 'pass-alc' })).toEqual({ open: 'badges', item: 'apple-learning-coach' });
    expect(deepLinkParams(site, { appId: 'photos-fx', itemKey: '0:0' })).toEqual({ open: 'photos', item: 'robotics-club' });
    expect(deepLinkParams(site, { appId: 'photos-fx', itemKey: '0:1' })).toEqual({ open: 'photos', item: '2' });
    for (const target of [{ appId: 'wallet-fx', itemKey: 'pass-gce' }, { appId: 'photos-fx', itemKey: '0:1' }, { appId: 'p1' }]) {
      const p = deepLinkParams(site, target)!;
      expect(resolveDeepLink(site, p.open, p.item)).toEqual({ ...target, itemMissing: false });
    }
  });

  it('falls back to the id when the slug belongs to an earlier app', () => {
    const twin = { ...site.apps.find((a) => a.id === 'p1')!, id: 'p1-copy' };
    expect(deepLinkParams({ ...site, apps: [...site.apps, twin] }, { appId: 'p1-copy' })).toEqual({ open: 'p1-copy' });
  });

  it('drops an unknown item and refuses unlinkable apps', () => {
    expect(deepLinkParams(site, { appId: 'wallet-fx', itemKey: 'gone' })).toEqual({ open: 'badges' });
    expect(deepLinkParams(site, { appId: 'todo' })).toBeNull();
    expect(deepLinkParams(site, { appId: 'nope' })).toBeNull();
  });
});

describe('withDeepLink', () => {
  it('sets open and item, keeping other params', () => {
    expect(withDeepLink('', { open: 'badges', item: 'x' })).toBe('?open=badges&item=x');
    expect(withDeepLink('?utm_source=li&open=old&item=old', { open: 'p1' })).toBe('?utm_source=li&open=p1');
  });

  it('removes them for null', () => {
    expect(withDeepLink('?open=a&item=b', null)).toBe('');
    expect(withDeepLink('?open=a&utm_source=li', null)).toBe('?utm_source=li');
  });
});

describe('photoAlbums', () => {
  it('keeps only uploaded photos and albums that have some', () => {
    expect(photoAlbums(fixturePhotos.content)).toEqual([{ index: 1, name: 'Classroom', photos: fixturePhotos.content.albums[1].photos }]);
  });
  it('keeps each album\'s saved index, even when names repeat', () => {
    const ph = (url: string) => ({ url, caption: '' });
    const out = photoAlbums({ albums: [{ name: 'New album', photos: [] }, { name: 'New album', photos: [ph('a')] }, { name: 'New album', photos: [ph('b')] }] });
    expect(out.map((x) => x.index)).toEqual([1, 2]);
  });
});

describe('linkPreview', () => {
  it('describes a pass with its issuer, description and art', () => {
    expect(linkPreview(site, { appId: 'wallet-fx', itemKey: 'pass-gce' })).toEqual({
      title: 'Google Certified Educator',
      description: 'Google for Education — Level 1',
      imageUrl: undefined,
    });
  });

  it('describes a photo by its caption, or the app title without one', () => {
    expect(linkPreview(site, { appId: 'photos-fx', itemKey: '0:0' })).toEqual({ title: 'Robotics club', description: 'Photos', imageUrl: '/icons/catalog/photos.png' });
    expect(linkPreview(site, { appId: 'photos-fx', itemKey: '0:1' })?.title).toBe('Photos');
  });

  it('describes an app with the site description', () => {
    expect(linkPreview(site, { appId: 'p1' })).toEqual({ title: 'Project One', description: site.site.seo.description });
    expect(linkPreview(site, { appId: 'nope' })).toBeNull();
  });

  it('keeps descriptions under 200 characters', () => {
    const long = { ...fixtureWallet, content: { ...fixtureWallet.content, passes: [{ id: 'l', title: 'L', issuer: 'I', description: 'x'.repeat(500) }] } };
    const d = linkPreview({ ...site, apps: [long] }, { appId: 'wallet-fx', itemKey: 'l' })!.description;
    expect(d.length).toBeLessThanOrEqual(200);
    expect(d.endsWith('…')).toBe(true);
  });
});
