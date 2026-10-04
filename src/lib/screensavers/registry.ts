import { bounce, type BounceSettings } from './bounce';
import { drift, type DriftSettings } from './drift';
import { facts, type FactsSettings } from './facts';
import { flurry, type FlurrySettings } from './flurry';
import { hello, type HelloSettings } from './hello';
import { memories, type MemoriesSettings } from './memories';
import type { ScreensaverModule } from './module';
import { MODULE_IDS, screensaverSettings } from './settings';
import type { ScreensaverModuleId, SiteData } from '../types';

export interface ModuleSettingsMap {
  hello: HelloSettings;
  drift: DriftSettings;
  memories: MemoriesSettings;
  facts: FactsSettings;
  flurry: FlurrySettings;
  bounce: BounceSettings;
}

export const SCREENSAVER_MODULES: { [K in ScreensaverModuleId]: ScreensaverModule<ModuleSettingsMap[K]> } = { hello, drift, memories, facts, flurry, bounce };

export interface ResolvedModule<S> {
  id: ScreensaverModuleId;
  name: string;
  on: boolean; // the owner's switch (missing = on)
  settings: S; // generated defaults under the owner's changes
  available: boolean; // false = nothing to show
  custom: boolean; // the owner has their own settings (the editor offers "Reset to generated")
}

export function resolveModule<K extends ScreensaverModuleId>(site: SiteData, id: K): ResolvedModule<ModuleSettingsMap[K]> {
  const mod: ScreensaverModule<ModuleSettingsMap[K]> = SCREENSAVER_MODULES[id];
  const stored = site.site.screensaver?.modules?.[id];
  const settings = mod.read(site, stored?.settings);
  return { id, name: mod.name, on: stored?.on !== false, settings, available: mod.available(site, settings), custom: stored?.settings !== undefined };
}

/** Modules a visitor can get: switched on and with something to show, in editor order. */
export function playableModules(site: SiteData): ScreensaverModuleId[] {
  return MODULE_IDS.filter((id) => {
    const m = resolveModule(site, id);
    return m.on && m.available;
  });
}

/** A random one of `candidates`, never `last` when there's a choice. */
export function pickModule(candidates: readonly ScreensaverModuleId[], last: ScreensaverModuleId | null, rand: () => number = Math.random): ScreensaverModuleId | null {
  if (candidates.length === 0) return null;
  const pool = candidates.length > 1 && last ? candidates.filter((c) => c !== last) : candidates;
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}

/** What plays next: the pinned module when it can play, else a shuffle; null = nothing can play. */
export function chooseModule(site: SiteData, last: ScreensaverModuleId | null, rand: () => number = Math.random): ScreensaverModuleId | null {
  const candidates = playableModules(site);
  const pinned = screensaverSettings(site.site).pinned;
  if (pinned && candidates.includes(pinned)) return pinned;
  return pickModule(candidates, last, rand);
}
