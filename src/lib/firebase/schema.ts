import type { Layout, PhoneSlot, PortfolioApp, SiteData, SiteSettings } from '../types';

/** A Firestore app document never stores its own id — the Firestore document id is the id. */
export type AppDoc = Omit<PortfolioApp, 'id'>;

/** Firestore can't store arrays directly inside arrays, so phone pages are wrapped: PhoneSlot[][] ⇄ { slots }[]. */
export interface LayoutDoc {
  desktop: Layout['desktop'];
  phone: { overrides: { pages: { slots: PhoneSlot[] }[]; dock: string[] } | null };
}

export function appToDoc(app: PortfolioApp): AppDoc {
  const { id: _id, ...rest } = app;
  return rest;
}

export function docToApp(id: string, data: AppDoc): PortfolioApp {
  return { ...data, id } as PortfolioApp;
}

export function layoutToDoc(layout: Layout): LayoutDoc {
  const overrides = layout.phone.overrides;
  return {
    desktop: layout.desktop,
    phone: { overrides: overrides ? { pages: overrides.pages.map((slots) => ({ slots })), dock: overrides.dock } : null },
  };
}

export function docToLayout(doc: LayoutDoc): Layout {
  const overrides = doc.phone?.overrides ?? null;
  return {
    desktop: doc.desktop,
    phone: {
      overrides: overrides
        ? {
            // Tolerate the unwrapped shape too, in case an older document was written by hand.
            pages: overrides.pages.map((p) => (Array.isArray(p) ? (p as PhoneSlot[]) : p.slots)),
            dock: overrides.dock,
          }
        : null,
    },
  };
}

export function assembleSiteData(site: SiteSettings, apps: PortfolioApp[], layout: Layout): SiteData {
  return { site, apps: [...apps].sort((a, b) => a.order - b.order), layout };
}
