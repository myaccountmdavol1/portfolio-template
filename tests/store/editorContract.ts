import { beforeEach, describe, expect, it } from 'vitest';
import { seedSiteData } from '../../src/lib/seed';
import type { EditorStore, ServerStore } from '../../src/lib/store/types';

/** Behaviour of the server-side editor operations (only backends whose editor goes through the server have them). */
export function editorContract(name: string, setup: { store: () => ServerStore; reset: () => Promise<void> }) {
  describe(`EditorStore contract: ${name}`, () => {
    beforeEach(() => setup.reset());
    const editor = (): EditorStore => {
      const e = setup.store().editor;
      if (!e) throw new Error('this store has no editor');
      return e;
    };
    const stamped = (iso: string) => ({ ...seedSiteData, site: { ...seedSiteData.site, updatedAt: iso } });

    it('writeDraft with no previous save writes everything and drops apps that are not in it', async () => {
      const s = setup.store();
      await s.site.write('draft', seedSiteData);
      const fewer = { ...seedSiteData, apps: seedSiteData.apps.slice(1) };
      await editor().writeDraft(fewer, null);
      await expect(s.site.read('draft')).resolves.toEqual(fewer);
    });

    it('writeDraft with a previous save applies changes, additions and removals', async () => {
      const s = setup.store();
      await editor().writeDraft(seedSiteData, null);
      const [first, second, ...rest] = seedSiteData.apps;
      const renamed = { ...second, name: 'Renamed' };
      const next = { ...seedSiteData, site: { ...seedSiteData.site, ownerName: 'Alex Rivera' }, apps: [renamed, ...rest] };
      await editor().writeDraft(next, seedSiteData);
      const read = await s.site.read('draft');
      expect(read).toEqual(next);
      expect(read?.apps.some((a) => a.id === first.id)).toBe(false);
    });

    it('publish copies to published with updatedAt, saves a version, and returns its id', async () => {
      const s = setup.store();
      const now = new Date('2026-10-03T12:00:00Z');
      const id = await editor().publish(seedSiteData, now);
      expect(id).toBe('2026-10-03T12-00-00-000Z');
      await expect(s.site.read('published')).resolves.toEqual(stamped(now.toISOString()));
      const [v] = await editor().versions();
      expect(v).toEqual({ id, publishedAt: now.toISOString(), data: stamped(now.toISOString()) });
    });

    it('publish removes apps that were unpublished', async () => {
      const s = setup.store();
      await editor().publish(seedSiteData, new Date('2026-10-03T12:00:00Z'));
      await editor().publish({ ...seedSiteData, apps: seedSiteData.apps.slice(0, 1) }, new Date('2026-10-03T13:00:00Z'));
      expect((await s.site.read('published'))?.apps.map((a) => a.id)).toEqual([seedSiteData.apps[0].id]);
    });

    it('versions are newest first and respect the limit', async () => {
      for (const hour of [10, 11, 12]) await editor().publish(seedSiteData, new Date(Date.UTC(2026, 9, 3, hour)));
      expect((await editor().versions()).map((v) => v.publishedAt)).toEqual([
        '2026-10-03T12:00:00.000Z',
        '2026-10-03T11:00:00.000Z',
        '2026-10-03T10:00:00.000Z',
      ]);
      expect(await editor().versions(2)).toHaveLength(2);
    });

    it('owner: none at first, then stored and replaced', async () => {
      const owner = setup.store().owner;
      if (!owner) throw new Error('this store has no owner');
      await expect(owner.get()).resolves.toBeNull();
      const record = { passwordHash: 'h1', salt: 's1', sessionSecret: 'k1', updatedAt: '2026-10-03T00:00:00.000Z' };
      await owner.set(record);
      await expect(owner.get()).resolves.toEqual(record);
      await owner.set({ ...record, sessionSecret: 'k2' });
      await expect(owner.get()).resolves.toEqual({ ...record, sessionSecret: 'k2' });
      // The setup wizard's finish time is optional and must round-trip.
      await owner.set({ ...record, setupDoneAt: '2026-10-04T12:00:00.000Z' });
      await expect(owner.get()).resolves.toEqual({ ...record, setupDoneAt: '2026-10-04T12:00:00.000Z' });
    });
  });
}
