import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { deleteObject, getDownloadURL, getMetadata, listAll, ref, uploadBytes } from 'firebase/storage';
import type { ChatLog } from '../chat/log';
import type { InboxMessage } from '../contact';
import type { GuestbookNote } from '../guestbook/notes';
import type { HallEntry } from '../hallOfFame/entries';
import { clientAuth, clientDb, clientStorage } from '../firebase/client';
import { listVersions, publishSite, readScope, writeDraft } from '../firebase/draftRepository';
import { storagePath, type EditorBackend } from './backend';

export function createFirebaseBackend(): EditorBackend {
  const db = clientDb();
  return {
    kind: 'firebase',
    loadDraft: () => readScope(db, 'draft'),
    saveDraft: (next, prev) => writeDraft(db, next, prev),
    publish: async (data) => {
      await publishSite(db, data);
      // The server caches the live site; ask it to re-read now. If this fails, it refreshes within 5 minutes anyway.
      try {
        const token = await clientAuth().currentUser?.getIdToken();
        if (token) await fetch('/api/revalidate', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      } catch (err) {
        console.warn('Could not refresh the live site cache', err);
      }
    },
    upload: async (file, folder) => {
      const target = ref(clientStorage(), storagePath(folder, file.name));
      await uploadBytes(target, file, { contentType: file.type });
      return getDownloadURL(target);
    },
    media: {
      list: async (folder) => {
        const { items } = await listAll(ref(clientStorage(), folder));
        const files = await Promise.all(
          items.slice(0, 300).map(async (item) => {
            const [url, meta] = await Promise.all([getDownloadURL(item), getMetadata(item)]);
            // Uploads are named "<timestamp>-<name>"; show just the name.
            return { path: item.fullPath, folder, name: item.name.replace(/^\d+-/, ''), url, size: meta.size, updated: meta.updated };
          }),
        );
        return files.sort((a, b) => (b.updated ?? '').localeCompare(a.updated ?? ''));
      },
      remove: (path) => deleteObject(ref(clientStorage(), path)),
    },
    chatLogs: {
      list: async () => {
        const snap = await getDocs(query(collection(db, 'chatLogs'), orderBy('updatedAt', 'desc'), limit(100)));
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatLog, 'id'>) }));
      },
      remove: (id) => deleteDoc(doc(db, 'chatLogs', id)),
    },
    guestbook: {
      list: async (appId) => {
        const snap = await getDocs(query(collection(db, 'guestbook'), where('appId', '==', appId)));
        return snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<GuestbookNote, 'id'>) }))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      approve: (id) => updateDoc(doc(db, 'guestbook', id), { status: 'approved' }),
      remove: (id) => deleteDoc(doc(db, 'guestbook', id)),
    },
    hallOfFame: {
      list: async () => {
        const snap = await getDocs(collection(db, 'hallOfFame'));
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<HallEntry, 'id'>) })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      approve: (id) => updateDoc(doc(db, 'hallOfFame', id), { status: 'approved' }),
      remove: (id) => deleteDoc(doc(db, 'hallOfFame', id)),
    },
    inbox: {
      list: async (appId) => {
        const snap = await getDocs(query(collection(db, 'inbox'), where('appId', '==', appId)));
        return snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<InboxMessage, 'id'>) }))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      },
      markRead: (id) => updateDoc(doc(db, 'inbox', id), { read: true }),
      remove: (id) => deleteDoc(doc(db, 'inbox', id)),
    },
    versions: { list: () => listVersions(db) },
  };
}
