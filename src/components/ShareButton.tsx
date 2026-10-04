'use client';

import { Share } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSite } from '@/components/SiteContext';
import { shareLink } from '@/lib/share';

/** Shares (phone) or copies (desktop) a link to this site. `path` is site-relative, e.g. "/?open=badges". */
export function ShareButton({ path, title, look }: { path: string; title: string; look: 'icon' | 'pill' }) {
  const preferSheet = useSite()?.variant === 'phone';
  const [result, setResult] = useState<'copied' | 'failed' | null>(null);
  const url = typeof window === 'undefined' ? path : new URL(path, window.location.origin).href;

  useEffect(() => {
    if (!result) return;
    const id = window.setTimeout(() => setResult(null), result === 'copied' ? 2000 : 8000);
    return () => window.clearTimeout(id);
  }, [result]);

  async function share() {
    const r = await shareLink(url, title, { preferSheet });
    setResult(r === 'shared' ? null : r);
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="Share"
        title="Share"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => void share()}
        className={
          look === 'icon'
            ? 'flex cursor-pointer items-center justify-center rounded-md p-1 text-[#6b675f] hover:bg-black/[.06]'
            : 'flex cursor-pointer items-center gap-1 self-start rounded-full bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30'
        }
      >
        <Share size={look === 'icon' ? 14 : 12} aria-hidden />
        {look === 'pill' && 'Share'}
      </button>
      {result && (
        <span
          role="status"
          className="absolute right-0 top-full z-20 mt-1 whitespace-nowrap rounded-lg bg-[#1c1c1e]/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg"
        >
          {result === 'copied' ? (
            'Link copied'
          ) : (
            // Copying was blocked: show the link, selected, to copy by hand.
            <input aria-label="Link" readOnly value={url} autoFocus onFocus={(e) => e.currentTarget.select()} className="w-56 bg-transparent text-white outline-none" />
          )}
        </span>
      )}
    </span>
  );
}
