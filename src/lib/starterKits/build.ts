import { starterApp } from '../editor/starters';
import { seedSiteData } from '../seed';
import type { AppType, CatalogIconSlug, PortfolioApp, SiteSettings } from '../types';
import type { KitLook } from './types';

// Shared helpers for the kit modules: apps start from the editor's own starters, and the site from the sample's
// settings, so a kit only spells out what is different.

export type AppOf<T extends AppType> = Extract<PortfolioApp, { type: T }>;

export const P = (text: string) => ({ type: 'paragraph' as const, text });

/** An editor starter app with a kit's title, icon and content on top. */
export function kitApp<T extends AppType>(
  type: T,
  id: string,
  order: number,
  patch: { title?: string; icon?: CatalogIconSlug; content?: Partial<AppOf<T>['content']> } = {},
): AppOf<T> {
  const app = starterApp(type, id, order) as AppOf<T>;
  return {
    ...app,
    ...(patch.title ? { title: patch.title } : {}),
    ...(patch.icon ? { icon: { kind: 'catalog' as const, slug: patch.icon } } : {}),
    content: { ...app.content, ...patch.content },
  } as AppOf<T>;
}

/** The sample site's settings with a kit's look, accent (its preview colour: the menu-bar dot and favicon) and overrides. The name, email and incoming call stay the sample's. */
export function kitSite(look: KitLook, accent: string, patch: Partial<SiteSettings>): SiteSettings {
  return {
    ...structuredClone(seedSiteData.site),
    accent,
    wallpaper: { ...look.wallpaper },
    style: { headingFont: look.headingFont, bodyFont: look.bodyFont, ...(look.iconPack ? { iconPack: look.iconPack } : {}) },
    ...patch,
  };
}
