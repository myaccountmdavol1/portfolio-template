import type { HotCorner, ScreensaverModuleId, SiteSettings } from '../types';

// The screen saver's own settings, resolved with their defaults, plus its links and the test-only speed-up.

export const MODULE_IDS: readonly ScreensaverModuleId[] = ['hello', 'drift', 'memories', 'facts', 'flurry', 'bounce'];
export const DEFAULT_IDLE_MINUTES = 2;
export const MIN_IDLE_MINUTES = 1;
export const MAX_IDLE_MINUTES = 30;
const MAX_IDLE_SECONDS = 3600;
const CORNERS: readonly HotCorner[] = ['none', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];

export const isModuleId = (v: unknown): v is ScreensaverModuleId => typeof v === 'string' && (MODULE_IDS as readonly string[]).includes(v);
const isCorner = (v: unknown): v is HotCorner => typeof v === 'string' && (CORNERS as readonly string[]).includes(v);

/** Whole minutes between 1 and 30; missing or nonsense = 2. */
export function clampIdleMinutes(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_IDLE_MINUTES;
  return Math.min(MAX_IDLE_MINUTES, Math.max(MIN_IDLE_MINUTES, Math.round(value)));
}

export interface ResolvedScreensaver {
  enabled: boolean;
  idleMinutes: number;
  hotCorner: HotCorner;
  pinned: ScreensaverModuleId | null;
}

export function screensaverSettings(site: Pick<SiteSettings, 'screensaver'>): ResolvedScreensaver {
  const s = site.screensaver;
  const corner = s?.hotCorner;
  const pinned = s?.pinned;
  return {
    enabled: s?.enabled !== false,
    idleMinutes: clampIdleMinutes(s?.idleMinutes),
    hotCorner: isCorner(corner) ? corner : 'none',
    pinned: isModuleId(pinned) ? pinned : null,
  };
}

/** `/?lock=1` asks for the lock screen; `/?screensaver=<id>` for a screen saver. */
export function readSaverLink(search: string): { lock: boolean; screensaver: string | null } {
  const params = new URLSearchParams(search);
  const id = params.get('screensaver')?.trim();
  return { lock: params.get('lock') === '1', screensaver: id ? id : null };
}

/** `search` without `lock` and `screensaver`. Returns '' or '?…'. */
export function withoutSaverParams(search: string): string {
  const params = new URLSearchParams(search);
  params.delete('lock');
  params.delete('screensaver');
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** Test-only: `?idleSeconds=2` replaces the idle minutes (max an hour). Always null in production. */
export function readIdleSeconds(search: string, production: boolean): number | null {
  if (production) return null;
  const raw = new URLSearchParams(search).get('idleSeconds');
  if (raw === null) return null;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(MAX_IDLE_SECONDS, seconds) : null;
}

export function idleDelayMs(idleMinutes: number, idleSeconds: number | null): number {
  return idleSeconds !== null ? idleSeconds * 1000 : idleMinutes * 60_000;
}
