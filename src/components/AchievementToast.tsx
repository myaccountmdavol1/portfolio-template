'use client';

import { useEffect, useState } from 'react';
import type { Achievement } from '@/lib/achievements';
import { onUnlock } from '@/lib/gameEvents';

/**
 * Game Center-style banner when an achievement unlocks. Shown only if the site has a Game Center app.
 * `held` (the guided tour is playing): banners queue up and show once it ends.
 */
export function AchievementToast({ held = false }: { held?: boolean }) {
  const [queue, setQueue] = useState<Achievement[]>([]);

  useEffect(() => onUnlock((a) => setQueue((q) => [...q, a])), []);

  useEffect(() => {
    if (queue.length === 0 || held) return;
    const id = window.setTimeout(() => setQueue((q) => q.slice(1)), 3200);
    return () => window.clearTimeout(id);
  }, [queue, held]);

  const current = queue[0];
  if (!current || held) return null;
  return (
    <div
      key={current.id}
      role="status"
      aria-label="Achievement unlocked"
      className="call-in fixed inset-x-0 top-[max(44px,calc(env(safe-area-inset-top)+8px))] z-[9750] mx-auto flex w-[min(360px,calc(100%-16px))] items-center gap-3 rounded-2xl bg-[#1c1c1e]/90 p-3 text-white shadow-[0_18px_44px_rgba(0,0,0,.35)] backdrop-blur-xl"
    >
      <span aria-hidden className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-gradient-to-br from-[#ffd60a] to-[#ff9f0a] text-2xl">
        {current.emoji}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Achievement unlocked</span>
        <span className="truncate text-[15px] font-semibold">{current.title}</span>
      </span>
    </div>
  );
}
