'use client';

import { useSyncExternalStore } from 'react';

// Control Center switches a visitor flips for themselves (kept in their browser): Night Shift and Focus.

export type VisitorPref = 'nightShift' | 'focus';

const KEY = 'portfolio:prefs';
const listeners = new Set<() => void>();
let cached: Partial<Record<VisitorPref, boolean>> | null = null;

function readAll(): Partial<Record<VisitorPref, boolean>> {
  if (cached) return cached;
  try {
    cached = JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as Partial<Record<VisitorPref, boolean>>;
  } catch {
    cached = {};
  }
  return cached;
}

export function readPref(pref: VisitorPref): boolean {
  if (typeof window === 'undefined') return false;
  return readAll()[pref] === true;
}

export function setPref(pref: VisitorPref, on: boolean): void {
  cached = { ...readAll(), [pref]: on };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cached));
  } catch {
    // storage blocked: lasts for this page view
  }
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function usePref(pref: VisitorPref): boolean {
  return useSyncExternalStore(
    subscribe,
    () => readPref(pref),
    () => false,
  );
}
