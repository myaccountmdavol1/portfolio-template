'use client';

import { useCallback, useEffect, useState } from 'react';

export type PasswordSession =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      configured: boolean;
      setupCodeTooShort: boolean;
      claimed: boolean;
      owner: boolean;
      /** The signed-in owner has finished the setup wizard. */
      setupDone: boolean;
      media: 'blob' | 'blob-presigned' | 'disk' | null;
    };

type Ready = Extract<PasswordSession, { status: 'ready' }>;

/** The owner's sign-in on Vercel-backend sites, from GET /api/owner/session. `refresh` resolves to the new state (null on error). */
export function usePasswordSession() {
  const [session, setSession] = useState<PasswordSession>({ status: 'loading' });
  const refresh = useCallback(async (): Promise<Ready | null> => {
    try {
      const res = await fetch('/api/owner/session', { cache: 'no-store' });
      if (!res.ok) throw new Error(`session ${res.status}`);
      const ready: Ready = { ...((await res.json()) as Omit<Ready, 'status'>), status: 'ready' };
      setSession(ready);
      return ready;
    } catch (err) {
      console.error('Could not check sign-in', err);
      setSession({ status: 'error' });
      return null;
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { session, refresh };
}
