import { describe, expect, it, vi } from 'vitest';

// Outside Next there's no cross-request cache; run the function directly.
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));

process.env.FIREBASE_PROJECT_ID ??= 'demo-portfolio-test';

describe('siteRepository against the Firestore emulator', () => {
  it('returns null when nothing has been written yet', async () => {
    // Self-contained: clear Firestore first so this assertion holds regardless of what ran
    // before it in this file, or in another file sharing the same emulator process/run.
    await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-portfolio-test/databases/(default)/documents', {
      method: 'DELETE',
    });

    const { adminDb } = await import('../../src/lib/firebase/admin');
    const { readSiteData } = await import('../../src/lib/firebase/siteRepository');
    await expect(readSiteData(adminDb(), 'published')).resolves.toBeNull();
  });

  it('round-trips a full SiteData through writeSiteData/readSiteData', async () => {
    const { adminDb } = await import('../../src/lib/firebase/admin');
    const { writeSiteData, readSiteData } = await import('../../src/lib/firebase/siteRepository');
    const { seedSiteData } = await import('../../src/lib/seed');

    await writeSiteData(adminDb(), 'draft', seedSiteData);
    const result = await readSiteData(adminDb(), 'draft');
    expect(result).toEqual(seedSiteData);
  });

  it('removes apps that are no longer present on a second write', async () => {
    const { adminDb } = await import('../../src/lib/firebase/admin');
    const { writeSiteData, readSiteData } = await import('../../src/lib/firebase/siteRepository');
    const { seedSiteData } = await import('../../src/lib/seed');

    const trimmed = { ...seedSiteData, apps: seedSiteData.apps.slice(0, 1) };
    await writeSiteData(adminDb(), 'draft', trimmed);
    const result = await readSiteData(adminDb(), 'draft');
    expect(result?.apps.map((a) => a.id)).toEqual([seedSiteData.apps[0].id]);
  });

  it('seeds draft and published, and getPublishedSite reads published back exactly', async () => {
    const { adminDb } = await import('../../src/lib/firebase/admin');
    const { writeSiteData } = await import('../../src/lib/firebase/siteRepository');
    const { seedSiteData } = await import('../../src/lib/seed');

    // Deliberately distinguishable from seedSiteData: getPublishedSite()'s fallback path
    // also returns seedSiteData verbatim, so writing the seed data unmodified would let a
    // silent fallback (e.g. a broken isFirebaseConfigured()/adminDb()) pass this test
    // undetected. Changing ownerName proves the assertion only passes when the Firestore
    // read genuinely happened.
    const distinctive = {
      ...seedSiteData,
      site: { ...seedSiteData.site, ownerName: 'Firestore Integration Test Owner' },
    };
    await writeSiteData(adminDb(), 'published', distinctive);

    const { getPublishedSite } = await import('../../src/lib/getSiteData');
    const result = await getPublishedSite();
    expect(result.site.ownerName).toBe('Firestore Integration Test Owner');
    expect(result.site.ownerName).not.toBe(seedSiteData.site.ownerName);
    expect(result).toEqual(distinctive);
  });
});
