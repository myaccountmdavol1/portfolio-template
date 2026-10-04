import { resolveLock } from './screensavers/lock';
import { playableModules, resolveModule } from './screensavers/registry';
import { screensaverSettings } from './screensavers/settings';
import { tourStops } from './tour';
import type { SiteData } from './types';

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** A hidden bonus: shown only once found, and never needed for Platinum. */
  secret?: boolean;
  /** For the owner (Game Center settings): where a secret one is found. */
  hint?: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-app', emoji: '👋', title: 'Hello there', description: 'Open your first app' },
  { id: 'explorer', emoji: '🧭', title: 'Explorer', description: 'Open 5 different apps' },
  { id: 'seen-it-all', emoji: '🗺️', title: 'Seen it all', description: 'Open every app' },
  { id: 'caller', emoji: '📞', title: 'Pick up!', description: 'Answer the call (or call back / FaceTime me)' },
  { id: 'searcher', emoji: '🔍', title: 'Seeker', description: 'Search with Spotlight' },
  { id: 'night-owl', emoji: '🌙', title: 'Night owl', description: 'Turn on Dark Mode' },
  { id: 'early-bird', emoji: '☀️', title: 'Early bird', description: 'Switch to Light Mode' },
  { id: 'hacker', emoji: '💻', title: 'sudo make me a sandwich', description: 'Try sudo in the Terminal' },
  { id: 'artist', emoji: '🎨', title: 'Artist', description: 'Draw something in Freeform' },
  { id: 'chatty', emoji: '💬', title: 'Chatty', description: 'Send a message' },
  { id: 'lost', emoji: '🔦', title: 'Lost & found', description: 'Found the page that doesn’t exist', secret: true, hint: 'found on your 404 page' },
  { id: 'signed', emoji: '📝', title: 'Left your mark', description: 'Leave a note in the guestbook' },
  { id: 'tour', emoji: '🎬', title: 'Took the tour', description: 'Watched the guided tour to the end', secret: true, hint: 'for watching the guided tour to the end' },
  { id: 'corner', emoji: '🎯', title: 'Corner shot', description: 'Saw the bouncing initials hit a corner exactly', secret: true, hint: 'found in the Bouncing initials screen saver (an exact corner hit)' },
  { id: 'password', emoji: '🔑', title: 'Password guru', description: 'Unlocked the lock screen with the password', secret: true, hint: 'found on the lock screen (its hint gives the password away)' },
];

export type GameEvent =
  | { type: 'open'; appId: string; totalApps: number }
  | { type: 'answerCall' | 'spotlight' | 'darkMode' | 'lightMode' | 'sudo' | 'draw' | 'chat' | 'guestbook' | 'lost' | 'tour' | 'corner' | 'password' };

export interface Progress {
  opened: string[];
  unlocked: string[];
  startedAt?: number; // first event (ms), for the certificate's “completed in”
  finishedAt?: number; // when the last achievement unlocked
}

export const EMPTY_PROGRESS: Progress = { opened: [], unlocked: [] };

const SIMPLE: Record<Exclude<GameEvent['type'], 'open'>, string> = {
  answerCall: 'caller',
  spotlight: 'searcher',
  darkMode: 'night-owl',
  lightMode: 'early-bird',
  sudo: 'hacker',
  draw: 'artist',
  chat: 'chatty',
  guestbook: 'signed',
  lost: 'lost',
  tour: 'tour',
  corner: 'corner',
  password: 'password',
};

/** Pure: applies one event and returns the new progress plus anything unlocked just now. */
export function applyGameEvent(progress: Progress, event: GameEvent): { progress: Progress; newlyUnlocked: Achievement[] } {
  const opened = event.type === 'open' && !progress.opened.includes(event.appId) ? [...progress.opened, event.appId] : progress.opened;
  const earned = new Set(progress.unlocked);
  if (event.type === 'open') {
    if (opened.length >= 1) earned.add('first-app');
    if (opened.length >= 5) earned.add('explorer');
    if (event.totalApps > 0 && opened.length >= event.totalApps) earned.add('seen-it-all');
  } else {
    earned.add(SIMPLE[event.type]);
  }
  const newlyUnlocked = ACHIEVEMENTS.filter((a) => earned.has(a.id) && !progress.unlocked.includes(a.id));
  if (newlyUnlocked.length === 0 && opened === progress.opened) return { progress, newlyUnlocked };
  return { progress: { ...progress, opened, unlocked: [...progress.unlocked, ...newlyUnlocked.map((a) => a.id)] }, newlyUnlocked };
}

// ---- which achievements a site can actually offer ----

const hasApp = (data: SiteData, type: string) => data.apps.some((a) => a.visible && a.type === type);

/** Why an achievement can't be earned on this site (null = it can). */
function unavailableReason(id: string, data: SiteData): string | null {
  const darkDefault = data.site.appearance === 'dark';
  const offBar = data.site.menuBar.hide ?? [];
  if ((id === 'night-owl' || id === 'early-bird') && offBar.includes('controlCenter')) return 'Control Center is switched off in the menu bar';
  if ((id === 'night-owl' || id === 'early-bird') && data.site.controlCenter?.hide?.includes('darkMode')) return 'the Dark Mode tile is switched off in Control Center';
  if (id === 'searcher' && offBar.includes('search')) return 'Spotlight is switched off in the menu bar';
  switch (id) {
    case 'explorer':
      return data.apps.filter((a) => a.visible).length >= 6 ? null : 'needs at least 6 apps';
    case 'caller':
      return data.site.incomingCall.enabled || hasApp(data, 'facetime') ? null : 'needs the incoming call or a FaceTime app';
    case 'night-owl':
      return darkDefault ? 'your site already starts in Dark Mode' : null;
    case 'early-bird':
      return darkDefault ? null : 'only when your site starts in Dark Mode';
    case 'hacker':
      return hasApp(data, 'terminal') ? null : 'needs a Terminal app';
    case 'artist':
      return hasApp(data, 'freeform') ? null : 'needs a Freeform app';
    case 'chatty':
      return hasApp(data, 'messages') ? null : 'needs a Messages app';
    case 'signed':
      return hasApp(data, 'guestbook') || hasApp(data, 'freeform') ? null : 'needs a guestbook or Freeform app';
    case 'tour':
      return tourStops(data).length > 0 ? null : 'needs at least one tour stop';
    case 'corner': {
      const saver = screensaverSettings(data.site);
      if (!saver.enabled) return 'the screen saver is switched off';
      const bounce = resolveModule(data, 'bounce');
      if (!bounce.on) return 'the Bouncing initials screen saver is switched off';
      if (!bounce.available) return 'the Bouncing initials screen saver has no text';
      if (saver.pinned && saver.pinned !== 'bounce' && playableModules(data).includes(saver.pinned)) return `the screen saver always shows ${resolveModule(data, saver.pinned).name}`;
      return null;
    }
    case 'password': {
      const lock = resolveLock(data);
      if (!lock.enabled) return 'the lock screen is switched off';
      return lock.password === null ? 'the lock screen has no password' : null;
    }
    default:
      return null;
  }
}

export interface AchievementStatus {
  achievement: Achievement;
  /** false = this site can't award it (see `reason`). */
  available: boolean;
  reason: string | null;
  /** false = the owner switched it off. */
  enabled: boolean;
}

export function achievementStatuses(data: SiteData): AchievementStatus[] {
  const gc = data.apps.find((a) => a.type === 'gamecenter');
  const disabled = new Set(gc?.type === 'gamecenter' ? (gc.content.disabledAchievements ?? []) : []);
  return ACHIEVEMENTS.map((achievement) => {
    const reason = unavailableReason(achievement.id, data);
    return { achievement, available: reason === null, reason, enabled: !disabled.has(achievement.id) };
  });
}

/** The achievements that count towards Platinum on this site: possible to earn, not switched off, not secret. */
export function activeAchievements(data: SiteData): Achievement[] {
  return achievementStatuses(data)
    .filter((s) => s.available && s.enabled && !s.achievement.secret)
    .map((s) => s.achievement);
}

/** Secret bonus achievements this site offers (Game Center visible, possible to earn, not switched off by the owner). */
export function secretAchievements(data: SiteData): Achievement[] {
  if (!data.apps.some((a) => a.type === 'gamecenter' && a.visible)) return [];
  return achievementStatuses(data)
    .filter((s) => s.achievement.secret && s.available && s.enabled)
    .map((s) => s.achievement);
}
