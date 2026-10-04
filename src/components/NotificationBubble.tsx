'use client';

import { useSyncExternalStore } from 'react';
import { useEditor } from '@/components/editor/EditorContext';
import { useSite } from '@/components/SiteContext';
import { EMPTY_PROGRESS } from '@/lib/achievements';
import { readProgress, subscribeProgress } from '@/lib/gameEvents';
import { bubbleFor, bubbleSignature, bubbleText, readSeen, subscribeSeen } from '@/lib/notifications';
import type { PortfolioApp } from '@/lib/types';

const noSeen: Record<string, string> = {};
const emptyProgress = () => EMPTY_PROGRESS;

/** The red bubble on an app icon (a number or a dot). Put it inside a `relative` box around the icon. */
export function NotificationBubble({ app, size = 60 }: { app: PortfolioApp; size?: number }) {
  const data = useSite()?.data ?? null;
  const editing = !!useEditor();
  // Only Game Center's automatic count needs the visitor's achievements; other icons skip reading them.
  const needsProgress = app.type === 'gamecenter' && app.notification?.mode === 'auto';
  const progress = useSyncExternalStore(subscribeProgress, needsProgress ? readProgress : emptyProgress, emptyProgress);
  const seen = useSyncExternalStore(subscribeSeen, readSeen, () => noSeen);
  const bubble = bubbleFor(app, data, progress);
  if (!bubble) return null;
  // In Edit mode it always shows, so the owner sees what visitors get.
  if (!editing && seen[app.id] === bubbleSignature(app, bubble)) return null;

  const scale = Math.max(0.7, Math.min(1.2, size / 60));
  if (bubble.kind === 'dot') {
    return (
      <span
        aria-label="New"
        data-testid="notification-bubble"
        className="bubble-pop pointer-events-none absolute right-0 top-0 z-10 block rounded-full bg-[#ff3b30] shadow-[0_1px_3px_rgba(0,0,0,.35)] ring-2 ring-white/90"
        style={{ width: 14 * scale, height: 14 * scale, transform: 'translate(30%, -30%)' }}
      />
    );
  }
  const text = bubbleText(bubble.value);
  return (
    <span
      aria-label={`${bubble.value} new`}
      data-testid="notification-bubble"
      className="bubble-pop pointer-events-none absolute right-0 top-0 z-10 flex items-center justify-center rounded-full bg-[#ff3b30] px-[0.35em] font-semibold tabular-nums text-white shadow-[0_1px_3px_rgba(0,0,0,.35)]"
      style={{ minWidth: 22 * scale, height: 22 * scale, fontSize: 13 * scale, lineHeight: 1, transform: 'translate(30%, -30%)' }}
    >
      {text}
    </span>
  );
}
