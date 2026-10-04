import { activeAchievements, type Progress } from './achievements';
import type { PortfolioApp, SiteData } from './types';

// The red notification bubbles on app icons. Pure helpers plus a tiny per-visitor “already opened” store.

export type Bubble = { kind: 'dot' } | { kind: 'number'; value: number };

/** Apps whose “Automatic” bubble counts something real. */
export function supportsAutoNotification(app: Pick<PortfolioApp, 'type'>): boolean {
  return app.type === 'wallet' || app.type === 'gamecenter';
}

/** What the bubble shows right now, ignoring whether the visitor has opened the app. */
export function bubbleFor(app: PortfolioApp, data: SiteData | null, progress: Progress | null): Bubble | null {
  const n = app.notification;
  if (!n) return null;
  if (n.mode === 'dot') return { kind: 'dot' };
  if (n.mode === 'number') return n.count > 0 ? { kind: 'number', value: Math.round(n.count) } : null;
  if (app.type === 'wallet') {
    const count = (app.content.passes ?? []).filter((p) => p.title.trim()).length;
    return count > 0 ? { kind: 'number', value: count } : null;
  }
  if (app.type === 'gamecenter' && data) {
    const left = activeAchievements(data).filter((a) => !progress?.unlocked.includes(a.id)).length;
    return left > 0 ? { kind: 'number', value: left } : null;
  }
  return { kind: 'dot' };
}

/**
 * What “seen” is remembered as. A new badge count (or a new number from the owner) shows the bubble again;
 * Game Center's countdown doesn't, or it would pop back after every achievement.
 */
export function bubbleSignature(app: PortfolioApp, bubble: Bubble | null): string {
  if (!bubble || !app.notification) return '';
  if (app.type === 'gamecenter' && app.notification.mode === 'auto') return 'auto';
  return `${app.notification.mode}:${bubble.kind === 'number' ? bubble.value : 'dot'}`;
}

/** The bubble a number shows: “99+” past 99. */
export const bubbleText = (value: number) => (value > 99 ? '99+' : String(value));

// ---------------- per-visitor “opened” store (browser only) ----------------

const KEY = 'portfolio:seenBubbles';
const listeners = new Set<() => void>();
let cached: Record<string, string> | null = null;

export function readSeen(): Record<string, string> {
  if (cached) return cached;
  try {
    cached = JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as Record<string, string>;
  } catch {
    cached = {};
  }
  return cached;
}

export function markBubbleSeen(appId: string, signature: string): void {
  if (!signature || readSeen()[appId] === signature) return;
  cached = { ...readSeen(), [appId]: signature };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cached));
  } catch {
    // storage blocked: cleared for this page view only
  }
  listeners.forEach((l) => l());
}

export function subscribeSeen(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}
