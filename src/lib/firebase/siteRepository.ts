import type { Firestore } from 'firebase-admin/firestore';
import type { PortfolioApp, SiteData, SiteSettings } from '../types';
import { appToDoc, assembleSiteData, docToApp, docToLayout, layoutToDoc, type AppDoc, type LayoutDoc } from './schema';

export type Scope = 'draft' | 'published';

export async function readSiteData(db: Firestore, scope: Scope): Promise<SiteData | null> {
  const [siteSnap, layoutSnap] = await Promise.all([db.doc(`${scope}/site`).get(), db.doc(`${scope}/layout`).get()]);
  if (!siteSnap.exists || !layoutSnap.exists) return null;

  const appsSnap = await db.collection(`${scope}/site/apps`).get();
  const apps: PortfolioApp[] = appsSnap.docs.map((d) => docToApp(d.id, d.data() as AppDoc));

  return assembleSiteData(siteSnap.data() as SiteSettings, apps, docToLayout(layoutSnap.data() as LayoutDoc));
}

export async function writeSiteData(db: Firestore, scope: Scope, data: SiteData): Promise<void> {
  const batch = db.batch();
  batch.set(db.doc(`${scope}/site`), data.site);
  batch.set(db.doc(`${scope}/layout`), layoutToDoc(data.layout));

  const existing = await db.collection(`${scope}/site/apps`).get();
  for (const doc of existing.docs) batch.delete(doc.ref);
  for (const app of data.apps) batch.set(db.collection(`${scope}/site/apps`).doc(app.id), appToDoc(app));

  await batch.commit();
}
