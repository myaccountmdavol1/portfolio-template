'use client';

import { useEffect, useState } from 'react';
import type { FocusRequest } from './AppLinkContext';

/** A short note at the top of a window when its link named an item that's gone. */
export function MissingItemNote({ focus }: { focus: FocusRequest | null }) {
  const [hidden, setHidden] = useState<number | null>(null);
  useEffect(() => {
    if (!focus?.missing) return;
    const id = window.setTimeout(() => setHidden(focus.nonce), 5000);
    return () => window.clearTimeout(id);
  }, [focus]);
  if (!focus?.missing || hidden === focus.nonce) return null;
  return (
    <p role="status" className="m-0 flex-none bg-[#fff4d6] px-3 py-1.5 text-center text-xs font-medium text-[#6b4e00]">
      Couldn&rsquo;t find that item
    </p>
  );
}
