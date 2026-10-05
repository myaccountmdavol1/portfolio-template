import type { KeyValueStore } from '../editor/backend';
import { fontById } from '../fonts';
import { isPackId } from '../iconCatalog';
import type { SiteData, SiteSettings, SiteStyle } from '../types';
import { WALLPAPER_CATALOG } from '../wallpaper';

// The setup wizard's steps and answers (src/components/setup). The answers stay in this browser until setup is
// finished, so leaving and coming back resumes; applyWizardAnswers (applyAnswers.ts) writes them into the site.

export const WIZARD_STEPS = ['welcome', 'you', 'photo', 'headline', 'wallpaper', 'style', 'review', 'publish', 'live'] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

/** The steps shown as progress dots: the questions and Review. */
export const PROGRESS_STEPS: { step: WizardStep; label: string }[] = [
  { step: 'you', label: 'You' },
  { step: 'photo', label: 'Photo' },
  { step: 'headline', label: 'Headline & bio' },
  { step: 'wallpaper', label: 'Wallpaper' },
  { step: 'style', label: 'Style' },
  { step: 'review', label: 'Review' },
];

export const STEP_TITLES: Record<WizardStep, string> = {
  welcome: 'Let\u2019s set up your site',
  you: 'About you',
  photo: 'Your photo',
  headline: 'Headline & bio',
  wallpaper: 'Wallpaper',
  style: 'Pick your style',
  review: 'Review',
  publish: 'Publishing\u2026',
  live: 'Your site is live',
};

export interface WizardAnswers {
  name: string;
  /** The site title. It follows the name ("<name> \u2014 Portfolio") until the owner types their own. */
  title: string;
  titleEdited: boolean;
  /** An uploaded photo's URL; '' = keep the About app's photo. */
  photoUrl: string;
  headline1: string;
  headline2: string;
  /** True once the owner has typed in a headline field. Until then the headline follows the site when the wizard resumes. */
  headlineEdited: boolean;
  /** One line, for the About app and the site description. */
  bio: string;
  /** null = keep the current wallpaper. */
  wallpaper: SiteSettings['wallpaper'] | null;
  /** Only the picks made in the wizard; the rest of the site's style is kept. */
  style: SiteStyle;
}

/** Empty answers (an empty answer leaves its field as it is), with the headline prefilled from the site. */
export function initialAnswers(data: SiteData): WizardAnswers {
  return {
    name: '',
    title: '',
    titleEdited: false,
    photoUrl: '',
    headline1: data.site.headline.line1,
    headline2: data.site.headline.line2,
    headlineEdited: false,
    bio: '',
    wallpaper: null,
    style: {},
  };
}

/** Resumed answers: a headline the owner never edited is refilled from the current start data (the editor may have changed it since). */
export function resumeAnswers(answers: WizardAnswers, data: SiteData): WizardAnswers {
  if (answers.headlineEdited) return answers;
  return { ...answers, headline1: data.site.headline.line1, headline2: data.site.headline.line2 };
}

export function titleFor(name: string): string {
  const trimmed = name.trim();
  return trimmed ? `${trimmed} \u2014 Portfolio` : '';
}

export function withName(answers: WizardAnswers, name: string): WizardAnswers {
  return { ...answers, name, title: answers.titleEdited ? answers.title : titleFor(name) };
}

export function withTitle(answers: WizardAnswers, title: string): WizardAnswers {
  return { ...answers, title, titleEdited: true };
}

export function nextStep(step: WizardStep): WizardStep {
  return WIZARD_STEPS[Math.min(WIZARD_STEPS.indexOf(step) + 1, WIZARD_STEPS.length - 1)];
}

export function previousStep(step: WizardStep): WizardStep {
  return WIZARD_STEPS[Math.max(WIZARD_STEPS.indexOf(step) - 1, 0)];
}

/** Coming back mid-publish (or after it) lands on Review, with the answers. */
export function resumeStep(step: WizardStep): WizardStep {
  return step === 'publish' || step === 'live' ? 'review' : step;
}

export const SETUP_WIZARD_KEY = 'portfolio:setupWizard';

export interface SavedWizard {
  step: WizardStep;
  answers: WizardAnswers;
}

const TEXT_ANSWERS = ['name', 'title', 'photoUrl', 'headline1', 'headline2', 'bio'] as const;
const STYLE_KEYS = ['headingFont', 'bodyFont', 'iconPack'] as const;

/** A clean wallpaper built from known fields only, or null when it isn't a valid one. */
function cleanWallpaper(value: unknown): SiteSettings['wallpaper'] | null {
  const w = value as { kind?: unknown; preset?: unknown; color?: unknown; imageUrl?: unknown; tone?: unknown } | null;
  if (!w || typeof w !== 'object') return null;
  if (w.kind === 'preset') {
    const preset = WALLPAPER_CATALOG.find((p) => p.id === w.preset)?.id;
    if (!preset) return null;
    return typeof w.color === 'string' && /^#[0-9a-f]{6}$/i.test(w.color) ? { kind: 'preset', preset, color: w.color } : { kind: 'preset', preset };
  }
  if (w.kind === 'image' && typeof w.imageUrl === 'string' && w.imageUrl) {
    return w.tone === 'light' || w.tone === 'dark' ? { kind: 'image', imageUrl: w.imageUrl, tone: w.tone } : { kind: 'image', imageUrl: w.imageUrl };
  }
  return null;
}

/** Saved answers, or null when there are none or they aren't in the expected shape (e.g. from an older version). */
export function parseSavedWizard(raw: string | null): SavedWizard | null {
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as { step?: unknown; answers?: Record<string, unknown> } | null;
    const a = saved?.answers;
    if (!saved || !WIZARD_STEPS.includes(saved.step as WizardStep) || !a || typeof a !== 'object') return null;
    if (!TEXT_ANSWERS.every((key) => typeof a[key] === 'string') || typeof a.titleEdited !== 'boolean') return null;
    // A wallpaper that's no longer valid (e.g. a photo removed in a later version) is dropped; the other answers stay.
    const wallpaper = cleanWallpaper(a.wallpaper);
    if (!a.style || typeof a.style !== 'object' || Array.isArray(a.style)) return null;
    const style: SiteStyle = {};
    for (const key of STYLE_KEYS) {
      const value = (a.style as Record<string, unknown>)[key];
      if (typeof value !== 'string') continue;
      if (key === 'iconPack' ? isPackId(value) : fontById(value)) style[key] = value;
    }
    return {
      step: saved.step as WizardStep,
      answers: {
        name: a.name as string,
        title: a.title as string,
        titleEdited: a.titleEdited,
        photoUrl: a.photoUrl as string,
        headline1: a.headline1 as string,
        headline2: a.headline2 as string,
        // Saved before this flag existed: not edited.
        headlineEdited: a.headlineEdited === true,
        bio: a.bio as string,
        wallpaper,
        style,
      },
    };
  } catch {
    return null;
  }
}

export function loadSavedWizard(store: KeyValueStore): SavedWizard | null {
  try {
    return parseSavedWizard(store.getItem(SETUP_WIZARD_KEY));
  } catch {
    return null;
  }
}

export function saveWizard(store: KeyValueStore, saved: SavedWizard): void {
  try {
    store.setItem(SETUP_WIZARD_KEY, JSON.stringify(saved));
  } catch {
    // storage full or blocked: the wizard still works, it just can't resume
  }
}

export function clearSavedWizard(store: KeyValueStore): void {
  try {
    store.removeItem(SETUP_WIZARD_KEY);
  } catch {
    // ignore
  }
}
