import { storeContract } from '../store/contract';

process.env.FIREBASE_PROJECT_ID ??= 'demo-portfolio-test';

const { adminDb } = await import('../../src/lib/firebase/admin');
const { firebaseStore } = await import('../../src/lib/store/firebase');

const wipe = async () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
  const res = await fetch(`http://${host}/emulator/v1/projects/${process.env.FIREBASE_PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Could not clear the Firestore emulator: ${res.status}`);
};

storeContract('firebase', { store: () => firebaseStore(adminDb()), reset: wipe });
