import { describe, expect, it } from 'vitest';
import { seedSiteData } from '../seed';
import type { AboutApp, SiteData } from '../types';
import { initialAnswers } from './answers';
import { applyWizardAnswers } from './applyAnswers';

const blank = initialAnswers(seedSiteData);
const about = (data: SiteData) => data.apps.find((a): a is AboutApp => a.type === 'about')!;
const PHOTO = 'https://x.public.blob.vercel-storage.com/images/1-me.png';

describe('applyWizardAnswers', () => {
  it('changes nothing when every answer is empty (or still the prefilled headline)', () => {
    expect(applyWizardAnswers(seedSiteData, blank)).toEqual(seedSiteData);
  });

  it('writes the name, title, headline and wallpaper, trimmed', () => {
    const next = applyWizardAnswers(seedSiteData, {
      ...blank,
      name: ' Sam Taylor ',
      title: 'Sam Taylor \u2014 Portfolio',
      headline1: 'hello, I\u2019m',
      headline2: ' Sam. ',
      wallpaper: { kind: 'preset', preset: 'dusk' },
    });
    expect(next.site.ownerName).toBe('Sam Taylor');
    expect(next.site.seo).toEqual({ ...seedSiteData.site.seo, title: 'Sam Taylor \u2014 Portfolio' });
    expect(next.site.headline).toEqual({ ...seedSiteData.site.headline, line1: 'hello, I\u2019m', line2: 'Sam.' });
    expect(next.site.wallpaper).toEqual({ kind: 'preset', preset: 'dusk' });
    expect(next.apps).toBe(seedSiteData.apps);
  });

  it('keeps the other headline fields', () => {
    const styled: SiteData = {
      ...seedSiteData,
      site: { ...seedSiteData.site, headline: { ...seedSiteData.site.headline, showOnPhone: true, style: { size: 120, position: 'top' } } },
    };
    const next = applyWizardAnswers(styled, { ...initialAnswers(styled), headline2: 'studio.' });
    expect(next.site.headline).toEqual({ ...styled.site.headline, line2: 'studio.' });
  });

  it('puts the photo and bio in the About app, and the bio in the site description', () => {
    const next = applyWizardAnswers(seedSiteData, { ...blank, photoUrl: PHOTO, bio: ' I design calm software. ' });
    expect(about(next).content.media).toEqual({ kind: 'image', url: PHOTO });
    expect(about(next).content.bio).toEqual({ blocks: [{ type: 'paragraph', text: 'I design calm software.' }] });
    expect(next.site.seo.description).toBe('I design calm software.');
    // Everything else in the About app, and every other app, is untouched.
    expect({ ...about(next).content, media: about(seedSiteData).content.media, bio: about(seedSiteData).content.bio }).toEqual(about(seedSiteData).content);
    expect(next.apps.filter((a) => a.type !== 'about')).toEqual(seedSiteData.apps.filter((a) => a.type !== 'about'));
  });

  it('keeps the About app\u2019s photo when none was uploaded', () => {
    const next = applyWizardAnswers(seedSiteData, { ...blank, bio: 'Hi.' });
    expect(about(next).content.media).toEqual(about(seedSiteData).content.media);
  });

  it('finds the About app by its kind, whatever its id and position', () => {
    const moved: SiteData = { ...seedSiteData, apps: seedSiteData.apps.map((a) => (a.type === 'about' ? { ...a, id: 'me' } : a)).reverse() };
    const next = applyWizardAnswers(moved, { ...blank, photoUrl: PHOTO });
    expect(about(next).id).toBe('me');
    expect(about(next).content.media.url).toBe(PHOTO);
  });

  it('without an About app, still writes the bio to the site description', () => {
    const none: SiteData = { ...seedSiteData, apps: seedSiteData.apps.filter((a) => a.type !== 'about') };
    const next = applyWizardAnswers(none, { ...blank, photoUrl: PHOTO, bio: 'Hi.' });
    expect(next.apps).toEqual(none.apps);
    expect(next.site.seo.description).toBe('Hi.');
  });

  it('merges style picks with the existing style', () => {
    const styled: SiteData = { ...seedSiteData, site: { ...seedSiteData.site, style: { headingFont: 'lora', iconPack: 'glass' } } };
    expect(applyWizardAnswers(styled, { ...blank, style: { bodyFont: 'inter' } }).site.style).toEqual({ headingFont: 'lora', bodyFont: 'inter', iconPack: 'glass' });
    expect(applyWizardAnswers(styled, { ...blank, style: { headingFont: 'fraunces' } }).site.style).toEqual({ headingFont: 'fraunces', iconPack: 'glass' });
    expect(applyWizardAnswers(seedSiteData, { ...blank, style: { iconPack: 'outline' } }).site.style).toEqual({ iconPack: 'outline' });
  });

  it('does not change its input', () => {
    const before = structuredClone(seedSiteData);
    applyWizardAnswers(seedSiteData, { ...blank, name: 'Sam', photoUrl: PHOTO, bio: 'Hi.', wallpaper: { kind: 'preset', preset: 'mint' }, style: { bodyFont: 'inter' } });
    expect(seedSiteData).toEqual(before);
  });
});
