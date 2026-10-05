import type { CatalogIconSlug, SiteData, WallpaperPreset } from '../types';

// A starter kit: a whole sample site for one kind of owner, picked in the setup wizard (src/components/setup).
// Add a kit: one module in this folder plus one line in STARTER_KITS (index.ts).

export interface KitLook {
  /** A built-in wallpaper (WALLPAPER_CATALOG in src/lib/wallpaper.ts). */
  wallpaper: { kind: 'preset'; preset: WallpaperPreset };
  /** Font ids from src/lib/fonts.ts. */
  headingFont: string;
  bodyFont: string;
  /** An icon pack id (ICON_PACKS in src/lib/iconCatalog.ts). Missing = the build's default pack (Classic). */
  iconPack?: string;
}

export interface StarterKit {
  id: string;
  /** Shown on the kit's card and in the wizard's Review. */
  name: string;
  /** One line under the name on the card. */
  description: string;
  /** The look build() gives the site; the wizard's Wallpaper and Style steps start on it. */
  look: KitLook;
  /** The card's mini preview: the colour of its "Replace me" pictures and a few of its icons. */
  preview: { accent: string; icons: CatalogIconSlug[] };
  /** A complete, new site. Pure: every call returns a fresh copy. */
  build(): SiteData;
}
