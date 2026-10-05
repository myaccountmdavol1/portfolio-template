import type { PortfolioApp, SiteData, SiteSettings, SiteStyle } from '../types';
import type { WizardAnswers } from './answers';

/** The About app the wizard writes to: the first visible one, else the first. */
function aboutAppId(apps: PortfolioApp[]): string | null {
  return (apps.find((a) => a.type === 'about' && a.visible) ?? apps.find((a) => a.type === 'about'))?.id ?? null;
}

/**
 * The site with the setup wizard's answers written in. An empty answer leaves its field as it is.
 * - name -> site.ownerName; title -> site.seo.title
 * - photo -> the About app's content.media (an image)
 * - headline lines -> site.headline.line1 / line2 (other headline fields kept)
 * - bio -> the About app's content.bio (one paragraph) and site.seo.description
 * - wallpaper -> site.wallpaper; style -> merged into site.style
 */
export function applyWizardAnswers(data: SiteData, answers: WizardAnswers): SiteData {
  const name = answers.name.trim();
  const title = answers.title.trim();
  const line1 = answers.headline1.trim();
  const line2 = answers.headline2.trim();
  const bio = answers.bio.trim();
  const photoUrl = answers.photoUrl.trim();
  const picks: SiteStyle = Object.fromEntries(Object.entries(answers.style).filter(([, value]) => typeof value === 'string' && value));

  const site: SiteSettings = {
    ...data.site,
    ...(name ? { ownerName: name } : {}),
    headline: { ...data.site.headline, ...(line1 ? { line1 } : {}), ...(line2 ? { line2 } : {}) },
    seo: { ...data.site.seo, ...(title ? { title } : {}), ...(bio ? { description: bio } : {}) },
    ...(answers.wallpaper ? { wallpaper: answers.wallpaper } : {}),
    ...(Object.keys(picks).length > 0 ? { style: { ...data.site.style, ...picks } } : {}),
  };

  const aboutId = photoUrl || bio ? aboutAppId(data.apps) : null;
  const apps = aboutId
    ? data.apps.map((app) =>
        app.type === 'about' && app.id === aboutId
          ? {
              ...app,
              content: {
                ...app.content,
                ...(photoUrl ? { media: { kind: 'image' as const, url: photoUrl } } : {}),
                ...(bio ? { bio: { blocks: [{ type: 'paragraph' as const, text: bio }] } } : {}),
              },
            }
          : app,
      )
    : data.apps;

  return { ...data, site, apps };
}
