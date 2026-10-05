import { describe, expect, it } from 'vitest';
import { seedSiteData } from '../seed';
import { kitById } from '../starterKits';
import type { AboutApp, SiteData } from '../types';
import { initialAnswers, withName, type SavedWizard } from './answers';
import { applyWizardAnswers } from './applyAnswers';
import { KEEP_CURRENT, KIT_WARNING, kitQuestion, openWizard, resumeWizard, startingPoint, withKit, wizardBase } from './kit';

const blank = initialAnswers(seedSiteData);
const about = (data: SiteData) => data.apps.find((a): a is AboutApp => a.type === 'about')!;
/** What the wizard publishes for these answers. */
const applied = (answers: typeof blank) => applyWizardAnswers(wizardBase(seedSiteData, answers.kit, false), answers);

describe('wizardBase', () => {
  it('is the picked kit\u2019s site, else where the wizard started', () => {
    expect(wizardBase(seedSiteData, 'teacher', false)).toStrictEqual(kitById('teacher')!.build());
    expect(wizardBase(seedSiteData, undefined, false)).toBe(seedSiteData);
    expect(wizardBase(seedSiteData, 'astronaut', false)).toBe(seedSiteData);
    expect(wizardBase(seedSiteData, undefined, true)).toBe(seedSiteData);
  });

  it('on a first run with a kit, is the kit\u2019s build plus the answers', () => {
    const answers = withKit({ ...blank, name: 'Ada' }, 'teacher', seedSiteData);
    expect(applied(answers)).toStrictEqual(applyWizardAnswers(kitById('teacher')!.build(), answers));
  });

  it('on a re-run with a kit, replaces the apps, layout and look but keeps the owner\u2019s settings', () => {
    const start: SiteData = {
      ...seedSiteData,
      site: {
        ...seedSiteData.site,
        ownerName: 'Ada Lovelace',
        email: 'ada@example.org',
        screensaver: { enabled: false },
        seo: { title: 'Ada \u2014 Notes', description: 'Mine.' },
        tour: { stops: [{ open: 'p1', caption: 'My project' }], showButton: false },
      },
    };
    const kit = kitById('professional')!.build();
    const base = wizardBase(start, 'professional', true);
    expect(base.apps).toStrictEqual(kit.apps);
    expect(base.layout).toStrictEqual(kit.layout);
    expect(base.site.wallpaper).toStrictEqual(kit.site.wallpaper);
    expect(base.site.style).toStrictEqual(kit.site.style);
    expect(base.site.headline).toStrictEqual(kit.site.headline);
    expect(base.site.menuBar).toStrictEqual(kit.site.menuBar);
    expect(base.site.ownerName).toBe('Ada Lovelace');
    expect(base.site.email).toBe('ada@example.org');
    expect(base.site.screensaver).toEqual({ enabled: false });
    expect(base.site.seo.title).toBe('Ada \u2014 Notes');
    expect(base.site.accent).toBe(start.site.accent);
    // Tour stops pointed at the old apps: they stop, the rest of the tour settings stay.
    expect(base.site.tour).toEqual({ stops: null, showButton: false });
  });
});

describe('withKit', () => {
  it('sets the kit, and the headline follows it until the owner types one', () => {
    const teacher = withKit(blank, 'teacher', seedSiteData);
    expect(teacher.kit).toBe('teacher');
    expect([teacher.headline1, teacher.headline2]).toEqual(['welcome to my', 'classroom.']);
    expect(withKit(teacher, 'classic', seedSiteData).headline2).toBe('portfolio.');
    const typed = { ...teacher, headline2: 'studio.', headlineEdited: true };
    expect(withKit(typed, 'professional', seedSiteData).headline2).toBe('studio.');
  });

  it('ignores an unknown kit, and no kit keeps the site as it is', () => {
    expect(withKit({ ...blank, kit: 'teacher' }, 'astronaut', seedSiteData)).toEqual(blank);
    expect(withKit(withKit(blank, 'teacher', seedSiteData), undefined, seedSiteData)).toEqual(blank);
  });

  it('starts the Wallpaper and Style steps on the kit\u2019s look', () => {
    const site = applied(withKit(blank, 'teacher', seedSiteData)).site;
    expect(site.wallpaper).toEqual({ kind: 'preset', preset: 'chalkboard' });
    expect(site.style).toEqual({ headingFont: 'patrick-hand', bodyFont: 'nunito', iconPack: 'pastel' });
  });

  it('switching kits changes the look, but never what the owner picked', () => {
    let answers = withKit(blank, 'teacher', seedSiteData);
    answers = withKit(answers, 'professional', seedSiteData);
    expect(applied(answers).site.wallpaper).toEqual({ kind: 'preset', preset: 'midnight' });
    expect(applied(answers).site.style).toEqual({ headingFont: 'fraunces', bodyFont: 'inter', iconPack: 'mono-light' });
    // The owner picks a wallpaper and a headline font; another kit keeps both and brings the rest of its look.
    answers = { ...answers, wallpaper: { kind: 'preset', preset: 'dusk' }, style: { headingFont: 'lora' } };
    answers = withKit(answers, 'student', seedSiteData);
    expect(applied(answers).site.wallpaper).toEqual({ kind: 'preset', preset: 'dusk' });
    expect(applied(answers).site.style).toEqual({ headingFont: 'lora', bodyFont: 'inter', iconPack: 'glass' });
  });

  it('Classic brings back the sample\u2019s own look', () => {
    const answers = withKit(withKit(blank, 'creative', seedSiteData), 'classic', seedSiteData);
    expect(applied(answers)).toStrictEqual(seedSiteData);
  });

  it('the other answers land on top of the kit', () => {
    const answers = { ...withName(withKit(blank, 'teacher', seedSiteData), 'Sam Taylor'), photoUrl: '/api/dev-media/images/1-me.png', bio: 'I teach Grade 5.' };
    const data = applied(answers);
    expect(data.site.ownerName).toBe('Sam Taylor');
    expect(data.site.seo).toEqual({ title: 'Sam Taylor \u2014 Portfolio', description: 'I teach Grade 5.' });
    expect(about(data).content.media).toEqual({ kind: 'image', url: '/api/dev-media/images/1-me.png' });
    expect(about(data).content.bio).toEqual({ blocks: [{ type: 'paragraph', text: 'I teach Grade 5.' }] });
    expect(data.apps.map((a) => a.id)).toEqual(kitById('teacher')!.build().apps.map((a) => a.id));
  });
});

describe('resumeWizard', () => {
  const saved: SavedWizard = { step: 'kit', answers: withKit(blank, 'teacher', seedSiteData) };

  it('keeps the kit while the question is still offered', () => {
    expect(resumeWizard(saved, seedSiteData, true)).toEqual(saved);
  });

  it('drops the kit once the site was edited, so the edits are kept, and resumes at About you', () => {
    const edited: SiteData = { ...seedSiteData, site: { ...seedSiteData.site, headline: { ...seedSiteData.site.headline, line2: 'studio.' } } };
    const resumed = resumeWizard(saved, edited, false);
    expect(resumed.step).toBe('you');
    expect(resumed.answers).not.toHaveProperty('kit');
    // The headline the owner never typed follows the edited site, not the dropped kit.
    expect(resumed.answers.headline2).toBe('studio.');
    expect(applyWizardAnswers(wizardBase(edited, resumed.answers.kit, false), resumed.answers)).toStrictEqual(edited);
  });

  it('resumes past publishing at Review, with the kit', () => {
    expect(resumeWizard({ ...saved, step: 'live' }, seedSiteData, true)).toEqual({ ...saved, step: 'review' });
  });
});

describe('kitQuestion and openWizard', () => {
  const edited: SiteData = { ...seedSiteData, site: { ...seedSiteData.site, ownerName: 'Sam Taylor' } };
  const saved: SavedWizard = { step: 'photo', answers: { ...withKit(blank, 'teacher', seedSiteData), name: 'Old answer' } };

  it('asks on a first run only while the site is the sample, and always on a re-run', () => {
    expect(kitQuestion(seedSiteData, false)).toBe('first');
    expect(kitQuestion(edited, false)).toBe('none');
    expect(kitQuestion(edited, true)).toBe('again');
    expect(kitQuestion(seedSiteData, true)).toBe('again');
  });

  it('a first run resumes saved answers, else starts at Welcome', () => {
    expect(openWizard(seedSiteData, saved, false)).toEqual({ question: 'first', wizard: saved });
    expect(openWizard(edited, null, false)).toEqual({ question: 'none', wizard: { step: 'welcome', answers: initialAnswers(edited) } });
  });

  it('a re-run starts fresh on the kit step from the current site, ignoring saved answers', () => {
    expect(openWizard(edited, saved, true)).toEqual({ question: 'again', wizard: { step: 'kit', answers: initialAnswers(edited) } });
    expect(applyWizardAnswers(wizardBase(edited, undefined, false), initialAnswers(edited))).toStrictEqual(edited);
  });
});

describe('startingPoint', () => {
  it('names the kit, or what no pick means: the sample on a first run, the current site on a re-run', () => {
    expect(startingPoint(blank, 'first')).toEqual({ value: 'Classic' });
    expect(startingPoint({ ...blank, kit: 'teacher' }, 'first')).toEqual({ value: 'Teacher' });
    expect(startingPoint(blank, 'again')).toEqual({ value: KEEP_CURRENT });
  });

  it('warns on a re-run whenever a kit is picked, Classic included', () => {
    expect(startingPoint({ ...blank, kit: 'teacher' }, 'again')).toEqual({ value: 'Teacher', warning: KIT_WARNING });
    expect(startingPoint({ ...blank, kit: 'classic' }, 'again')).toEqual({ value: 'Classic', warning: KIT_WARNING });
    expect(KIT_WARNING).toBe('Picking a kit replaces your apps and their content. Published versions can be restored from version history; changes you haven\u2019t published can\u2019t.');
  });
});
