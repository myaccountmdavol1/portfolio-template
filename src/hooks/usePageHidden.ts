'use client';

import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

/** True while the tab is in the background (document.hidden). False while server-rendering. */
export function usePageHidden(): boolean {
  return useSyncExternalStore(subscribe, () => document.hidden, () => false);
}
