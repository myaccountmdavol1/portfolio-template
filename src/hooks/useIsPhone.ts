'use client';

import { useSyncExternalStore } from 'react';

const PHONE_QUERY = '(max-width: 699.98px)';

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(PHONE_QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

/** True when the viewport is narrower than 700px. `initial` is the server's user-agent guess. */
export function useIsPhone(initial: boolean): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => initial,
  );
}
