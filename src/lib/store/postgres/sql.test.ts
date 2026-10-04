// @vitest-environment node
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { pgliteSql } from './sql';

it('creates missing parent folders for the PGlite data directory', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pglite-'));
  try {
    const sql = pgliteSql(path.join(root, 'a', 'b', 'db'));
    expect(await sql.query<{ n: number }>('select 1 as n')).toEqual([{ n: 1 }]);
    expect((await stat(path.join(root, 'a', 'b', 'db'))).isDirectory()).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('shares one database between handles on the same folder, as separately bundled routes need', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pglite-'));
  try {
    const dir = path.join(root, 'db');
    const a = pgliteSql(dir);
    const b = pgliteSql(dir);
    await a.query('create table t (n int)');
    await b.query('select 1'); // b opens now, before the next write
    await a.query('insert into t values (7)');
    expect(await b.query<{ n: number }>('select n from t')).toEqual([{ n: 7 }]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it('retries opening the database after a failed open instead of staying broken', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pglite-'));
  try {
    // A plain file where a parent folder should be makes the first open fail.
    const blocker = path.join(root, 'blocker');
    await writeFile(blocker, 'x');
    const sql = pgliteSql(path.join(blocker, 'db'));
    await expect(sql.query('select 1')).rejects.toThrow();
    await rm(blocker);
    expect(await sql.query<{ n: number }>('select 1 as n')).toEqual([{ n: 1 }]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
