import { adminDb, isFirebaseConfigured } from '../firebase/admin';
import { firebaseStore } from './firebase';
import { neonSql, pgliteSql } from './postgres/sql';
import { postgresStore } from './postgres/store';
import type { BackendKind, ServerStore } from './types';

export type { BackendKind, ServerStore, SiteScope, SpotifyConnection } from './types';

type Env = Record<string, string | undefined>;

/** Which backend this deployment uses. PORTFOLIO_BACKEND wins; otherwise Firebase settings, then a Postgres URL. */
export function resolveBackend(env: Env): BackendKind | null {
  if (env.PORTFOLIO_BACKEND === 'firebase' || env.PORTFOLIO_BACKEND === 'vercel') return env.PORTFOLIO_BACKEND;
  if (isFirebaseConfigured(env)) return 'firebase';
  if (env.DATABASE_URL || env.POSTGRES_URL || env.PGLITE_DIR) return 'vercel';
  return null;
}

let firebase: ServerStore | null = null;
let vercel: ServerStore | null = null;

/** The server's storage, or null when none is set up (the site then shows the sample content, read-only). */
export function getStore(): ServerStore | null {
  const kind = resolveBackend(process.env);
  if (kind === 'firebase') {
    // Forced PORTFOLIO_BACKEND=firebase can run without settings; re-check so we return null instead of throwing.
    if (!isFirebaseConfigured()) return null;
    firebase ??= firebaseStore(adminDb());
    return firebase;
  }
  if (kind === 'vercel') {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!process.env.PGLITE_DIR && !url) return null; // PORTFOLIO_BACKEND=vercel but no database yet
    // PGLITE_DIR is for local dev and tests, not deployments (next.config.ts excludes PGlite from production traces).
    vercel ??= postgresStore(process.env.PGLITE_DIR ? pgliteSql(process.env.PGLITE_DIR) : neonSql(url!));
    return vercel;
  }
  return null;
}
