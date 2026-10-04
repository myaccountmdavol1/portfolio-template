import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

/**
 * True once Firebase is usable server-side: either a Firestore emulator is targeted (dev/test),
 * or all three Admin SDK service-account env vars are set (production). Server-only.
 */
export function isFirebaseConfigured(env: Record<string, string | undefined> = process.env): boolean {
  if (env.FIRESTORE_EMULATOR_HOST) return true;
  return Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
}

let app: App | null = null;

function getAdminApp(): App {
  if (app) return app;
  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    app = initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT ?? 'demo-portfolio-test' });
    return app;
  }
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // .env files can't hold literal newlines; private keys are stored with escaped \n.
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  return app;
}

/** Throws if Firebase isn't configured — callers must check isFirebaseConfigured() first. */
export function adminDb(): Firestore {
  const db = getFirestore(getAdminApp());
  // Admin SDK throws on documents containing explicit `undefined` field values (e.g. optional
  // fields like imageUrl?/verifyUrl?/ogImageUrl?/embedKind? from src/lib/types.ts). .settings()
  // can only be called once per Firestore instance. A module-level flag isn't enough: the same
  // firebase-admin app (and so the same Firestore instance) is shared by every copy of this module
  // (dev hot reloads, separate server bundles), so the flag lives on the instance itself.
  const flagged = db as Firestore & { __portfolioSettingsApplied?: boolean };
  if (!flagged.__portfolioSettingsApplied) {
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Already initialized by another copy of this module; its settings still apply.
    }
    flagged.__portfolioSettingsApplied = true;
  }
  return db;
}

export function adminStorage(): Storage {
  return getStorage(getAdminApp());
}
