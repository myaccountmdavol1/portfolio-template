import { describe, expect, it } from 'vitest';
import { resolveDeepLink } from './deepLink';
import { starterApp } from './editor/starters';
import { withDeepLinkFixture } from './fixtures/deepLinkFixture';
import { seedSiteData } from './seed';
import { clampSeconds, defaultTour, readTourSpeed, tourChoices, tourContacts, tourStops, trimCaption, tourStopsOnMove, wantsTour, withoutTourParams } from './tour';
import type { SiteData, TourStop } from './types';

const site: SiteData = withDeepLinkFixture(seedSiteData);
const withStops = (stops: TourStop[] | null): SiteData => ({ ...site, site: { ...site.site, tour: { stops } } });

describe('defaultTour', () => {
  it('visits about, the first project, the newest badge, the resume, photos and messages, in that order', () => {
    expect(defaultTour(site)).toEqual([
      { open: 'about-me', caption: 'A bit about me' },
      { open: 'project-one', caption: 'Project One — my favourite project' },
      { open: 'badges', item: 'google-certified-educator', caption: 'One of my certifications' },
      { open: 'resume-pdf', caption: 'My resume' },
      { open: 'photos', caption: 'A few photos' },
      { open: 'messages', caption: 'Ask me anything — I’ll answer' },
    ]);
  });

  it('skips what the site doesn’t have', () => {
    expect(defaultTour(seedSiteData).map((s) => s.open)).toEqual(['about-me', 'project-one', 'resume-pdf']);
    const hidden = { ...site, apps: site.apps.map((a) => (a.type === 'about' ? { ...a, visible: false } : a)) };
    expect(defaultTour(hidden).map((s) => s.open)).not.toContain('about-me');
  });

  it('leaves out the badge stop when no badge has a title', () => {
    const blank = { ...site, apps: site.apps.map((a) => (a.type === 'wallet' ? { ...a, content: { ...a.content, passes: [{ id: 'x', title: ' ', issuer: 'X' }] } } : a)) };
    expect(defaultTour(blank).some((s) => s.open === 'badges')).toBe(false);
  });

  it('only makes stops a deep link can open, with captions of at most 90 characters', () => {
    const long = { ...site, apps: site.apps.map((a) => (a.id === 'p1' ? { ...a, title: 'A'.repeat(100) } : a)) };
    for (const stop of defaultTour(long)) {
      expect(resolveDeepLink(long, stop.open, stop.item)?.itemMissing, stop.open).toBe(false);
      expect(stop.caption.length).toBeLessThanOrEqual(90);
    }
  });
});

describe('tourStops', () => {
  it('resolves the default tour when the owner has no stops', () => {
    const stops = tourStops(site);
    expect(stops.map((s) => s.appId)).toEqual(['about', 'p1', 'wallet-fx', 'resume', 'photos-fx', 'messages-fx']);
    expect(stops[2]).toEqual({ appId: 'wallet-fx', itemKey: 'pass-gce', caption: 'One of my certifications', seconds: 6 });
  });

  it('plays the owner’s stops, skipping ones that no longer open', () => {
    const stops = tourStops(
      withStops([
        { open: 'project-two', caption: 'Second', seconds: 4 },
        { open: 'deleted-app', caption: 'Gone' },
        { open: 'about-me', caption: '  Hello   there  ' },
      ]),
    );
    expect(stops).toEqual([
      { appId: 'p2', caption: 'Second', seconds: 4 },
      { appId: 'about', caption: 'Hello there', seconds: 6 },
    ]);
  });

  it('trims captions to 90 characters and keeps seconds between 3 and 12', () => {
    const [a, b, c] = tourStops(
      withStops([
        { open: 'about-me', caption: 'x'.repeat(120), seconds: 1 },
        { open: 'about-me', caption: 'y', seconds: 40 },
        { open: 'about-me', caption: 'z', seconds: Number.NaN },
      ]),
    );
    expect(a.caption).toHaveLength(90);
    expect([a.seconds, b.seconds, c.seconds]).toEqual([3, 12, 6]);
  });

  it('opens the app without the item when the item is gone', () => {
    expect(tourStops(withStops([{ open: 'badges', item: 'no-such-badge', caption: 'Badge' }]))).toEqual([{ appId: 'wallet-fx', caption: 'Badge', seconds: 6 }]);
  });

  it('is empty when nothing resolves', () => {
    expect(tourStops(withStops([{ open: 'nope', caption: 'x' }]))).toEqual([]);
    expect(tourStops(withStops([]))).toEqual([]);
  });
});

describe('trimCaption and clampSeconds', () => {
  it('collapse whitespace, cut at 90, and clamp to whole seconds', () => {
    expect(trimCaption('  a \n b  ')).toBe('a b');
    expect(trimCaption('x'.repeat(95))).toHaveLength(90);
    // Hand-edited data: not a string → a number's digits, else no caption (never a crash).
    expect([trimCaption(undefined), trimCaption(null), trimCaption({}), trimCaption(42)]).toEqual(['', '', '', '42']);
    expect(tourStops(withStops([{ open: 'about-me', caption: undefined as unknown as string }]))[0].caption).toBe('');
    expect([clampSeconds(undefined), clampSeconds(2), clampSeconds(7.4), clampSeconds(99)]).toEqual([6, 3, 7, 12]);
  });
});

describe('tourChoices', () => {
  it('lists every app a link can open, with badge and photo items', () => {
    const choices = tourChoices(site);
    expect(choices.find((c) => c.open === 'about-me')).toEqual({ open: 'about-me', label: 'About Me', items: [] });
    expect(choices.find((c) => c.open === 'badges')?.items).toEqual([
      { item: 'google-certified-educator', label: 'Google Certified Educator' },
      { item: 'apple-learning-coach', label: 'Apple Learning Coach' },
    ]);
    expect(choices.find((c) => c.open === 'photos')?.items).toEqual([
      { item: 'robotics-club', label: 'Robotics club' },
      { item: '2', label: 'Photo 2' },
    ]);
    expect(choices.some((c) => c.open === 'messages')).toBe(true);
    expect(choices.some((c) => c.open === 'to-do')).toBe(false); // widgets can't be opened by link
  });
});

describe('tourContacts', () => {
  it('offers email, the booking app and the resume when the site has them', () => {
    expect(tourContacts(site)).toEqual({ email: 'you@example.com', calendar: null, resume: { appId: 'resume', title: 'Resume.pdf' } });
    const cal = { ...starterApp('calendar', 'cal-1', 30), title: 'Book a call' };
    const more = { ...site, site: { ...site.site, email: ' ' }, apps: [...site.apps, cal] };
    expect(tourContacts(more)).toEqual({ email: null, calendar: { appId: 'cal-1', title: 'Book a call' }, resume: { appId: 'resume', title: 'Resume.pdf' } });
  });
});

describe('tourStopsOnMove', () => {
  const withTour = (tour: SiteData['site']['tour']): SiteData => ({ ...site, site: { ...site.site, tour } });
  it('is on unless the owner switched it off', () => {
    expect(tourStopsOnMove(site)).toBe(true);
    expect(tourStopsOnMove(withTour({ stops: null }))).toBe(true);
    expect(tourStopsOnMove(withTour({ stops: null, stopOnMove: true }))).toBe(true);
    expect(tourStopsOnMove(withTour({ stops: null, stopOnMove: false }))).toBe(false);
  });
});

describe('tour URL params', () => {
  it('reads /?tour=1 and removes the tour params, keeping others', () => {
    expect(wantsTour('?tour=1')).toBe(true);
    expect(wantsTour('?tour=0')).toBe(false);
    expect(wantsTour('')).toBe(false);
    expect(withoutTourParams('?tour=1&tourSpeed=10&utm_source=x')).toBe('?utm_source=x');
    expect(withoutTourParams('?tour=1')).toBe('');
  });

  it('honours tourSpeed only outside production', () => {
    expect(readTourSpeed('?tourSpeed=10', false)).toBe(10);
    expect(readTourSpeed('?tourSpeed=10', true)).toBe(1);
    expect(readTourSpeed('?tourSpeed=abc', false)).toBe(1);
    expect(readTourSpeed('?tourSpeed=0.5', false)).toBe(1);
    expect(readTourSpeed('?tourSpeed=500', false)).toBe(20);
    expect(readTourSpeed('', false)).toBe(1);
  });
});
