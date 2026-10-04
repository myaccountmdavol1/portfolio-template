import type { Firestore } from 'firebase-admin/firestore';
import type { CounterStore } from './limits';

/**
 * Server-only rate-limit counters in `chatLimits/{key}`. Browsers can't read or write this collection
 * (firestore.rules denies everything outside published/draft/versions); only the Admin SDK can.
 * Optional: add a Firestore TTL policy on `expiresAt` to auto-delete old counters.
 */
export function firestoreCounterStore(db: Firestore): CounterStore {
  return {
    increment: (key, expiresAt, now) =>
      db.runTransaction(async (tx) => {
        const ref = db.collection('chatLimits').doc(key);
        const snap = await tx.get(ref);
        const current = snap.exists && (snap.get('expiresAt')?.toDate?.() ?? new Date(0)) > now ? Number(snap.get('n') ?? 0) : 0;
        tx.set(ref, { n: current + 1, expiresAt });
        return current + 1;
      }),
  };
}
