'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { setEditorFlag } from '@/lib/editor/gate';
import { useOwnerSession } from './useOwnerSession';

const button =
  'inline-flex h-10 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-medium transition-colors';

export function AdminSignIn() {
  const { status, signIn, signOut } = useOwnerSession();
  const [error, setError] = useState<string | null>(null);

  // Remember the owner on this browser so the editor toolbar appears on the home page.
  useEffect(() => {
    if (status === 'owner') setEditorFlag(true);
    if (status === 'signedOut' || status === 'notOwner') setEditorFlag(false);
  }, [status]);

  async function handleSignIn() {
    setError(null);
    try {
      await signIn();
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError('Sign-in didn’t work. Check that Google sign-in is enabled in Firebase, then try again.');
        console.error(err);
      }
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#ebe7df] p-6 text-[#1d1c1a]">
      <div className="w-full max-w-sm rounded-2xl bg-[#fbfaf7] p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,.12)]">
        <h1 className="m-0 font-serif text-4xl font-normal">Editor</h1>

        {status === 'loading' && <p className="mt-4 text-sm text-[#6b675f]">Checking sign-in…</p>}

        {status === 'unconfigured' && (
          <div className="mt-4 flex flex-col gap-3 text-sm text-[#6b675f]">
            <p className="m-0">Firebase isn’t configured on this deployment, so there’s nothing to sign in to.</p>
            {process.env.NODE_ENV !== 'production' && (
              <Link href="/?editor=local" className={`${button} bg-[#1d1c1a] text-white`}>
                Try the local editor
              </Link>
            )}
          </div>
        )}

        {(status === 'signedOut' || status === 'notOwner') && (
          <div className="mt-4 flex flex-col gap-3">
            {status === 'notOwner' && (
              <p role="alert" className="m-0 text-sm text-[#b3261e]">
                This editor is private. That account isn’t the owner’s.
              </p>
            )}
            <button type="button" onClick={handleSignIn} className={`${button} bg-[#1d1c1a] text-white hover:bg-black`}>
              Sign in with Google
            </button>
          </div>
        )}

        {status === 'owner' && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="m-0 text-sm text-[#6b675f]">You’re signed in as the owner.</p>
            <Link href="/?edit=1" className={`${button} bg-[#0a84ff] text-white hover:bg-[#0071e3]`}>
              Open the editor
            </Link>
            <button type="button" onClick={() => void signOut()} className={`${button} text-[#6b675f] hover:bg-black/5`}>
              Sign out
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-[#b3261e]">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
