import type { Sql } from './sql';

/**
 * Four tables, created on first use (no migration step). Values are JSON; the timestamp columns are only
 * for ordering and expiry, never read back into app data.
 * - documents: the site ({scope: draft|published, key: site|layout|app:<id>}) and secrets ({scope: secret}).
 * - versions: one row per publish.
 * - records: guestbook, hallOfFame, inbox and chatLogs entries, keyed by collection + id.
 * - counters: rate limits.
 */
export const SCHEMA = [
  'create table if not exists documents (scope text not null, key text not null, value jsonb not null, updated_at timestamptz not null default now(), primary key (scope, key))',
  'create table if not exists versions (id text primary key, published_at timestamptz not null, value jsonb not null)',
  'create table if not exists records (collection text not null, id text not null, value jsonb not null, primary key (collection, id))',
  'create table if not exists counters (key text primary key, n integer not null, expires_at timestamptz not null)',
];

const ready = new WeakMap<Sql, Promise<void>>();

/** Creates the tables once per connection. Two cold starts racing on CREATE TABLE can collide, so it retries once. */
export function ensureSchema(sql: Sql): Promise<void> {
  let p = ready.get(sql);
  if (!p) {
    const run = async () => {
      for (const statement of SCHEMA) await sql.query(statement);
    };
    p = run().catch(() => run());
    p.catch(() => ready.delete(sql));
    ready.set(sql, p);
  }
  return p;
}
