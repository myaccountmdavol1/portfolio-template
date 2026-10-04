'use client';

import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import { isOwnerUser } from '@/lib/editor/owner';
import { clientAuth, isFirebaseClientConfigured } from '@/lib/firebase/client';

export type OwnerStatus = 'loading' | 'signedOut' | 'owner' | 'notOwner' | 'unconfigured';

/** Firebase Auth state, reduced to what the editor cares about. Non-owners are signed straight back out. */
export function useOwnerSession() {
  const [status, setStatus] = useState<OwnerStatus>(() => (isFirebaseClientConfigured() ? 'loading' : 'unconfigured'));

  useEffect(() => {
    if (!isFirebaseClientConfigured()) return;
    const auth = clientAuth();
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        setStatus((s) => (s === 'notOwner' ? s : 'signedOut'));
      } else if (isOwnerUser(user)) {
        setStatus('owner');
      } else {
        setStatus('notOwner');
        void signOut(auth);
      }
    });
  }, []);

  const signIn = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(clientAuth(), provider);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(clientAuth());
    setStatus('signedOut');
  }, []);

  return { status, signIn, signOut: signOutUser };
}
