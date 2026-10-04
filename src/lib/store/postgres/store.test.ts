import { beforeEach, describe, expect, it } from 'vitest';
import { seedSiteData } from '../../seed';
import { ensureSchema } from './schema';
import { pgliteSql } from './sql';
import { clampLimit, postgresStore } from './store';

describe('clampLimit', () => {
  it('falls back for 0, negatives, NaN, Infinity and undefined', () => {
    for (const bad of [0, -1, -50, NaN, Infinity, -Infinity, undefined]) expect(clampLimit(bad, 7)).toBe(7);
  });
  it('floors fractions and caps large values', () => {
    expect(clampLimit(2.9, 7)).toBe(2);
    expect(clampLimit(10_000, 7)).toBe(500);
    expect(clampLimit(10_000, 7, 20)).toBe(20);
  });
});

describe('postgres store limits', () => {
  const sql = pgliteSql();
  const store = postgresStore(sql);
  const editor = store.editor!;
  beforeEach(async () => {
    await ensureSchema(sql);
    await sql.query('truncate documents, versions, records, counters');
    for (let i = 0; i < 3; i++) {
      await store.guestbook.add({ appId: 'gb', name: `N${i}`, message: 'm', color: 'yellow' }, 'approved', new Date(Date.UTC(2026, 8, i + 1)));
      await editor.publish(seedSiteData, new Date(Date.UTC(2026, 9, 3, 10 + i)));
    }
  });

  it.each([0, -1, NaN, Infinity, -Infinity])('uses the default for a limit of %s without throwing', async (bad) => {
    expect(await store.guestbook.listApproved('gb', bad)).toHaveLength(3);
    expect(await editor.versions(bad)).toHaveLength(3);
    expect(await store.chatLogs.list(bad)).toEqual([]);
    expect(await store.hallOfFame.listApproved(bad)).toEqual([]);
  });

  it('applies a positive limit and caps a huge one', async () => {
    expect(await store.guestbook.listApproved('gb', 2)).toHaveLength(2);
    expect(await editor.versions(1_000_000)).toHaveLength(3);
  });
});
