import { describe, expect, it } from 'vitest';
import { seedSiteData } from '../seed';
import { initialAnswers, withName } from './answers';
import { applyWizardAnswers } from './applyAnswers';
import { withKit, wizardBase } from './kit';
import { reviewRows } from './review';

describe('reviewRows', () => {
  it('show the site as it will be published, with no changes', () => {
    const answers = initialAnswers(seedSiteData);
    expect(reviewRows(applyWizardAnswers(seedSiteData, answers), answers, 'none')).toEqual([
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
    expect(reviewRows(applyWizardAnswers(seedSiteData, answers), answers, 'none').map((r) => r.value)).toEqual([
      'Sam Taylor',
      'Sam Taylor \u2014 Portfolio',
      'New photo',
      'welcome to my studio.',
      'I design calm software.',
      'Dusk',
      'Lora headline, Inter text, Glass icons',
    ]);
  });

  it('start with the starting point when the kit question was asked: Classic until a kit is picked', () => {
    const answers = initialAnswers(seedSiteData);
    const rows = reviewRows(applyWizardAnswers(seedSiteData, answers), answers, 'first');
    expect(rows[0]).toEqual({ step: 'kit', label: 'Starting point', value: 'Classic' });
    expect(rows).toHaveLength(8);
    const teacher = withKit(answers, 'teacher', seedSiteData);
    expect(reviewRows(applyWizardAnswers(wizardBase(seedSiteData, 'teacher', false), teacher), teacher, 'first').map((r) => r.value)).toEqual([
      'Teacher',
      'Your Name',
      'Your Name \u2014 Classroom',
      'No change',
      'welcome to my classroom.',
      'Replace me with one line about you and your class.',
      'Chalkboard',
      'Patrick Hand headline, Nunito text, Pastel icons',
    ]);
  });

  it('on a re-run, name what no pick keeps, and warn when a kit is picked', () => {
    const answers = initialAnswers(seedSiteData);
    expect(reviewRows(applyWizardAnswers(seedSiteData, answers), answers, 'again')[0]).toEqual({ step: 'kit', label: 'Starting point', value: 'Keep my current site' });
    const classic = withKit(answers, 'classic', seedSiteData);
    expect(reviewRows(applyWizardAnswers(wizardBase(seedSiteData, 'classic', true), classic), classic, 'again')[0]).toEqual({
      step: 'kit',
      label: 'Starting point',
      value: 'Classic',
      warning: 'Picking a kit replaces your apps and their content. Published versions can be restored from version history; changes you haven\u2019t published can\u2019t.',
    });
  });

  it('call an uploaded wallpaper your own image', () => {
    const answers = { ...initialAnswers(seedSiteData), wallpaper: { kind: 'image' as const, imageUrl: '/api/dev-media/images/1-bg.png' } };
    expect(reviewRows(applyWizardAnswers(seedSiteData, answers), answers, 'none').find((r) => r.label === 'Wallpaper')?.value).toBe('Your own image');
  });
});
