import { describe, expect, it } from 'vitest';
import { SCHEMA, ensureSchema } from './schema';
import { pgliteSql } from './sql';
import type { Sql } from './sql';

describe('Postgres schema on PGlite', () => {
  it('creates the four tables, and running it twice is harmless', async () => {
    const sql = pgliteSql();
    await ensureSchema(sql);
    await ensureSchema(sql);
    const rows = await sql.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
    );
    expect(rows.map((r) => r.table_name)).toEqual(['counters', 'documents', 'records', 'versions']);
  });

  it('batch is all or nothing', async () => {
    const sql = pgliteSql();
    await ensureSchema(sql);
    await expect(
      sql.batch([
        { text: 'insert into counters (key, n, expires_at) values ($1::text, 1, now())', params: ['a'] },
        { text: 'insert into counters (key, n, expires_at) values ($1::text, 1, now())', params: ['a'] }, // duplicate key
      ]),
    ).rejects.toThrow();
    await expect(sql.query('select * from counters')).resolves.toEqual([]);
  });

  it('round-trips JSON values', async () => {
    const sql = pgliteSql();
    await ensureSchema(sql);
    await sql.query('insert into documents (scope, key, value) values ($1::text, $2::text, $3::jsonb)', [
      'draft',
      'site',
      JSON.stringify({ a: [1, 'two'], b: null }),
    ]);
    const [row] = await sql.query<{ value: unknown }>('select value from documents');
    expect(row.value).toEqual({ a: [1, 'two'], b: null });
  });

  it('retries a failed setup once, and forgets a failure so the next call tries again', async () => {
    let calls = 0;
    let healthy = false;
    const flaky: Sql = {
      query: async () => {
        calls += 1;
        if (!healthy) throw new Error('down');
        return [];
      },
      batch: async () => {},
    };
    await expect(ensureSchema(flaky)).rejects.toThrow('down');
    expect(calls).toBe(2); // first try + one retry, each failing on the first statement
    healthy = true;
    await expect(ensureSchema(flaky)).resolves.toBeUndefined();
    expect(calls).toBe(2 + SCHEMA.length);
  });
});
