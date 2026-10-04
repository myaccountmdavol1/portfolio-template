import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True once the client-side Firebase config is present. The editor checks this before touching Firestore/Auth. */
export function isFirebaseClientConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp(config);

export function clientDb(): Firestore {
  return getFirestore(app);
}

export function clientStorage(): FirebaseStorage {
  return getStorage(app);
}

export function clientAuth(): Auth {
  return getAuth(app);
}
