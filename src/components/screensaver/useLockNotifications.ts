'use client';

import { useEffect, useState } from 'react';
import { shownTiles } from '@/lib/controlCenter';
import { fetchNotes } from '@/lib/guestbook/client';
import type { PublicNote } from '@/lib/guestbook/notes';
import { lockNotifications, wasCallMissed, type LockNotification, type ResolvedLock } from '@/lib/screensavers/lock';
import type { NowPlaying } from '@/lib/spotify/nowPlaying';
import type { SiteData } from '@/lib/types';

/**
 * "While you were away", looked up when the lock screen shows: this session's missed call, the newest approved
 * guestbook note, and the owner's Spotify (only while it's playing). Anything unconfigured or failing shows nothing.
 */
export function useLockNotifications(data: SiteData, lock: ResolvedLock): LockNotification[] {
  const [missedCall] = useState(wasCallMissed);
  const [note, setNote] = useState<PublicNote | null>(null);
  const [track, setTrack] = useState<NowPlaying | null>(null);
  const guestbookId = lock.notifications.guestbook ? (data.apps.find((a) => a.visible && a.type === 'guestbook')?.id ?? null) : null;
  const wantsTrack = lock.notifications.nowPlaying && shownTiles(data.site).has('nowPlaying');

  useEffect(() => {
    if (!guestbookId) return;
    let cancelled = false;
    fetchNotes(guestbookId).then(
      (notes) => {
        if (!cancelled) setNote(notes[0] ?? null);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [guestbookId]);

  useEffect(() => {
    if (!wantsTrack) return;
    let cancelled = false;
    fetch('/api/now-playing')
      .then((r) => (r.ok ? (r.json() as Promise<{ track?: NowPlaying | null }>) : null))
      .then((body) => {
        if (!cancelled) setTrack(body?.track ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [wantsTrack]);

  return lockNotifications(data, lock, { missedCall, note, track });
}
