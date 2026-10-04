import { deepLinkParams, linkPreview, photoAlbums, resolveDeepLink, type LinkTarget } from './deepLink';
import type { BadgePass, PortfolioApp, SiteData, TourStop } from './types';

// The guided tour's script: generated from what's published (or the owner's own stops). Every stop is a deep
// link, so the tour opens things exactly the way a shared link would.

export const MAX_CAPTION = 90;
export const DEFAULT_SECONDS = 6;
export const MIN_SECONDS = 3;
export const MAX_SECONDS = 12;
const MAX_SPEED = 20;

/** A stop looked up against the site, ready to play. */
export interface ResolvedStop {
  appId: string;
  itemKey?: string;
  caption: string;
  seconds: number;
}

/** One line, at most 90 characters. Hardened for hand-edited data: a number is its digits, anything else no caption. */
export function trimCaption(text: unknown): string {
  return (typeof text === 'string' || typeof text === 'number' ? String(text) : '').replace(/\s+/g, ' ').trim().slice(0, MAX_CAPTION).trimEnd();
}

/** Whole seconds between 3 and 12; missing or nonsense = 6. */
export function clampSeconds(seconds: number | undefined): number {
  if (seconds === undefined || !Number.isFinite(seconds)) return DEFAULT_SECONDS;
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(seconds)));
}

/** The titled pass with the latest `earned` date (undated passes count as oldest; ties keep the first). */
function newestPass(passes: BadgePass[]): BadgePass | undefined {
  return passes.filter((p) => p.title.trim()).reduce<BadgePass | undefined>((best, p) => (!best || (p.earned ?? '') > (best.earned ?? '') ? p : best), undefined);
}

/** About Me, the first project, the newest badge, the resume, Photos, Messages — whichever exist, in that order. */
export function defaultTour(site: SiteData): TourStop[] {
  const apps = site.apps.filter((a) => a.visible);
  const first = (type: PortfolioApp['type']) => apps.find((a) => a.type === type);
  const stops: TourStop[] = [];
  const add = (target: LinkTarget, caption: string) => {
    const link = deepLinkParams(site, target);
    if (link) stops.push({ ...link, caption: trimCaption(caption) });
  };
  const about = first('about');
  const project = first('project');
  const badge = apps.flatMap((a) => (a.type === 'wallet' ? [{ app: a, pass: newestPass(a.content.passes ?? []) }] : [])).find((w) => w.pass);
  const resume = first('document');
  const photos = first('photos');
  const messages = first('messages');
  if (about) add({ appId: about.id }, 'A bit about me');
  if (project) add({ appId: project.id }, `${project.title} — my favourite project`);
  if (badge?.pass) add({ appId: badge.app.id, itemKey: badge.pass.id }, 'One of my certifications');
  if (resume) add({ appId: resume.id }, 'My resume');
  if (photos) add({ appId: photos.id }, 'A few photos');
  if (messages) add({ appId: messages.id }, 'Ask me anything — I’ll answer');
  return stops;
}

/** The stops to play: the owner's (or the default), looked up now. Stops whose app is gone are skipped. */
export function tourStops(site: SiteData): ResolvedStop[] {
  const stops = site.site.tour?.stops ?? defaultTour(site);
  return stops.flatMap((stop) => {
    const target = resolveDeepLink(site, stop.open, stop.item || undefined);
    if (!target) return [];
    // An item that's gone (a deleted badge): still open the app, just without it.
    const resolved: ResolvedStop = { appId: target.appId, caption: trimCaption(stop.caption), seconds: clampSeconds(stop.seconds) };
    if (target.itemKey) resolved.itemKey = target.itemKey;
    return [resolved];
  });
}

/** What the editor's stop picker offers. */
export interface TourChoice {
  open: string;
  label: string;
  items: { item: string; label: string }[];
}

/** Every app a link can open, in published order, with its badges or photos. */
export function tourChoices(site: SiteData): TourChoice[] {
  return site.apps.flatMap((app) => {
    const link = deepLinkParams(site, { appId: app.id });
    if (!link) return [];
    const keys =
      app.type === 'wallet'
        ? (app.content.passes ?? []).filter((p) => p.title.trim()).map((p) => p.id)
        : app.type === 'photos'
          ? photoAlbums(app.content).flatMap((album, a) => album.photos.map((_, p) => `${a}:${p}`))
          : [];
    const items = keys.flatMap((itemKey) => {
      const params = deepLinkParams(site, { appId: app.id, itemKey });
      const preview = linkPreview(site, { appId: app.id, itemKey });
      if (!params?.item || !preview) return [];
      // An uncaptioned photo previews as the app's title; name it by position instead.
      return [{ item: params.item, label: preview.title === app.title ? `Photo ${params.item}` : preview.title }];
    });
    return [{ open: link.open, label: app.title, items }];
  });
}

/** The end card's next steps: the site's email, its booking app, its resume. */
export interface TourContacts {
  email: string | null;
  calendar: { appId: string; title: string } | null;
  resume: { appId: string; title: string } | null;
}

export function tourContacts(site: SiteData): TourContacts {
  const pick = (type: PortfolioApp['type']) => {
    const app = site.apps.find((a) => a.visible && a.type === type);
    return app ? { appId: app.id, title: app.title } : null;
  };
  const email = site.site.email.trim();
  return { email: email || null, calendar: pick('calendar'), resume: pick('document') };
}

/** Whether moving the mouse stops a running tour on the desktop (the owner's switch; missing = on). */
export const tourStopsOnMove = (site: SiteData): boolean => site.site.tour?.stopOnMove !== false;

/** `/?tour=1` asks for the tour. */
export function wantsTour(search: string): boolean {
  return new URLSearchParams(search).get('tour') === '1';
}

/** `search` without `tour` and `tourSpeed`. Returns '' or '?…'. */
export function withoutTourParams(search: string): string {
  const params = new URLSearchParams(search);
  params.delete('tour');
  params.delete('tourSpeed');
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** Test-only speed-up (`?tourSpeed=10` plays a 6 s stop in 0.6 s), capped at 20. Always 1 in production. */
export function readTourSpeed(search: string, production: boolean): number {
  if (production) return 1;
  const speed = Number(new URLSearchParams(search).get('tourSpeed'));
  return Number.isFinite(speed) && speed >= 1 ? Math.min(MAX_SPEED, speed) : 1;
}
