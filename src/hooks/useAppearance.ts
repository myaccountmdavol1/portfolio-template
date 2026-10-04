'use client';

import { useSyncExternalStore } from 'react';
import { resolveDark, type Appearance } from '@/lib/appearance';
import { trackEvent } from '@/lib/gameEvents';

const KEY = 'portfolio:appearance';
const DARK_QUERY = '(prefers-color-scheme: dark)';
const listeners = new Set<() => void>();
let brightness = 1; // per page view; not saved

function readChoice(): 'light' | 'dark' | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const mql = window.matchMedia(DARK_QUERY);
  mql.addEventListener('change', onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    mql.removeEventListener('change', onChange);
    window.removeEventListener('storage', onChange);
  };
}

const notify = () => listeners.forEach((l) => l());

/** Dark Mode + brightness, shared by Control Center, the desktop, and the phone. */
export function useAppearance(siteDefault: Appearance | undefined, allowChoice = true) {
  // With the Dark Mode tile switched off, a visitor's earlier choice no longer applies.
  const saved = useSyncExternalStore(subscribe, readChoice, () => null);
  const choice = allowChoice ? saved : null;
  const systemDark = useSyncExternalStore(subscribe, () => window.matchMedia(DARK_QUERY).matches, () => false);
  const level = useSyncExternalStore(subscribe, () => brightness, () => 1);
  return {
    dark: resolveDark(choice, siteDefault, systemDark),
    brightness: level,
    setDark(dark: boolean) {
      try {
        window.localStorage.setItem(KEY, dark ? 'dark' : 'light');
      } catch {
        // storage blocked — the change won't persist, which is fine
      }
      notify();
      trackEvent({ type: dark ? 'darkMode' : 'lightMode' });
    },
    setBrightness(value: number) {
      brightness = Math.min(1, Math.max(0.3, value));
      notify();
    },
  };
}
