import type { Firestore } from 'firebase-admin/firestore';
import { firestoreCounterStore } from '../chat/firestoreCounter';
import type { ChatLog } from '../chat/log';
import { appendChatLog } from '../chat/firestoreLog';
import type { InboxMessage } from '../contact';
import { readSiteData, writeSiteData } from '../firebase/siteRepository';
import { addNote, listApprovedNotes } from '../guestbook/firestore';
import type { GuestbookNote } from '../guestbook/notes';
import { addHallEntry, listApprovedHall } from '../hallOfFame/firestore';
import type { HallEntry } from '../hallOfFame/entries';
import type { ServerStore, SpotifyConnection } from './types';

const newestFirst = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);

/** Moderating something another tab already deleted is a no-op, as on Postgres. (gRPC 5 = NOT_FOUND) */
const ignoreMissing = (err: unknown) => {
  if ((err as { code?: number }).code === 5) return;
  throw err;
};

/** The Firebase backend: Firestore through the Admin SDK, with the same paths and shapes as before the store existed. */
export function firebaseStore(db: Firestore): ServerStore {
  // Server-only. `private/spotify` is closed to every browser by firestore.rules.
  const spotifyDoc = () => db.doc('private/spotify');
  return {
    kind: 'firebase',
    site: {
      read: (scope) => readSiteData(db, scope),
      write: (scope, data) => writeSiteData(db, scope, data),
    },
    guestbook: {
      add: (note, status, now) => addNote(db, note, status, now),
      listApproved: (appId, limit) => listApprovedNotes(db, appId, limit),
      async list(appId) {
        const snap = await db.collection('guestbook').where('appId', '==', appId).get();
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GuestbookNote, 'id'>) })).sort(newestFirst);
      },
      async approve(id) {
        await db.doc(`guestbook/${id}`).update({ status: 'approved' }).catch(ignoreMissing);
      },
      async remove(id) {
        await db.doc(`guestbook/${id}`).delete();
      },
    },
    hallOfFame: {
      add: (entry, now) => addHallEntry(db, entry, now),
      listApproved: (limit) => listApprovedHall(db, limit),
      async list() {
        const snap = await db.collection('hallOfFame').get();
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<HallEntry, 'id'>) })).sort(newestFirst);
      },
      async approve(id) {
        await db.doc(`hallOfFame/${id}`).update({ status: 'approved' }).catch(ignoreMissing);
      },
      async remove(id) {
        await db.doc(`hallOfFame/${id}`).delete();
      },
    },
    inbox: {
      async add(message, now = new Date()) {
        const ref = db.collection('inbox').doc();
        await ref.set({ ...message, createdAt: now.toISOString(), read: false });
        return ref.id;
      },
      async list(appId) {
        const snap = await db.collection('inbox').where('appId', '==', appId).get();
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<InboxMessage, 'id'>) })).sort(newestFirst);
      },
      async markRead(id) {
        await db.doc(`inbox/${id}`).update({ read: true }).catch(ignoreMissing);
      },
      async remove(id) {
        await db.doc(`inbox/${id}`).delete();
      },
    },
    chatLogs: {
      append: (conversationId, appId, question, answer, now) => appendChatLog(db, conversationId, appId, question, answer, now),
      async list(limit = 100) {
        const snap = await db.collection('chatLogs').orderBy('updatedAt', 'desc').limit(limit).get();
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatLog, 'id'>) }));
      },
      async remove(id) {
        await db.doc(`chatLogs/${id}`).delete();
      },
    },
    counters: firestoreCounterStore(db),
    spotify: {
      async read() {
        const snap = await spotifyDoc().get();
        return snap.exists ? (snap.data() as SpotifyConnection) : null;
      },
      async save(connection, now = new Date()) {
        await spotifyDoc().set({ ...connection, updatedAt: now.toISOString() });
      },
      async rotate(refreshToken, now = new Date()) {
        await spotifyDoc().set({ refreshToken, updatedAt: now.toISOString() }, { merge: true });
      },
    },
  };
}
