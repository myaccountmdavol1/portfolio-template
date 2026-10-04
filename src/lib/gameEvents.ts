import { ACHIEVEMENTS, applyGameEvent, EMPTY_PROGRESS, type Achievement, type GameEvent, type Progress } from './achievements';

// A tiny browser-side event bus: any component can report something the visitor did; the Game Center
// (if the owner added one) turns it into achievements, remembered in this browser's localStorage.

const KEY = 'portfolio:achievements';
const progressListeners = new Set<() => void>();
const unlockListeners = new Set<(a: Achievement) => void>();
// Which achievements count on this site (set by the desktop/phone from the site's apps and settings).
let activeIds: string[] = ACHIEVEMENTS.filter((a) => !a.secret).map((a) => a.id);
// Secret bonus achievements this site offers: they get a banner too, but never count towards Platinum.
let secretIds: string[] = [];

export function setSecretAchievements(ids: string[]): void {
  secretIds = ids;
}

export function setActiveAchievements(ids: string[]): void {
  activeIds = ids;
}
let cached: Progress | null = null;

export function readProgress(): Progress {
  if (cached) return cached;
  try {
    const raw = window.localStorage.getItem(KEY);
    cached = raw ? { ...EMPTY_PROGRESS, ...(JSON.parse(raw) as Progress) } : EMPTY_PROGRESS;
  } catch {
    cached = EMPTY_PROGRESS;
  }
  return cached;
}

export function trackEvent(event: GameEvent): void {
  if (typeof window === 'undefined') return;
  const before = readProgress();
  const result = applyGameEvent(before, event);
  const { newlyUnlocked } = result;
  let progress = result.progress;
  if (progress === before) return;
  const now = Date.now();
  if (!progress.startedAt) progress = { ...progress, startedAt: before.startedAt ?? now };
  const newlyActive = newlyUnlocked.filter((a) => activeIds.includes(a.id));
  const newlySecret = newlyUnlocked.filter((a) => secretIds.includes(a.id));
  const completedNow = newlyActive.length > 0 && activeIds.length > 0 && activeIds.every((id) => progress.unlocked.includes(id));
  if (completedNow) progress = { ...progress, finishedAt: now };
  cached = progress;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // storage blocked: achievements last for this page view only
  }
  progressListeners.forEach((l) => l());
  [...newlyActive, ...newlySecret].forEach((a) => unlockListeners.forEach((l) => l(a)));
  // Every achievement found: let the last banner show, then roll the finale.
  if (completedNow) window.setTimeout(() => startFinale('full'), 2600);
}

// ---- the finale ----

export const FINALE_EVENT = 'portfolio:finale';
const FINALE_DONE_KEY = 'portfolio:finaleDone';
const VISITOR_NAME_KEY = 'portfolio:visitorName';

/** `full` plays the whole show; `reward` jumps straight to the reward card (the Top Secret folder). */
export function startFinale(mode: 'full' | 'reward'): void {
  window.dispatchEvent(new CustomEvent(FINALE_EVENT, { detail: mode }));
}

export function isFinaleDone(): boolean {
  try {
    return window.localStorage.getItem(FINALE_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markFinaleDone(): void {
  try {
    window.localStorage.setItem(FINALE_DONE_KEY, '1');
  } catch {
    // ignore
  }
  progressListeners.forEach((l) => l());
}

/** The visitor's name, remembered when they sign the guestbook, send a drawing, or send mail. */
export function rememberVisitorName(name: string): void {
  try {
    if (name.trim()) window.localStorage.setItem(VISITOR_NAME_KEY, name.trim().slice(0, 60));
  } catch {
    // ignore
  }
}

export function visitorName(): string | null {
  try {
    return window.localStorage.getItem(VISITOR_NAME_KEY);
  } catch {
    return null;
  }
}

export function subscribeProgress(onChange: () => void): () => void {
  progressListeners.add(onChange);
  return () => progressListeners.delete(onChange);
}

export function onUnlock(listener: (a: Achievement) => void): () => void {
  unlockListeners.add(listener);
  return () => unlockListeners.delete(listener);
}
