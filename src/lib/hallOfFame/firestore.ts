import type { Firestore } from 'firebase-admin/firestore';
import { toPublicEntry, type HallEntry, type HallSubmission, type PublicHallEntry } from './entries';

// Server-only (Admin SDK). Browsers can't create entries directly (see firestore.rules).

export async function addHallEntry(db: Firestore, entry: HallSubmission, now = new Date()): Promise<string> {
  const ref = db.collection('hallOfFame').doc();
  await ref.set({ ...entry, status: 'pending', createdAt: now.toISOString() });
  return ref.id;
}

/** Approved entries, newest first. */
export async function listApprovedHall(db: Firestore, limit = 50): Promise<PublicHallEntry[]> {
  const snap = await db.collection('hallOfFame').where('status', '==', 'approved').get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<HallEntry, 'id'>) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map(toPublicEntry);
}
