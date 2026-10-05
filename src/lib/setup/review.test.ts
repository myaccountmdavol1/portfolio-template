import { describe, expect, it } from 'vitest';
import { seedSiteData } from '../seed';
import { initialAnswers, withName } from './answers';
import { applyWizardAnswers } from './applyAnswers';
import { reviewRows } from './review';

describe('reviewRows', () => {
  it('show the site as it will be published, with no changes', () => {
    const answers = initialAnswers(seedSiteData);
    expect(reviewRows(applyWizardAnswers(seedSiteData, answers), answers)).toEqual([
      { step: 'you', label: 'Name', value: 'Your Name' },
      { step: 'you', label: 'Site title', value: 'Your Name \u2014 Portfolio' },
      { step: 'photo', label: 'Photo', value: 'No change' },
      { step: 'headline', label: 'Headline', value: 'welcome to my portfolio.' },
      { step: 'headline', label: 'Bio', value: 'A quick look around my desktop.' },
      { step: 'wallpaper', label: 'Wallpaper', value: 'Sky' },
      { step: 'style', label: 'Style', value: 'Instrument Serif headline, Geist text, Default icons' },
    ]);
  });

  it('show every answer', () => {
    const answers = {
      ...withName(initialAnswers(seedSiteData), 'Sam Taylor'),
      photoUrl: '/api/dev-media/images/1-me.png',
      headline2: 'studio.',
      bio: 'I design calm software.',
      wallpaper: { kind: 'preset' as const, preset: 'dusk' as const },
      style: { headingFont: 'lora', bodyFont: 'inter', iconPack: 'glass' },
    };
    expect(reviewRows(applyWizardAnswers(seedSiteData, answers), answers).map((r) => r.value)).toEqual([
      'Sam Taylor',
      'Sam Taylor \u2014 Portfolio',
      'New photo',
      'welcome to my studio.',
      'I design calm software.',
      'Dusk',
      'Lora headline, Inter text, Glass icons',
    ]);
  });

  it('call an uploaded wallpaper your own image', () => {
    const answers = { ...initialAnswers(seedSiteData), wallpaper: { kind: 'image' as const, imageUrl: '/api/dev-media/images/1-bg.png' } };
    expect(reviewRows(applyWizardAnswers(seedSiteData, answers), answers).find((r) => r.label === 'Wallpaper')?.value).toBe('Your own image');
  });
});
