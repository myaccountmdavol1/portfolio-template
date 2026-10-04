import { visibleAppsById } from './apps';
import { WIDGET_TYPES, type PhotosContent, type PortfolioApp, type SiteData } from './types';

// Shareable links: /?open=<app>&item=<item>. Apps match by the slug of their title (or their id); items exist
// for Wallet passes and Photos. Everything here is pure, so the page, the preview image, and the desktop agree.

const MAX_PARAM = 200;
const MAX_SLUG = 80;
const MAX_DESCRIPTION = 200;

/** What a link points at. `itemKey` is a pass id (Wallet) or "<album>:<photo>" into photoAlbums() (Photos). */
export interface LinkTarget {
  appId: string;
  itemKey?: string;
}

/** A link looked up against the site. `itemMissing`: the link named an item that isn't there (any more). */
export interface ResolvedLink extends LinkTarget {
  itemMissing: boolean;
}

export interface LinkPreview {
  title: string;
  description: string;
  imageUrl?: string;
}

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG)
    .replace(/-+$/, '');
}

/** The open/item params of a query string (first value only; blank or over-long values are ignored). */
export function readDeepLink(search: string): { open?: string; item?: string } {
  const params = new URLSearchParams(search);
  const read = (key: string) => {
    const value = params.get(key)?.trim();
    return value && value.length <= MAX_PARAM ? value : undefined;
  };
  return { open: read('open'), item: read('item') };
}

/** Apps a link may open, in published order: visible, not a widget, not a link that leaves for a new tab. */
function linkableApps(site: SiteData): PortfolioApp[] {
  return [...visibleAppsById(site.apps).values()].filter((a) => !WIDGET_TYPES.includes(a.type) && !(a.type === 'link' && a.content.mode === 'open'));
}

function findApp(apps: PortfolioApp[], ref: string): PortfolioApp | undefined {
  const slug = slugify(ref);
  return (slug ? apps.find((a) => slugify(a.title) === slug) : undefined) ?? apps.find((a) => a.id === ref);
}

/** Uploaded photos only, in albums that have some — exactly what the Photos app shows. `index` is the album's place in the saved list (empty albums are hidden here, so positions differ). */
export function photoAlbums(content: PhotosContent) {
  return content.albums.map((a, index) => ({ index, name: a.name, photos: a.photos.filter((p) => p.url) })).filter((a) => a.photos.length > 0);
}

interface LinkItem {
  key: string;
  slug: string; // '' when it has no title/caption
  alt: string; // pass id, or 1-based photo position
}

/** The items an app's links can point at, or null for app types without items. */
function itemsOf(app: PortfolioApp): LinkItem[] | null {
  if (app.type === 'wallet') {
    return (app.content.passes ?? []).filter((p) => p.title.trim()).map((p) => ({ key: p.id, slug: slugify(p.title), alt: p.id }));
  }
  if (app.type === 'photos') {
    let position = 0;
    return photoAlbums(app.content).flatMap((album, a) => album.photos.map((photo, p) => ({ key: `${a}:${p}`, slug: slugify(photo.caption), alt: String(++position) })));
  }
  return null;
}

function findItem(items: LinkItem[], ref: string): LinkItem | undefined {
  const slug = slugify(ref);
  return (slug ? items.find((i) => i.slug === slug) : undefined) ?? items.find((i) => i.alt === ref);
}

export function resolveDeepLink(site: SiteData, open?: string, item?: string): ResolvedLink | null {
  if (!open) return null;
  const app = findApp(linkableApps(site), open);
  if (!app) return null;
  const items = itemsOf(app);
  if (!item || !items) return { appId: app.id, itemMissing: false };
  const found = findItem(items, item);
  return found ? { appId: app.id, itemKey: found.key, itemMissing: false } : { appId: app.id, itemMissing: true };
}

/** The params that link to a target: slugs where they lead back to it, ids otherwise. Null if it can't be linked. */
export function deepLinkParams(site: SiteData, target: LinkTarget): { open: string; item?: string } | null {
  const apps = linkableApps(site);
  const app = apps.find((a) => a.id === target.appId);
  if (!app) return null;
  const slug = slugify(app.title);
  const open = slug && findApp(apps, slug) === app ? slug : app.id;
  const items = itemsOf(app);
  const it = target.itemKey ? items?.find((i) => i.key === target.itemKey) : undefined;
  if (!items || !it) return { open };
  return { open, item: it.slug && findItem(items, it.slug) === it ? it.slug : it.alt };
}

/** `search` with open/item replaced (or removed for null), other params kept. Returns '' or '?…'. */
export function withDeepLink(search: string, link: { open: string; item?: string } | null): string {
  const params = new URLSearchParams(search);
  params.delete('open');
  params.delete('item');
  if (link) {
    params.set('open', link.open);
    if (link.item) params.set('item', link.item);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

const clip = (text: string) => (text.length > MAX_DESCRIPTION ? `${text.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…` : text);

/** Title, description and picture for a link's preview card. */
export function linkPreview(site: SiteData, target: LinkTarget): LinkPreview | null {
  const app = site.apps.find((a) => a.id === target.appId);
  if (!app) return null;
  if (app.type === 'wallet' && target.itemKey) {
    const pass = app.content.passes?.find((p) => p.id === target.itemKey);
    if (pass) return { title: pass.title, description: clip([pass.issuer, pass.description].filter(Boolean).join(' — ')), imageUrl: pass.imageUrl };
  }
  if (app.type === 'photos' && target.itemKey) {
    const [a, p] = target.itemKey.split(':').map(Number);
    const photo = photoAlbums(app.content)[a]?.photos[p];
    if (photo) return { title: photo.caption || app.title, description: clip(app.title), imageUrl: photo.url };
  }
  return { title: app.title, description: clip(site.site.seo.description) };
}
