'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { activeAchievements, secretAchievements } from '@/lib/achievements';
import { FINALE_EVENT, isFinaleDone, setActiveAchievements, setSecretAchievements, subscribeProgress } from '@/lib/gameEvents';
import type { SiteData } from '@/lib/types';

/** Whether the owner has a Game Center with the finale switched on. */
export function finaleEnabled(data: SiteData): boolean {
  const gc = data.apps.find((a) => a.type === 'gamecenter' && a.visible);
  return gc?.type === 'gamecenter' && gc.content.finale?.enabled !== false;
}

/** Listens for the finale trigger; `done` (golden edition) persists in this browser. */
export function useFinale(data: SiteData) {
  const enabled = finaleEnabled(data);
  const [mode, setMode] = useState<'full' | 'reward' | null>(null);
  const done = useSyncExternalStore(subscribeProgress, isFinaleDone, () => false);
  const activeKey = activeAchievements(data)
    .map((a) => a.id)
    .join(',');
  // Only the achievements this site can offer (and the owner kept on) count towards Platinum.
  useEffect(() => setActiveAchievements(activeKey ? activeKey.split(',') : []), [activeKey]);
  const secretKey = secretAchievements(data)
    .map((a) => a.id)
    .join(',');
  useEffect(() => setSecretAchievements(secretKey ? secretKey.split(',') : []), [secretKey]);

  useEffect(() => {
    if (!enabled) return;
    const onFinale = (e: Event) => setMode((e as CustomEvent<'full' | 'reward'>).detail);
    window.addEventListener(FINALE_EVENT, onFinale);
    return () => window.removeEventListener(FINALE_EVENT, onFinale);
  }, [enabled]);

  return { mode, close: () => setMode(null), golden: enabled && done };
}
