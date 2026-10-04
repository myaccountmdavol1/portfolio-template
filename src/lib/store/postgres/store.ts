import { randomUUID } from 'node:crypto';
import type { ChatLog } from '../../chat/log';
import type { InboxMessage } from '../../contact';
import { assembleSiteData } from '../../firebase/schema';
import { toPublicNote, type GuestbookNote } from '../../guestbook/notes';
import { toPublicEntry, type HallEntry } from '../../hallOfFame/entries';
import type { SiteVersion } from '../../editor/backend';
import type { Layout, PortfolioApp, SiteData, SiteSettings } from '../../types';
import type { OwnerRecord, ServerStore, SiteScope, SpotifyConnection } from '../types';
import { ensureSchema } from './schema';
import type { Sql, SqlStatement } from './sql';

const json = (value: unknown) => JSON.stringify(value);
const APP = 'app:';
/** A positive whole number up to `max`; anything else (0, negative, NaN, Infinity, undefined) falls back to `fallback`. */
export const clampLimit = (n: number | undefined, fallback: number, max = 500) =>
  Number.isFinite(n) && n! > 0 ? Math.min(Math.floor(n!), max) : fallback;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export const UPSERT_DOCUMENT =
  'insert into documents (scope, key, value, updated_at) values ($1::text, $2::text, $3::jsonb, now()) on conflict (scope, key) do update set value = excluded.value, updated_at = now()';

/** Statements that replace one scope's site, layout and apps, removing apps that are gone. */
export function siteStatements(scope: SiteScope, data: SiteData, site: SiteSettings = data.site): SqlStatement[] {
  return [
    {
      text: "delete from documents where scope = $1::text and key like 'app:%' and not (key = any($2::text[]))",
      params: [scope, data.apps.map((a) => APP + a.id)],
    },
    { text: UPSERT_DOCUMENT, params: [scope, 'site', json(site)] },
    { text: UPSERT_DOCUMENT, params: [scope, 'layout', json(data.layout)] },
    ...data.apps.map((app) => ({ text: UPSERT_DOCUMENT, params: [scope, APP + app.id, json(app)] })),
  ];
}

export async function readSite(sql: Sql, scope: SiteScope): Promise<SiteData | null> {
  const rows = await sql.query<{ key: string; value: unknown }>('select key, value from documents where scope = $1::text', [scope]);
  const site = rows.find((r) => r.key === 'site')?.value as SiteSettings | undefined;
  const layout = rows.find((r) => r.key === 'layout')?.value as Layout | undefined;
  if (!site || !layout) return null;
  const apps = rows.filter((r) => r.key.startsWith(APP)).map((r) => r.value as PortfolioApp);
  return assembleSiteData(site, apps, layout);
}

/** The Vercel backend: Postgres (Neon in production, PGlite locally). Tables are created on first use. */
export function postgresStore(sql: Sql): ServerStore {
  const q = async <T,>(text: string, params?: unknown[]) => {
    await ensureSchema(sql);
    return sql.query<T>(text, params);
  };
  const batch = async (statements: SqlStatement[]) => {
    await ensureSchema(sql);
    await sql.batch(statements);
  };

  const addRecord = async (collection: string, value: object, id: string = randomUUID()) => {
    await q('insert into records (collection, id, value) values ($1::text, $2::text, $3::jsonb)', [collection, id, json(value)]);
    return id;
  };
  /** `where` may use $2, $3… for `params`; ordering is a fixed string and `limit` is a bound parameter (callers clamp it). */
  const listRecords = async <T,>(collection: string, where = '', params: unknown[] = [], order = "value->>'createdAt' desc", limit?: number) => {
    const limited = limit !== undefined;
    const rows = await q<{ id: string; value: Omit<T, 'id'> }>(
      `select id, value from records where collection = $1::text ${where} order by ${order}${limited ? ` limit $${params.length + 2}::int` : ''}`,
      limited ? [collection, ...params, limit] : [collection, ...params],
    );
    return rows.map((r) => ({ id: r.id, ...r.value }) as T);
  };
  const patchRecord = async (collection: string, id: string, patch: object) => {
    await q('update records set value = value || $3::jsonb where collection = $1::text and id = $2::text', [collection, id, json(patch)]);
  };
  const removeRecord = async (collection: string, id: string) => {
    await q('delete from records where collection = $1::text and id = $2::text', [collection, id]);
  };

  return {
    kind: 'vercel',
    site: {
      read: async (scope) => {
        await ensureSchema(sql);
        return readSite(sql, scope);
      },
      write: (scope, data) => batch(siteStatements(scope, data)),
    },
    guestbook: {
      add: (note, status, now = new Date()) => addRecord('guestbook', { ...note, status, createdAt: now.toISOString() }),
      listApproved: async (appId, limit) =>
        (await listRecords<GuestbookNote>('guestbook', "and value->>'appId' = $2::text and value->>'status' = 'approved'", [appId], undefined, clampLimit(limit, 60))).map(
          toPublicNote,
        ),
      list: (appId) => listRecords<GuestbookNote>('guestbook', "and value->>'appId' = $2::text", [appId]),
      approve: (id) => patchRecord('guestbook', id, { status: 'approved' }),
      remove: (id) => removeRecord('guestbook', id),
    },
    hallOfFame: {
      add: (entry, now = new Date()) => addRecord('hallOfFame', { ...entry, status: 'pending', createdAt: now.toISOString() }),
      listApproved: async (limit) =>
        (await listRecords<HallEntry>('hallOfFame', "and value->>'status' = 'approved'", [], undefined, clampLimit(limit, 50))).map(toPublicEntry),
      list: () => listRecords<HallEntry>('hallOfFame'),
      approve: (id) => patchRecord('hallOfFame', id, { status: 'approved' }),
      remove: (id) => removeRecord('hallOfFame', id),
    },
    inbox: {
      add: (message, now = new Date()) => addRecord('inbox', { ...message, createdAt: now.toISOString(), read: false }),
      list: (appId) => listRecords<InboxMessage>('inbox', "and value->>'appId' = $2::text", [appId]),
      markRead: (id) => patchRecord('inbox', id, { read: true }),
      remove: (id) => removeRecord('inbox', id),
    },
    chatLogs: {
      async append(conversationId, appId, question, answer, now = new Date()) {
        const at = now.toISOString();
        const turns = [
          { role: 'user', content: question, at },
          { role: 'assistant', content: answer, at },
        ];
        await q(
          `insert into records (collection, id, value)
             values ('chatLogs', $1::text, jsonb_build_object('appId', $2::text, 'updatedAt', $3::text, 'messageCount', 1, 'turns', $4::jsonb))
           on conflict (collection, id) do update set value = records.value || jsonb_build_object(
             'appId', $2::text,
             'updatedAt', $3::text,
             'messageCount', coalesce((records.value->>'messageCount')::int, 0) + 1,
             'turns', coalesce(records.value->'turns', '[]'::jsonb) || $4::jsonb)`,
          [conversationId, appId, at, json(turns)],
        );
      },
      list: (limit?: number) => listRecords<ChatLog>('chatLogs', '', [], "value->>'updatedAt' desc", clampLimit(limit, 100)),
      remove: (id) => removeRecord('chatLogs', id),
    },
    counters: {
      // One statement, so simultaneous requests can't lose a count. Same rule as Firestore: a live window counts up,
      // an expired one restarts at 1, and the stored expiry is always the latest one given.
      async increment(key, expiresAt, now) {
        const [row] = await q<{ n: number }>(
          `insert into counters (key, n, expires_at) values ($1::text, 1, $2::timestamptz)
           on conflict (key) do update set
             n = case when counters.expires_at > $3::timestamptz then counters.n + 1 else 1 end,
             expires_at = excluded.expires_at
           returning n`,
          [key, expiresAt.toISOString(), now.toISOString()],
        );
        return Number(row.n);
      },
    },
    spotify: {
      async read() {
        const [row] = await q<{ value: SpotifyConnection }>("select value from documents where scope = 'secret' and key = 'spotify'");
        return row?.value ?? null;
      },
      async save(connection, now = new Date()) {
        await q(
          "insert into documents (scope, key, value) values ('secret', 'spotify', $1::jsonb) on conflict (scope, key) do update set value = excluded.value, updated_at = now()",
          [json({ ...connection, updatedAt: now.toISOString() })],
        );
      },
      async rotate(refreshToken, now = new Date()) {
        await q(
          "insert into documents (scope, key, value) values ('secret', 'spotify', $1::jsonb) on conflict (scope, key) do update set value = documents.value || excluded.value, updated_at = now()",
          [json({ refreshToken, updatedAt: now.toISOString() })],
        );
      },
    },
    editor: {
      async writeDraft(next, prev) {
        if (!prev) return batch(siteStatements('draft', next));
        const statements: SqlStatement[] = [];
        if (!same(prev.site, next.site)) statements.push({ text: UPSERT_DOCUMENT, params: ['draft', 'site', json(next.site)] });
        if (!same(prev.layout, next.layout)) statements.push({ text: UPSERT_DOCUMENT, params: ['draft', 'layout', json(next.layout)] });
        const prevApps = new Map(prev.apps.map((a) => [a.id, a]));
        for (const app of next.apps) {
          if (!same(prevApps.get(app.id), app)) statements.push({ text: UPSERT_DOCUMENT, params: ['draft', APP + app.id, json(app)] });
        }
        const nextIds = new Set(next.apps.map((a) => a.id));
        const gone = [...prevApps.keys()].filter((id) => !nextIds.has(id)).map((id) => APP + id);
        if (gone.length) statements.push({ text: "delete from documents where scope = 'draft' and key = any($1::text[])", params: [gone] });
        if (statements.length) await batch(statements);
      },
      async publish(data, now = new Date()) {
        const at = now.toISOString();
        const site = { ...data.site, updatedAt: at };
        const id = at.replace(/[:.]/g, '-');
        await batch([
          ...siteStatements('published', data, site),
          {
            text: 'insert into versions (id, published_at, value) values ($1::text, $2::timestamptz, $3::jsonb) on conflict (id) do update set value = excluded.value',
            params: [id, at, json({ publishedAt: at, site, apps: data.apps, layout: data.layout })],
          },
        ]);
        return id;
      },
      async versions(limit?: number) {
        const rows = await q<{ id: string; value: { publishedAt: string; site: SiteSettings; apps: PortfolioApp[]; layout: Layout } }>(
          'select id, value from versions order by published_at desc limit $1::int',
          [clampLimit(limit, 30)],
        );
        return rows.map(
          (r): SiteVersion => ({ id: r.id, publishedAt: r.value.publishedAt, data: assembleSiteData(r.value.site, r.value.apps, r.value.layout) }),
        );
      },
    },
    owner: {
      async get() {
        const [row] = await q<{ value: OwnerRecord }>("select value from documents where scope = 'secret' and key = 'owner'");
        return row?.value ?? null;
      },
      async set(record) {
        await q(
          "insert into documents (scope, key, value) values ('secret', 'owner', $1::jsonb) on conflict (scope, key) do update set value = excluded.value, updated_at = now()",
          [json(record)],
        );
      },
    },
  };
}
