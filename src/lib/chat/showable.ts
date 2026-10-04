import type Anthropic from '@anthropic-ai/sdk';
import { deepLinkParams, linkPreview, photoAlbums, type LinkTarget } from '../deepLink';
import type { SiteData } from '../types';

// What the chat may open on the visitor's screen: the same apps, badges and photos a deep link can open.

export const MAX_SHOWABLE = 80;

export interface Showable {
  open: string;
  item?: string;
  label: string;
  kind: 'app' | 'badge' | 'photo';
}

/** Apps first, then titled badges and captioned photos, in published order; capped so the prompt stays small. */
export function showableTargets(site: SiteData): Showable[] {
  const apps: Showable[] = [];
  const items: Showable[] = [];
  for (const app of site.apps) {
    if (app.type === 'messages') continue;
    const appLink = deepLinkParams(site, { appId: app.id });
    if (!appLink) continue;
    apps.push({ open: appLink.open, label: app.title, kind: 'app' });
    const targets: LinkTarget[] =
      app.type === 'wallet'
        ? (app.content.passes ?? []).filter((p) => p.title.trim()).map((p) => ({ appId: app.id, itemKey: p.id }))
        : app.type === 'photos'
          ? photoAlbums(app.content).flatMap((album, a) => album.photos.flatMap((photo, p) => (photo.caption.trim() ? [{ appId: app.id, itemKey: `${a}:${p}` }] : [])))
          : [];
    for (const target of targets) {
      const link = deepLinkParams(site, target);
      const preview = linkPreview(site, target);
      if (link?.item && preview) items.push({ open: link.open, item: link.item, label: preview.title, kind: app.type === 'wallet' ? 'badge' : 'photo' });
    }
  }
  return [...apps, ...items].slice(0, MAX_SHOWABLE);
}

/** The `show` tool, with open/item limited to the listed values. Null when there's nothing to show. */
export function showTool(targets: Showable[]): Anthropic.Beta.BetaTool | null {
  const opens = [...new Set(targets.map((t) => t.open))];
  if (opens.length === 0) return null;
  const items = [...new Set(targets.flatMap((t) => (t.item ? [t.item] : [])))];
  return {
    name: 'show',
    description: 'Open one thing from the portfolio on the visitor’s screen: an app window, optionally showing one badge or photo inside it. Use only open/item values from the <showable> list.',
    input_schema: {
      type: 'object',
      properties: {
        open: { type: 'string', enum: opens, description: 'The open= value of the app to open.' },
        ...(items.length > 0 ? { item: { type: 'string', enum: items, description: 'The item= value of the badge or photo to show inside it, if any.' } } : {}),
      },
      required: ['open'],
      additionalProperties: false,
    },
  };
}

/** One line per target, for the system prompt. */
export function showableSection(targets: Showable[]): string {
  return targets.map((t) => `open=${t.open}${t.item ? ` item=${t.item}` : ''} — ${t.label}${t.kind === 'app' ? '' : ` (${t.kind})`}`).join('\n');
}
