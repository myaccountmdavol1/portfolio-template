'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createAddonsClient, type AddonsClient, type AddonsResult } from '@/lib/addons/client';
import { isChatOn, type AddonsResponse, type HostingAddons } from '@/lib/addons/types';
import type { EditorBackend } from '@/lib/editor/backend';

export interface AddonsApi {
  /** True on the Vercel backend (http): keys can be saved here. Firebase and local mode are read-only. */
  editable: boolean;
  /** What the hosting's variables set (all a read-only editor knows). */
  hosting: HostingAddons;
  /** The server's status (editable only); null while loading or after a failed load. */
  status: AddonsResponse | null;
  loadError: string | null;
  /** Whether visitors get chat; null while unknown. */
  chatOn: boolean | null;
  reload: () => void;
  /** Runs a save or remove. On success the status updates and null comes back; otherwise the reason to show. */
  run: (action: (client: AddonsClient) => Promise<AddonsResult>) => Promise<string | null>;
}

export function useAddons(kind: EditorBackend['kind'], hosting: HostingAddons): AddonsApi {
  const editable = kind === 'http';
  const client = useMemo(() => createAddonsClient(), []);
  const [status, setStatus] = useState<AddonsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // State is only set in the promise callback, after the effect.
  useEffect(() => {
    if (!editable) return;
    let cancelled = false;
    void client.load().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setStatus(result.status);
        setLoadError(null);
      } else setLoadError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [editable, client, attempt]);

  const run = useCallback(
    async (action: (c: AddonsClient) => Promise<AddonsResult>) => {
      const result = await action(client);
      if (!result.ok) return result.error;
      setStatus(result.status);
      return null;
    },
    [client],
  );
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return useMemo(
    () => ({
      editable,
      hosting,
      status,
      loadError,
      chatOn: editable ? (status ? isChatOn(status.chat) : null) : hosting.chat,
      reload,
      run,
    }),
    [editable, hosting, status, loadError, reload, run],
  );
}
