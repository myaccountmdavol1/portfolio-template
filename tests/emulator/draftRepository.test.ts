import { readFileSync } from 'node:fs';
import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { listVersions, publishSite, readScope, writeDraft } from '../../src/lib/firebase/draftRepository';
import { seedSiteData } from '../../src/lib/seed';
import type { SiteData } from '../../src/lib/types';

const OWNER_EMAIL = 'owner@example.test';
let testEnv: RulesTestEnvironment;

const ownerDb = () =>
  testEnv.authenticatedContext('owner', { email: OWNER_EMAIL, email_verified: true }).firestore() as unknown as Firestore;
const strangerDb = () =>
  testEnv.authenticatedContext('stranger', { email: 'someone@example.com', email_verified: true }).firestore() as unknown as Firestore;

const withPhoneOverrides: SiteData = {
  ...seedSiteData,
  layout: {
    ...seedSiteData.layout,
    phone: { overrides: { pages: [[{ appId: 'todo', size: '2x2' }, { appId: 'p1', size: '1x1' }]], dock: ['about'] } },
  },
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-portfolio-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('draftRepository (browser SDK) against the emulator', () => {
  it('reads null before anything is written', async () => {
    await expect(readScope(ownerDb(), 'draft')).resolves.toBeNull();
  });

  it('round-trips a full draft, including nested phone overrides', async () => {
    await writeDraft(ownerDb(), withPhoneOverrides, null);
    await expect(readScope(ownerDb(), 'draft')).resolves.toEqual(withPhoneOverrides);
  });

  it('deletes apps removed since the previous save', async () => {
    await writeDraft(ownerDb(), seedSiteData, null);
    const fewer = { ...seedSiteData, apps: seedSiteData.apps.filter((a) => a.id !== 'p2') };
    await writeDraft(ownerDb(), fewer, seedSiteData);
    const result = await readScope(ownerDb(), 'draft');
    expect(result?.apps.map((a) => a.id)).not.toContain('p2');
  });

  it('a first save (no prev) removes stray app docs', async () => {
    await writeDraft(ownerDb(), seedSiteData, null);
    const fewer = { ...seedSiteData, apps: seedSiteData.apps.filter((a) => a.id !== 'p2') };
    await writeDraft(ownerDb(), fewer, null);
    expect((await readScope(ownerDb(), 'draft'))?.apps).toHaveLength(fewer.apps.length);
  });

  it('publish copies to published/ and writes a version snapshot', async () => {
    const now = new Date('2026-09-29T12:00:00.000Z');
    const versionId = await publishSite(ownerDb(), withPhoneOverrides, now);
    const published = await readScope(ownerDb(), 'published');
    expect(published?.apps).toEqual(withPhoneOverrides.apps);
    expect(published?.layout).toEqual(withPhoneOverrides.layout);
    expect(published?.site.updatedAt).toBe(now.toISOString());
    const version = await getDoc(doc(ownerDb(), 'versions', versionId));
    expect(version.data()?.publishedAt).toBe(now.toISOString());
  });

  it('lists versions newest first and reads them back as site data', async () => {
    await publishSite(ownerDb(), seedSiteData, new Date('2026-09-28T12:00:00.000Z'));
    await publishSite(ownerDb(), withPhoneOverrides, new Date('2026-09-29T12:00:00.000Z'));
    const versions = await listVersions(ownerDb());
    expect(versions.map((v) => v.publishedAt).slice(0, 2)).toEqual(['2026-09-29T12:00:00.000Z', '2026-09-28T12:00:00.000Z']);
    expect(versions[0].data.apps).toEqual(withPhoneOverrides.apps);
    expect(versions[0].data.layout).toEqual(withPhoneOverrides.layout);
    await assertFails(listVersions(strangerDb()));
  });

  it('a signed-in stranger cannot save a draft', async () => {
    await assertFails(writeDraft(strangerDb(), seedSiteData, null));
  });
});
