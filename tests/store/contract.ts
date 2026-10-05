import { beforeEach, describe, expect, it } from 'vitest';
import { seedSiteData } from '../../src/lib/seed';
import type { ServerStore } from '../../src/lib/store/types';

/** Behaviour every ServerStore must have. Each backend's test file calls this with its own setup. */
export function storeContract(name: string, setup: { store: () => ServerStore; reset: () => Promise<void> }) {
  describe(`ServerStore contract: ${name}`, () => {
    beforeEach(() => setup.reset());

    it('site: read is null before anything is written', async () => {
      await expect(setup.store().site.read('published')).resolves.toBeNull();
    });

    it('site: write then read round-trips exactly, and scopes are separate', async () => {
      const s = setup.store();
      await s.site.write('draft', seedSiteData);
      await expect(s.site.read('draft')).resolves.toEqual(seedSiteData);
      await expect(s.site.read('published')).resolves.toBeNull();
    });

    it('site: a second write removes apps that are gone', async () => {
      const s = setup.store();
      await s.site.write('published', seedSiteData);
      const fewer = { ...seedSiteData, apps: seedSiteData.apps.slice(0, 1) };
      await s.site.write('published', fewer);
      expect((await s.site.read('published'))?.apps.map((a) => a.id)).toEqual([seedSiteData.apps[0].id]);
    });

    it('guestbook: lists only approved notes for that guestbook, newest first, without moderation fields', async () => {
      const s = setup.store();
      await s.guestbook.add({ appId: 'gb', name: 'Old', message: 'first', color: 'yellow' }, 'approved', new Date('2026-09-01T00:00:00Z'));
      await s.guestbook.add({ appId: 'gb', name: 'New', message: 'second', color: 'pink' }, 'approved', new Date('2026-09-02T00:00:00Z'));
      await s.guestbook.add({ appId: 'gb', name: 'Hidden', message: 'pending', color: 'blue' }, 'pending');
      await s.guestbook.add({ appId: 'other', name: 'Else', message: 'x', color: 'blue' }, 'approved');
      const notes = await s.guestbook.listApproved('gb');
      expect(notes.map((n) => n.name)).toEqual(['New', 'Old']);
      expect(notes[0]).not.toHaveProperty('status');
    });

    it('guestbook: respects the limit', async () => {
      const s = setup.store();
      for (let i = 0; i < 3; i++) {
        await s.guestbook.add({ appId: 'gb', name: `N${i}`, message: 'm', color: 'yellow' }, 'approved', new Date(Date.UTC(2026, 8, i + 1)));
      }
      expect((await s.guestbook.listApproved('gb', 2)).map((n) => n.name)).toEqual(['N2', 'N1']);
    });

    it('guestbook: public notes have exactly the public fields; doodle and stickers only when present', async () => {
      const s = setup.store();
      await s.guestbook.add({ appId: 'gb', name: 'Plain', message: 'm', color: 'blue' }, 'approved', new Date('2026-09-01T00:00:00Z'));
      await s.guestbook.add(
        { appId: 'gb', name: 'Fancy', message: 'm', color: 'pink', doodle: 'data:image/png;base64,AAAA', stickers: ['emoji:🔥'] },
        'approved',
        new Date('2026-09-02T00:00:00Z'),
      );
      const [fancy, plain] = await s.guestbook.listApproved('gb');
      expect(fancy).toEqual({
        id: expect.any(String),
        name: 'Fancy',
        message: 'm',
        color: 'pink',
        createdAt: '2026-09-02T00:00:00.000Z',
        doodle: 'data:image/png;base64,AAAA',
        stickers: ['emoji:🔥'],
      });
      expect(plain).toEqual({ id: expect.any(String), name: 'Plain', message: 'm', color: 'blue', createdAt: '2026-09-01T00:00:00.000Z' });
    });

    it('guestbook: moderation lists every note for that guestbook, approves and removes', async () => {
      const s = setup.store();
      const pending = await s.guestbook.add({ appId: 'gb', name: 'Waiting', message: 'm', color: 'yellow' }, 'pending', new Date('2026-09-02T00:00:00Z'));
      await s.guestbook.add({ appId: 'gb', name: 'Shown', message: 'm', color: 'yellow' }, 'approved', new Date('2026-09-01T00:00:00Z'));
      await s.guestbook.add({ appId: 'other', name: 'Else', message: 'm', color: 'yellow' }, 'pending');
      const all = await s.guestbook.list('gb');
      expect(all.map((n) => [n.name, n.status])).toEqual([
        ['Waiting', 'pending'],
        ['Shown', 'approved'],
      ]);
      expect(all[0]).toMatchObject({ id: pending, appId: 'gb', createdAt: '2026-09-02T00:00:00.000Z' });
      await s.guestbook.approve(pending);
      expect((await s.guestbook.listApproved('gb')).map((n) => n.name)).toEqual(['Waiting', 'Shown']);
      await s.guestbook.remove(pending);
      expect((await s.guestbook.list('gb')).map((n) => n.name)).toEqual(['Shown']);
    });

    it('hall of fame: new entries wait for approval, then show with exactly the public fields', async () => {
      const s = setup.store();
      const id = await s.hallOfFame.add({ name: 'Alex Rivera', note: 'hi', finishedInMs: 1000 }, new Date('2026-09-01T00:00:00Z'));
      await expect(s.hallOfFame.listApproved()).resolves.toEqual([]);
      expect(await s.hallOfFame.list()).toEqual([
        { id, name: 'Alex Rivera', note: 'hi', finishedInMs: 1000, createdAt: '2026-09-01T00:00:00.000Z', status: 'pending' },
      ]);
      await s.hallOfFame.approve(id);
      expect(await s.hallOfFame.listApproved()).toEqual([{ id, name: 'Alex Rivera', note: 'hi', finishedInMs: 1000, createdAt: '2026-09-01T00:00:00.000Z' }]);
      await s.hallOfFame.remove(id);
      await expect(s.hallOfFame.list()).resolves.toEqual([]);
    });

    it('inbox: messages read back per mailbox, newest first, and can be marked read and removed', async () => {
      const s = setup.store();
      const msg = { appId: 'mail', name: 'Alex Rivera', email: 'alex@example.test', subject: 'Hi', message: 'Hello' };
      const older = await s.inbox.add(msg, new Date('2026-09-01T00:00:00Z'));
      const newer = await s.inbox.add({ ...msg, subject: 'Again' }, new Date('2026-09-02T00:00:00Z'));
      await s.inbox.add({ ...msg, appId: 'other' });
      expect(older).not.toBe(newer);
      expect(await s.inbox.list('mail')).toEqual([
        { id: newer, ...msg, subject: 'Again', createdAt: '2026-09-02T00:00:00.000Z', read: false },
        { id: older, ...msg, createdAt: '2026-09-01T00:00:00.000Z', read: false },
      ]);
      await s.inbox.markRead(older);
      expect((await s.inbox.list('mail')).find((m) => m.id === older)?.read).toBe(true);
      await s.inbox.remove(newer);
      expect((await s.inbox.list('mail')).map((m) => m.id)).toEqual([older]);
    });

    it('chat logs: one thread per conversation with a message count, newest activity first, removable', async () => {
      const s = setup.store();
      await s.chatLogs.append('conv-1', 'messages-1', 'Q1', 'A1', new Date('2026-09-29T10:00:00Z'));
      await s.chatLogs.append('conv-2', 'messages-1', 'Other', 'Reply', new Date('2026-09-29T10:00:30Z'));
      await s.chatLogs.append('conv-1', 'messages-1', 'Q2', 'A2', new Date('2026-09-29T10:01:00Z'));
      const logs = await s.chatLogs.list();
      expect(logs.map((l) => l.id)).toEqual(['conv-1', 'conv-2']);
      expect(logs[0]).toEqual({
        id: 'conv-1',
        appId: 'messages-1',
        updatedAt: '2026-09-29T10:01:00.000Z',
        messageCount: 2,
        turns: [
          { role: 'user', content: 'Q1', at: '2026-09-29T10:00:00.000Z' },
          { role: 'assistant', content: 'A1', at: '2026-09-29T10:00:00.000Z' },
          { role: 'user', content: 'Q2', at: '2026-09-29T10:01:00.000Z' },
          { role: 'assistant', content: 'A2', at: '2026-09-29T10:01:00.000Z' },
        ],
      });
      await s.chatLogs.remove('conv-1');
      expect((await s.chatLogs.list()).map((l) => l.id)).toEqual(['conv-2']);
    });

    it('counters: count within a window, restart after it ends, and keep keys apart', async () => {
      const s = setup.store();
      const now = new Date('2026-09-29T10:00:00Z');
      const ends = new Date('2026-09-29T11:00:00Z');
      expect(await s.counters.increment('k', ends, now)).toBe(1);
      expect(await s.counters.increment('k', ends, now)).toBe(2);
      expect(await s.counters.increment('other', ends, now)).toBe(1);
      const later = new Date('2026-09-29T11:00:01Z');
      expect(await s.counters.increment('k', new Date('2026-09-29T12:00:00Z'), later)).toBe(1);
    });

    it('counters: simultaneous increments are all counted', async () => {
      const s = setup.store();
      const now = new Date('2026-09-29T10:00:00Z');
      const ends = new Date('2026-09-29T11:00:00Z');
      const results = await Promise.all(Array.from({ length: 5 }, () => s.counters.increment('busy', ends, now)));
      expect([...results].sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('spotify: read is null, save then read, rotate keeps the account', async () => {
      const s = setup.store();
      await expect(s.spotify.read()).resolves.toBeNull();
      await s.spotify.save({ refreshToken: 'r1', spotifyUserId: 'alex' }, new Date('2026-09-01T00:00:00Z'));
      await expect(s.spotify.read()).resolves.toEqual({ refreshToken: 'r1', spotifyUserId: 'alex', updatedAt: '2026-09-01T00:00:00.000Z' });
      await s.spotify.rotate('r2', new Date('2026-09-02T00:00:00Z'));
      await expect(s.spotify.read()).resolves.toEqual({ refreshToken: 'r2', spotifyUserId: 'alex', updatedAt: '2026-09-02T00:00:00.000Z' });
    });

    it('spotify: remove forgets the connection, and removing nothing is fine', async () => {
      const s = setup.store();
      await expect(s.spotify.remove()).resolves.toBeUndefined();
      await s.spotify.save({ refreshToken: 'r1', spotifyUserId: 'alex' });
      await s.spotify.remove();
      await expect(s.spotify.read()).resolves.toBeNull();
    });

    it('addons: get is null, set then get round-trips, and a second set replaces the whole value', async () => {
      const s = setup.store();
      await expect(s.addons.get()).resolves.toBeNull();
      const sealed = { v: 1 as const, salt: 'c2FsdA==', iv: 'aXY=', tag: 'dGFn', data: 'ZGF0YQ==' };
      const both = { anthropicKey: sealed, spotify: { clientId: 'client-1', clientSecret: sealed }, updatedAt: '2026-10-05T00:00:00.000Z' };
      await s.addons.set(both);
      await expect(s.addons.get()).resolves.toEqual(both);
      await s.addons.set({ spotify: both.spotify, updatedAt: '2026-10-06T00:00:00.000Z' });
      await expect(s.addons.get()).resolves.toEqual({ spotify: both.spotify, updatedAt: '2026-10-06T00:00:00.000Z' });
      // Keys left undefined are dropped, never stored as null.
      await s.addons.set({ anthropicKey: undefined, updatedAt: '2026-10-07T00:00:00.000Z' });
      expect(await s.addons.get()).toStrictEqual({ updatedAt: '2026-10-07T00:00:00.000Z' });
      // Kept apart from the Spotify connection.
      await expect(s.spotify.read()).resolves.toBeNull();
    });

    it('moderation on an id that no longer exists does nothing', async () => {
      const s = setup.store();
      await expect(s.guestbook.approve('missing')).resolves.toBeUndefined();
      await expect(s.guestbook.remove('missing')).resolves.toBeUndefined();
      await expect(s.hallOfFame.approve('missing')).resolves.toBeUndefined();
      await expect(s.hallOfFame.remove('missing')).resolves.toBeUndefined();
      await expect(s.inbox.markRead('missing')).resolves.toBeUndefined();
      await expect(s.inbox.remove('missing')).resolves.toBeUndefined();
      await expect(s.chatLogs.remove('missing')).resolves.toBeUndefined();
      await expect(s.guestbook.list('gb')).resolves.toEqual([]);
      await expect(s.inbox.list('mail')).resolves.toEqual([]);
    });
  });
}
