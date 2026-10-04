import { collection, doc, getDoc, getDocs, limit, orderBy, query, writeBatch, type Firestore } from 'firebase/firestore';
import type { PortfolioApp, SiteData, SiteSettings } from '../types';
import { appToDoc, assembleSiteData, docToApp, docToLayout, layoutToDoc, type AppDoc, type LayoutDoc } from './schema';

// Browser (client SDK) counterpart of siteRepository.ts, used by the editor. Relative imports only,
// so the emulator test suite (which has no '@' alias) can import this file.

export type ClientScope = 'draft' | 'published';

/** Firestore rejects `undefined` field values; a JSON round trip drops them. */
export function firestoreSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export async function readScope(db: Firestore, scope: ClientScope): Promise<SiteData | null> {
  const [siteSnap, layoutSnap] = await Promise.all([getDoc(doc(db, `${scope}/site`)), getDoc(doc(db, `${scope}/layout`))]);
  if (!siteSnap.exists() || !layoutSnap.exists()) return null;
  const appsSnap = await getDocs(collection(db, `${scope}/site/apps`));
  const apps: PortfolioApp[] = appsSnap.docs.map((d) => docToApp(d.id, d.data() as AppDoc));
  return assembleSiteData(siteSnap.data() as SiteSettings, apps, docToLayout(layoutSnap.data() as LayoutDoc));
}

/**
 * Writes only what changed since `prev` (the last successful save). With no `prev`, writes everything
 * and deletes any app documents that aren't in `next`.
 */
export async function writeDraft(db: Firestore, next: SiteData, prev: SiteData | null): Promise<void> {
  const batch = writeBatch(db);
  if (!prev || !same(prev.site, next.site)) batch.set(doc(db, 'draft/site'), firestoreSafe(next.site));
  if (!prev || !same(prev.layout, next.layout)) batch.set(doc(db, 'draft/layout'), firestoreSafe(layoutToDoc(next.layout)));

  const prevApps = new Map((prev?.apps ?? []).map((a) => [a.id, a]));
  for (const app of next.apps) {
    if (!same(prevApps.get(app.id), app)) batch.set(doc(db, 'draft/site/apps', app.id), firestoreSafe(appToDoc(app)));
  }

  const nextIds = new Set(next.apps.map((a) => a.id));
  const knownIds = prev ? [...prevApps.keys()] : (await getDocs(collection(db, 'draft/site/apps'))).docs.map((d) => d.id);
  for (const id of knownIds) if (!nextIds.has(id)) batch.delete(doc(db, 'draft/site/apps', id));

  await batch.commit();
}

/** Copies `data` to published/ and stores a snapshot in versions/{id}, in one batch. Returns the version id. */
export async function publishSite(db: Firestore, data: SiteData, now = new Date()): Promise<string> {
  const existing = await getDocs(collection(db, 'published/site/apps'));
  const batch = writeBatch(db);
  const site = firestoreSafe({ ...data.site, updatedAt: now.toISOString() });
  const layout = firestoreSafe(layoutToDoc(data.layout));

  batch.set(doc(db, 'published/site'), site);
  batch.set(doc(db, 'published/layout'), layout);
  const ids = new Set(data.apps.map((a) => a.id));
  for (const d of existing.docs) if (!ids.has(d.id)) batch.delete(d.ref);
  for (const app of data.apps) batch.set(doc(db, 'published/site/apps', app.id), firestoreSafe(appToDoc(app)));

  const versionId = now.toISOString().replace(/[:.]/g, '-');
  batch.set(doc(db, 'versions', versionId), firestoreSafe({ publishedAt: now.toISOString(), site, apps: data.apps, layout }));
  await batch.commit();
  return versionId;
}

export interface VersionRecord {
  id: string;
  publishedAt: string;
  data: SiteData;
}

/** The most recent published snapshots, newest first. */
export async function listVersions(db: Firestore, max = 30): Promise<VersionRecord[]> {
  const snap = await getDocs(query(collection(db, 'versions'), orderBy('publishedAt', 'desc'), limit(max)));
  return snap.docs.map((d) => {
    const v = d.data() as { publishedAt: string; site: SiteSettings; apps: PortfolioApp[]; layout: LayoutDoc };
    return { id: d.id, publishedAt: v.publishedAt, data: assembleSiteData(v.site, v.apps, docToLayout(v.layout)) };
  });
}
