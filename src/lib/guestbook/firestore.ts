import type { Firestore } from 'firebase-admin/firestore';
import { toPublicNote, type GuestbookNote, type NoteSubmission, type PublicNote } from './notes';

// Server-only (Admin SDK). Browsers can't create notes directly (see firestore.rules).

export async function addNote(db: Firestore, note: NoteSubmission, status: GuestbookNote['status'], now = new Date()): Promise<string> {
  const ref = db.collection('guestbook').doc();
  await ref.set({ ...note, status, createdAt: now.toISOString() });
  return ref.id;
}

/** Approved notes for one guestbook, newest first. (Filtered in memory: no composite index needed.) */
export async function listApprovedNotes(db: Firestore, appId: string, limit = 60): Promise<PublicNote[]> {
  const snap = await db.collection('guestbook').where('appId', '==', appId).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<GuestbookNote, 'id'>) }))
    .filter((n) => n.status === 'approved')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map(toPublicNote);
}
