import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { withDeepLinkFixture } from './fixtures/deepLinkFixture';
import { seedSiteData } from './seed';
import { getStore } from './store';
import type { SiteData } from './types';

/** Cache tag for the published site; Publish clears it through /api/revalidate. */
export const PUBLISHED_TAG = 'published-site';

// Kept across requests (not just within one), so visitors don't wait on the database every time. Publishing
// clears it straight away; the 5-minute limit is a safety net. A failed read throws, so it's never cached.
const readPublished = unstable_cache(async () => getStore()!.site.read('published'), ['published-site'], {
  tags: [PUBLISHED_TAG],
  revalidate: 300,
});

/**
 * Returns the content visitors see: the store's published site when a backend is set up,
 * seed data otherwise (no .env.local, or a briefly unreachable Firestore).
 * Keep this signature stable — the UI depends on it.
 *
 * Wrapped in React's cache() so multiple calls within the same request (e.g. layout.tsx's
 * generateMetadata and page.tsx both call this) share a single lookup.
 */
export const getPublishedSite = cache(async (): Promise<SiteData> => {
  try {
    // Inside the try: getStore() can throw too (e.g. Firebase rejecting an unparseable private key).
    if (getStore()) {
      const data = await readPublished();
      if (data) return data;
    }
  } catch (err) {
    console.error('Failed to read the published site, falling back to seed data', err);
  }
  // The deep-link e2e server (playwright.config.ts) adds a sample Wallet and Photos to the seed site.
  if (process.env.PORTFOLIO_FIXTURE === 'deep-links' && process.env.NODE_ENV !== 'production') return withDeepLinkFixture(seedSiteData);
  return seedSiteData;
});
