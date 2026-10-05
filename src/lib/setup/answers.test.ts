import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '../editor/backend';
import { seedSiteData } from '../seed';
import {
  clearSavedWizard,
  initialAnswers,
  loadSavedWizard,
  nextStep,
  parseSavedWizard,
  resumeAnswers,
  previousStep,
  PROGRESS_STEPS,
  resumeStep,
  saveWizard,
  SETUP_WIZARD_KEY,
  titleFor,
  withName,
  withTitle,
  WIZARD_STEPS,
  type SavedWizard,
} from './answers';

function memoryStore() {
  const items = new Map<string, string>();
  const store: KeyValueStore = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
  return { store, items };
}

const sample: SavedWizard = {
  step: 'headline',
  answers: {
    ...initialAnswers(seedSiteData),
    name: 'Sam Taylor',
    title: 'Sam Taylor \u2014 Portfolio',
    photoUrl: '/api/dev-media/images/1-me.png',
    bio: 'I design calm software.',
    wallpaper: { kind: 'preset', preset: 'dots', color: '#ff375f' },
    style: { headingFont: 'lora', iconPack: 'glass' },
  },
};

describe('wizard steps', () => {
  it('run from Welcome to Your site is live, with progress dots for the questions and Review', () => {
    expect(WIZARD_STEPS).toEqual(['welcome', 'you', 'photo', 'headline', 'wallpaper', 'style', 'review', 'publish', 'live']);
    expect(PROGRESS_STEPS.map((p) => p.step)).toEqual(['you', 'photo', 'headline', 'wallpaper', 'style', 'review']);
    expect(nextStep('welcome')).toBe('you');
    expect(nextStep('style')).toBe('review');
    expect(nextStep('live')).toBe('live');
    expect(previousStep('you')).toBe('welcome');
    expect(previousStep('welcome')).toBe('welcome');
  });

  it('resume at Review rather than mid-publish or after it', () => {
    expect(resumeStep('publish')).toBe('review');
    expect(resumeStep('live')).toBe('review');
    expect(resumeStep('photo')).toBe('photo');
  });
});

describe('answers', () => {
  it('start empty, with the headline prefilled from the site', () => {
    expect(initialAnswers(seedSiteData)).toEqual({
      name: '',
      title: '',
      titleEdited: false,
      photoUrl: '',
      headline1: 'welcome to my',
      headline2: 'portfolio.',
      headlineEdited: false,
      bio: '',
      wallpaper: null,
      style: {},
    });
  });

  it('the title follows the name until the owner edits it', () => {
    expect(titleFor(' Ana ')).toBe('Ana \u2014 Portfolio');
    expect(titleFor('  ')).toBe('');
    let a = withName(initialAnswers(seedSiteData), 'Sam Taylor');
    expect(a.title).toBe('Sam Taylor \u2014 Portfolio');
    a = withName(a, '');
    expect(a.title).toBe('');
    a = withTitle(withName(a, 'Sam'), 'Sam\u2019s studio');
    expect(a.titleEdited).toBe(true);
    a = withName(a, 'Sam Taylor');
    expect(a.title).toBe('Sam\u2019s studio');
  });
});

describe('resumeAnswers', () => {
  const edited = { ...seedSiteData, site: { ...seedSiteData.site, headline: { ...seedSiteData.site.headline, line1: 'hello from', line2: 'the editor.' } } };

  it('refills a headline the owner never edited from the current start data', () => {
    const resumed = resumeAnswers(initialAnswers(seedSiteData), edited);
    expect(resumed.headline1).toBe('hello from');
    expect(resumed.headline2).toBe('the editor.');
  });

  it('keeps a headline the owner edited', () => {
    const typed = { ...initialAnswers(seedSiteData), headline1: 'my own', headline2: 'words.', headlineEdited: true };
    expect(resumeAnswers(typed, edited)).toEqual(typed);
  });
});

describe('saved answers', () => {
  it('accept data saved before headlineEdited existed, as not edited', () => {
    const { headlineEdited: _unused, ...old } = sample.answers;
    void _unused;
    const parsed = parseSavedWizard(JSON.stringify({ ...sample, answers: old }));
    expect(parsed?.answers.headlineEdited).toBe(false);
  });

  it('round-trip through browser storage, and clear', () => {
    const { store, items } = memoryStore();
    expect(loadSavedWizard(store)).toBeNull();
    saveWizard(store, sample);
    expect(items.has(SETUP_WIZARD_KEY)).toBe(true);
    expect(loadSavedWizard(store)).toEqual(sample);
    clearSavedWizard(store);
    expect(loadSavedWizard(store)).toBeNull();
  });

  it('ignore missing, broken or wrongly shaped data', () => {
    expect(parseSavedWizard(null)).toBeNull();
    expect(parseSavedWizard('{')).toBeNull();
    expect(parseSavedWizard(JSON.stringify({ ...sample, step: 'nope' }))).toBeNull();
    expect(parseSavedWizard(JSON.stringify({ ...sample, answers: { ...sample.answers, name: 3 } }))).toBeNull();
    expect(parseSavedWizard(JSON.stringify({ ...sample, answers: { ...sample.answers, titleEdited: 'yes' } }))).toBeNull();
    expect(parseSavedWizard(JSON.stringify({ ...sample, answers: { ...sample.answers, style: [] } }))).toBeNull();
  });

  it('keep only a valid wallpaper, built from known fields', () => {
    const wp = (wallpaper: unknown) => JSON.stringify({ ...sample, answers: { ...sample.answers, wallpaper } });
    expect(parseSavedWizard(wp({ kind: 'preset', preset: 'nope' }))?.answers).toEqual({ ...sample.answers, wallpaper: null });
    expect(parseSavedWizard(wp({ kind: 'video' }))?.answers.wallpaper).toBeNull();
    expect(parseSavedWizard(wp({ kind: 'preset', preset: 'dots', color: 'red' }))?.answers.wallpaper).toEqual({ kind: 'preset', preset: 'dots' });
    expect(parseSavedWizard(wp({ kind: 'preset', preset: 'dots', color: '#FF375F', extra: 1 }))?.answers.wallpaper).toEqual({ kind: 'preset', preset: 'dots', color: '#FF375F' });
    expect(parseSavedWizard(wp({ kind: 'image', imageUrl: '/a.png', tone: 'grey', extra: 1 }))?.answers.wallpaper).toEqual({ kind: 'image', imageUrl: '/a.png' });
    expect(parseSavedWizard(wp({ kind: 'image', imageUrl: '' }))?.answers.wallpaper).toBeNull();
  });

  it('keep only known style picks', () => {
    const raw = JSON.stringify({ ...sample, answers: { ...sample.answers, style: { headingFont: 'lora', bodyFont: 'not-a-font', iconPack: 'Bad Pack!', accent: '#000' } } });
    expect(parseSavedWizard(raw)?.answers.style).toEqual({ headingFont: 'lora' });
  });

  it('never throw when storage is blocked', () => {
    const blocked: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadSavedWizard(blocked)).toBeNull();
    expect(() => saveWizard(blocked, sample)).not.toThrow();
    expect(() => clearSavedWizard(blocked)).not.toThrow();
  });
});
