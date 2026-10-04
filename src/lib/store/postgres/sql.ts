import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

export interface SqlStatement {
  text: string;
  params?: unknown[];
}

/** The two things the Postgres store needs from a driver, so the same code runs on Neon and on PGlite. */
export interface Sql {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  /** Runs every statement in one transaction: all or nothing. */
  batch(statements: SqlStatement[]): Promise<void>;
}

/** Neon over HTTPS (Vercel Marketplace). Its transactions are non-interactive, which is all the store needs. */
export function neonSql(url: string): Sql {
  const sql = neon(url);
  return {
    query: async <T,>(text: string, params: unknown[] = []) => (await sql.query(text, params)) as T[],
    batch: async (statements) => {
      if (statements.length === 0) return;
      await sql.transaction(statements.map((s) => sql.query(s.text, s.params ?? [])));
    },
  };
}

type PGliteDb = {
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
  transaction<R>(fn: (tx: PGliteDb) => Promise<R>): Promise<R>;
};

async function openPglite(dataDir?: string): Promise<PGliteDb> {
  // PGlite creates its data folder but not the folders above it.
  if (dataDir) await mkdir(path.dirname(path.resolve(dataDir)), { recursive: true });
  const { PGlite } = await import('@electric-sql/pglite');
  return new PGlite(dataDir) as unknown as PGliteDb;
}

/** Postgres inside this process (local dev, tests); no dataDir = in memory. Loaded lazily so production never pays for it. */
export function pgliteSql(dataDir?: string): Sql {
  // One database per folder for the whole process: in dev, each route is bundled on its own, so several handles
  // on one folder would each open their own copy and miss each other's writes. No folder = a private in-memory one.
  const shared = ((globalThis as { __pgliteDbs?: Map<string, Promise<PGliteDb>> }).__pgliteDbs ??= new Map());
  const key = dataDir ? path.resolve(dataDir) : null;
  let db: Promise<PGliteDb> | undefined;
  const open = (): Promise<PGliteDb> => {
    const opened = db ?? (key ? shared.get(key) : undefined) ?? openPglite(dataDir);
    db = opened;
    if (key) shared.set(key, opened);
    // A failed open must not stay cached, or every later query would fail the same way.
    opened.catch(() => {
      if (db === opened) db = undefined;
      if (key && shared.get(key) === opened) shared.delete(key);
    });
    return opened;
  };
  return {
    query: async <T,>(text: string, params: unknown[] = []) => (await (await open()).query(text, params)).rows as T[],
    batch: async (statements) => {
      await (await open()).transaction(async (tx) => {
        for (const s of statements) await tx.query(s.text, s.params ?? []);
      });
    },
  };
}
