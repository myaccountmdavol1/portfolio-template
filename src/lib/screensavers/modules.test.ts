import { describe, expect, it } from 'vitest';
import { withDeepLinkFixture } from '../fixtures/deepLinkFixture';
import { seedSiteData } from '../seed';
import type { SiteData } from '../types';
import { bounce, bounceStep } from './bounce';
import { drift, driftBadges } from './drift';
import { facts, generatedFacts } from './facts';
import { flurry, hexHue, neighbourHues } from './flurry';
import { hello, helloLines } from './hello';
import { memories, memoriesAlbums, memoriesPhotos } from './memories';

const seed = seedSiteData;
const fixture = withDeepLinkFixture(seedSiteData);
/** A brand-new site: no name, no apps. */
const blank: SiteData = { ...seed, site: { ...seed.site, ownerName: '' }, apps: [] };
/** The fixture with pictures on both badges. */
const pictured: SiteData = {
  ...fixture,
  apps: fixture.apps.map((a) => (a.type === 'wallet' ? { ...a, content: { ...a.content, passes: (a.content.passes ?? []).map((p, i) => ({ ...p, imageUrl: `/badge-${i}.png` })) } } : a)),
};

describe('hello', () => {
  it('writes hello in six languages, then the owner’s first name', () => {
    expect(hello.defaults(seed)).toEqual({ words: ['hello', 'hola', 'bonjour', 'ciao', 'hallo', 'olá'], finalLine: 'I’m Your.' });
    expect(hello.defaults(blank).finalLine).toBe('');
    expect(hello.available(blank, hello.defaults(blank))).toBe(true);
  });

  it('plays non-blank lines and is empty with none', () => {
    expect(helloLines({ words: [' hi ', ''], finalLine: 'Bye' })).toEqual(['hi', 'Bye']);
    expect(hello.available(seed, { words: [' '], finalLine: '' })).toBe(false);
  });

  it('falls back to the defaults for malformed settings', () => {
    expect(hello.read(seed, { words: 'hi', finalLine: 4 })).toEqual(hello.defaults(seed));
    expect(hello.read(seed, { words: ['hey', 7], finalLine: 'Me.' })).toEqual({ words: ['hey'], finalLine: 'Me.' });
  });
});

describe('drift', () => {
  it('floats every badge with a picture, newest first', () => {
    expect(drift.defaults(seed)).toEqual({ badgeIds: null });
    expect(driftBadges(pictured, { badgeIds: null }).map((b) => b.id)).toEqual(['pass-gce', 'pass-alc']);
    expect(driftBadges(pictured, { badgeIds: ['pass-alc', 'nope'] })).toEqual([{ id: 'pass-alc', title: 'Apple Learning Coach', imageUrl: '/badge-1.png' }]);
  });

  it('is unavailable without pictures', () => {
    expect(drift.available(fixture, drift.defaults(fixture))).toBe(false); // the fixture's badges have no images
    expect(drift.available(pictured, drift.defaults(pictured))).toBe(true);
    expect(drift.available(blank, drift.defaults(blank))).toBe(false);
  });

  it('reads a list or null', () => {
    expect(drift.read(seed, { badgeIds: ['a', 2] })).toEqual({ badgeIds: ['a'] });
    expect(drift.read(seed, { badgeIds: 'all' })).toEqual({ badgeIds: null });
  });
});

describe('memories', () => {
  it('shows the first album with uploaded photos, with captions', () => {
    expect(memories.defaults(fixture)).toEqual({ album: null });
    expect(memoriesPhotos(fixture, { album: null })).toEqual([
      { url: '/icons/catalog/photos.png', caption: 'Robotics club' },
      { url: '/icons/catalog/maps.png', caption: '' },
    ]);
    expect(memoriesAlbums(fixture)).toEqual(['Classroom']); // "Empty" has no uploaded photo
  });

  it('falls back to the first album when the chosen one is gone, and is unavailable without photos', () => {
    expect(memoriesPhotos(fixture, { album: 'Renamed' })).toHaveLength(2);
    expect(memories.available(seed, memories.defaults(seed))).toBe(false);
    expect(memories.available(fixture, memories.defaults(fixture))).toBe(true);
    expect(memories.read(seed, { album: 'Classroom' })).toEqual({ album: 'Classroom' });
    expect(memories.read(seed, { album: 3 })).toEqual({ album: null });
  });
});

describe('facts', () => {
  it('are generated from About Me, the badges and the stats', () => {
    expect(generatedFacts(fixture)).toEqual([
      { label: 'Right now', fact: 'Your current role, in a sentence', detail: 'Your Name' },
      { label: 'Credentials', fact: '2 badges and certifications', detail: 'Google for Education · Apple' },
      { label: 'Newest badge', fact: 'Google Certified Educator', detail: 'Google for Education · May 2025' },
      { label: 'How I work', fact: '170 People reached', detail: 'Every project follows the same route' },
      { label: 'How I work', fact: '52 Returning partners', detail: 'Every project follows the same route' },
    ]);
    expect(facts.defaults(seed).facts.map((f) => f.label)).toEqual(['Right now', 'How I work', 'How I work']);
  });

  it('are unavailable on a site with nothing to say', () => {
    expect(facts.available(blank, facts.defaults(blank))).toBe(false);
    expect(facts.available(seed, { facts: [{ label: 'x', fact: ' ', detail: '' }] })).toBe(false);
  });

  it('read the owner’s list, keeping only entries with a fact', () => {
    expect(facts.read(seed, { facts: [{ label: 'Fun', fact: 'I juggle' }, { label: 'Bad' }, 'x'] })).toEqual({ facts: [{ label: 'Fun', fact: 'I juggle', detail: '' }] });
    expect(facts.read(seed, { facts: 'nope' })).toEqual(facts.defaults(seed));
  });
});

describe('flurry', () => {
  it('tints the streams from the accent and its two neighbouring hues', () => {
    expect(neighbourHues('#FF0000')).toEqual(['#ff0000', '#ff8000', '#ff0080']);
    expect(flurry.defaults(seed).colors).toHaveLength(3);
    expect(flurry.defaults(seed).colors[0]).toBe('#6f9bd1');
    expect(hexHue('#00ff00')).toBe(120);
  });

  it('keeps only valid colours and is always available', () => {
    expect(flurry.read(seed, { colors: ['#123456', 'red', 5] })).toEqual({ colors: ['#123456'] });
    expect(flurry.read(seed, { colors: ['blue'] })).toEqual(flurry.defaults(seed));
    expect(flurry.available(blank, flurry.defaults(blank))).toBe(true);
  });
});

describe('bounce', () => {
  it('bounces the owner’s initials', () => {
    expect(bounce.defaults(seed)).toEqual({ text: 'YN' });
    expect(bounce.defaults(blank)).toEqual({ text: 'Hi' });
    expect(bounce.read(seed, { text: 'ABCDEFGHIJKLMNOP' })).toEqual({ text: 'ABCDEFGHIJKL' });
    expect(bounce.available(seed, { text: '  ' })).toBe(false);
  });

  it('moves, bounces off walls, and spots an exact corner', () => {
    expect(bounceStep({ x: 10, y: 10, vx: 0.1, vy: 0.1 }, 10, 100, 100)).toEqual({ state: { x: 11, y: 11, vx: 0.1, vy: 0.1 }, hitX: false, hitY: false, corner: false });
    expect(bounceStep({ x: 99, y: 50, vx: 0.2, vy: 0.1 }, 10, 100, 100)).toEqual({ state: { x: 100, y: 51, vx: -0.2, vy: 0.1 }, hitX: true, hitY: false, corner: false });
    expect(bounceStep({ x: 99, y: 98.5, vx: 0.2, vy: 0.1 }, 10, 100, 100).corner).toBe(true); // 0.5 px from the bottom
    expect(bounceStep({ x: 99, y: 90, vx: 0.2, vy: 0.1 }, 10, 100, 100).corner).toBe(false);
    expect(bounceStep({ x: 99, y: 99, vx: 0.2, vy: 0.2 }, 10, 100, 100)).toMatchObject({ hitX: true, hitY: true, corner: true });
  });
});
