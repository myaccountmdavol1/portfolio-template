import { CLASSIC_ID, isUntouchedSample, kitById } from '../starterKits';
import type { SiteData } from '../types';
import { initialAnswers, resumeAnswers, resumeStep, type SavedWizard, type WizardAnswers } from './answers';

// The starter kit question. The kit's site is the base the other answers are written onto, so its look (wallpaper,
// fonts, icon pack) is where the Wallpaper and Style steps start: an owner's own pick there (answers.wallpaper,
// answers.style) wins over any kit, and switching kits changes only what the owner hasn't picked.

/**
 * How this run asks the kit question:
 * - 'first': setup's first run on a site that is still the untouched sample. No pick = the sample (Classic).
 * - 'again': "Run setup again" from the editor (/setup?again=1). Always asked; no pick = keep the current site.
 * - 'none': not asked (the site was edited before the first run finished).
 */
export type KitQuestion = 'none' | 'first' | 'again';

/** The re-run's first card: no kit, the site as it is. */
export const KEEP_CURRENT = 'Keep my current site';

/** Shown on a re-run whenever a kit is picked: on its card and on Review. */
export const KIT_WARNING =
  'Picking a kit replaces your apps and their content. Published versions can be restored from version history; changes you haven\u2019t published can\u2019t.';

export function kitQuestion(start: SiteData, again: boolean): KitQuestion {
  if (again) return 'again';
  return isUntouchedSample(start) ? 'first' : 'none';
}

/**
 * The site the answers are written onto: the picked kit's, else where the wizard started. On a re-run a kit replaces
 * only the apps, the layout and the look (wallpaper, style, headline, menu bar); every other setting (name, email,
 * links, accent, SEO, screen saver, call...) stays the owner's. Settings that point at apps the kit doesn't have
 * (tour stops, the call's answer action) fall back so nothing references a missing app.
 */
export function wizardBase(start: SiteData, kit: string | undefined, again: boolean): SiteData {
  const picked = kitById(kit)?.build();
  if (!picked) return start;
  if (!again) return picked;
  const ids = new Set(picked.apps.map((a) => a.id));
  const site: SiteData['site'] = {
    ...start.site,
    wallpaper: picked.site.wallpaper,
    style: picked.site.style,
    headline: picked.site.headline,
    menuBar: picked.site.menuBar,
  };
  if (site.tour?.stops) site.tour = { ...site.tour, stops: null };
  const target = /^openApp:(.+)$/.exec(site.incomingCall.answerAction)?.[1];
  if (target && !ids.has(target)) site.incomingCall = { ...site.incomingCall, answerAction: picked.site.incomingCall.answerAction };
  return { site, apps: picked.apps, layout: picked.layout };
}

/**
 * The answers with a kit picked (undefined = no kit: keep the site as it is). A headline the owner never typed
 * follows the kit (e.g. "welcome to my classroom.").
 */
export function withKit(answers: WizardAnswers, kit: string | undefined, start: SiteData, again = false): WizardAnswers {
  const { kit: _previous, ...rest } = answers;
  void _previous;
  const next: WizardAnswers = kit && kitById(kit) ? { ...rest, kit } : rest;
  return resumeAnswers(next, wizardBase(start, next.kit, again));
}

/**
 * Saved answers, picked up again. When the kit question isn't offered any more (the site was edited since), the
 * saved kit is dropped, so a kit never replaces real edits, and a saved kit step resumes at About you.
 */
export function resumeWizard(saved: SavedWizard, start: SiteData, offerKits: boolean): SavedWizard {
  const { kit, ...rest } = saved.answers;
  const answers: WizardAnswers = offerKits && kit ? { ...rest, kit } : rest;
  return { step: resumeStep(saved.step, offerKits), answers: resumeAnswers(answers, wizardBase(start, answers.kit, false)) };
}

/**
 * Where the wizard opens. A re-run starts fresh on the kit step and ignores saved answers; a first run resumes saved
 * answers, else starts at Welcome.
 */
export function openWizard(start: SiteData, saved: SavedWizard | null, again: boolean): { question: KitQuestion; wizard: SavedWizard } {
  const question = kitQuestion(start, again);
  if (question === 'again') return { question, wizard: { step: 'kit', answers: initialAnswers(start) } };
  const offerKits = question !== 'none';
  return { question, wizard: saved ? resumeWizard(saved, start, offerKits) : { step: 'welcome', answers: initialAnswers(start) } };
}

/** The Starting point line on Review: the picked kit, else what no pick means; on a re-run, a picked kit carries the warning. */
export function startingPoint(answers: WizardAnswers, question: KitQuestion): { value: string; warning?: string } {
  const kit = kitById(answers.kit);
  if (kit) return question === 'again' ? { value: kit.name, warning: KIT_WARNING } : { value: kit.name };
  return { value: question === 'again' ? KEEP_CURRENT : kitById(CLASSIC_ID)!.name };
}
