import { cache } from 'react';
import { getPublishedSite } from '../getSiteData';
import type { SiteData } from '../types';
import { chatKey } from './config';
import { withoutDisconnected } from './visible';

/**
 * Server-only. The published site as visitors receive it (the home page and its deep links, the share picture,
 * the 404 page). Not cached across requests: saving or removing a key shows on the next visit, with no publish.
 * The key is looked up only when the site has a Messages app, so most visits cost no store read.
 * Owner surfaces (the editor's data, /setup) read the full published site instead.
 */
export const getVisitorSite = cache(async (): Promise<SiteData> => {
  const data = await getPublishedSite();
  if (!data.apps.some((a) => a.type === 'messages')) return data;
  return withoutDisconnected(data, { chat: (await chatKey()) !== null });
});
