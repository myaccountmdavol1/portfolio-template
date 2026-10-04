import { deepLinkParams, linkPreview, resolveDeepLink } from '../deepLink';
import type { SiteData } from '../types';
import type { ShowEvent } from './events';

/** Checks a `show` tool input against the site. A target the site can't open (or the chat itself) gives null. */
export function resolveShow(site: SiteData, input: unknown): ShowEvent | null {
  if (!input || typeof input !== 'object') return null;
  const { open, item } = input as { open?: unknown; item?: unknown };
  if (typeof open !== 'string' || (item !== undefined && item !== null && typeof item !== 'string')) return null;
  const target = resolveDeepLink(site, open, typeof item === 'string' ? item : undefined);
  if (!target || target.itemMissing) return null;
  if (site.apps.find((a) => a.id === target.appId)?.type === 'messages') return null;
  const params = deepLinkParams(site, target);
  const preview = linkPreview(site, target);
  if (!params || !preview) return null;
  return { type: 'show', ...params, label: preview.title };
}
