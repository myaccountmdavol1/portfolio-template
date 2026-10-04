import { describe, expect, it } from 'vitest';
import { withDeepLinkFixture } from '../fixtures/deepLinkFixture';
import { seedSiteData } from '../seed';
import type { ScreensaverSettings, SiteData } from '../types';
import { chooseModule, pickModule, playableModules, resolveModule } from './registry';

const withSaver = (data: SiteData, screensaver: ScreensaverSettings): SiteData => ({ ...data, site: { ...data.site, screensaver } });

describe('resolveModule', () => {
  it('is on, with generated settings, until the owner changes it', () => {
    expect(resolveModule(seedSiteData, 'bounce')).toEqual({ id: 'bounce', name: 'Bouncing initials', on: true, settings: { text: 'YN' }, available: true, custom: false });
  });

  it('uses the owner’s switch and settings, and survives malformed ones', () => {
    const data = withSaver(seedSiteData, { modules: { bounce: { on: false, settings: { text: 'Sam' } }, hello: { settings: { words: 'x', finalLine: 3 } } } });
    expect(resolveModule(data, 'bounce')).toMatchObject({ on: false, settings: { text: 'Sam' }, custom: true });
    expect(resolveModule(data, 'hello').settings).toEqual(resolveModule(seedSiteData, 'hello').settings);
  });
});

describe('playableModules', () => {
  it('skips modules with nothing to show and ones switched off', () => {
    expect(playableModules(seedSiteData)).toEqual(['hello', 'facts', 'flurry', 'bounce']);
    expect(playableModules(withDeepLinkFixture(seedSiteData))).toEqual(['hello', 'memories', 'facts', 'flurry', 'bounce']);
    expect(playableModules(withSaver(seedSiteData, { modules: { hello: { on: false }, flurry: { on: false } } }))).toEqual(['facts', 'bounce']);
  });
});

describe('pickModule', () => {
  it('never shows the same one twice in a row when there is a choice', () => {
    expect(pickModule(['hello', 'facts'], 'hello', () => 0)).toBe('facts');
    let last = pickModule(['hello', 'facts', 'flurry'], null);
    for (let i = 0; i < 50; i++) {
      const next = pickModule(['hello', 'facts', 'flurry'], last);
      expect(next).not.toBe(last);
      last = next;
    }
  });

  it('repeats the only one, and has nothing to pick from an empty list', () => {
    expect(pickModule(['hello'], 'hello')).toBe('hello');
    expect(pickModule([], null)).toBeNull();
    expect(pickModule(['hello', 'facts', 'flurry'], null, () => 0.999)).toBe('flurry');
  });
});

describe('chooseModule', () => {
  it('shows the pinned module every time', () => {
    expect(chooseModule(withSaver(seedSiteData, { pinned: 'facts' }), 'facts', () => 0)).toBe('facts');
  });

  it('shuffles when the pinned one can’t play, and has nothing when nothing can', () => {
    expect(chooseModule(withSaver(seedSiteData, { pinned: 'drift' }), null, () => 0)).toBe('hello'); // no badge pictures
    const none = withSaver(seedSiteData, { modules: { hello: { on: false }, facts: { on: false }, flurry: { on: false }, bounce: { on: false } } });
    expect(chooseModule(none, null)).toBeNull();
  });
});
