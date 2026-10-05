import { resolveSiteFonts } from '../fonts';
import { ICON_PACKS } from '../iconCatalog';
import type { SiteData, SiteSettings } from '../types';
import { WALLPAPER_CATALOG } from '../wallpaper';
import type { WizardAnswers, WizardStep } from './answers';
import { startingPoint, type KitQuestion } from './kit';

export interface ReviewRow {
  /** The step its Edit button goes back to. */
  step: WizardStep;
  label: string;
  value: string;
  /** A caution shown under the value (a kit picked on a re-run). */
  warning?: string;
}

function wallpaperName(wallpaper: SiteSettings['wallpaper']): string {
  if (wallpaper.kind === 'image') return 'Your own image';
  return WALLPAPER_CATALOG.find((p) => p.id === wallpaper.preset)?.label ?? wallpaper.preset;
}

/** One line per answer for the Review step, read from the site as it will be published (`applied`). The starting point only when the kit question was asked. */
export function reviewRows(applied: SiteData, answers: WizardAnswers, question: KitQuestion): ReviewRow[] {
  const { site } = applied;
  const { heading, body } = resolveSiteFonts(site);
  const pack = ICON_PACKS.find((p) => p.id === site.style?.iconPack)?.label ?? 'Default';
  return [
    ...(question !== 'none' ? [{ step: 'kit' as const, label: 'Starting point', ...startingPoint(answers, question) }] : []),
    { step: 'you', label: 'Name', value: site.ownerName },
    { step: 'you', label: 'Site title', value: site.seo.title },
    { step: 'photo', label: 'Photo', value: answers.photoUrl ? 'New photo' : 'No change' },
    { step: 'headline', label: 'Headline', value: `${site.headline.line1} ${site.headline.line2}` },
    { step: 'headline', label: 'Bio', value: site.seo.description },
    { step: 'wallpaper', label: 'Wallpaper', value: wallpaperName(site.wallpaper) },
    { step: 'style', label: 'Style', value: `${heading.name} headline, ${body.name} text, ${pack} icons` },
  ];
}
