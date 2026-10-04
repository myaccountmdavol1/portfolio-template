import type { BadgePass, PortfolioApp, ScreensaverModuleId, SiteData } from '../types';

/**
 * One screen saver. Its settings are generated from the published site (`defaults`), so a new site needs no setup;
 * `read` lays the owner's stored settings over them (anything malformed falls back); `available` false = nothing
 * to show (e.g. no photos), and the module is skipped.
 */
export interface ScreensaverModule<S> {
  id: ScreensaverModuleId;
  name: string; // shown in the editor
  emptyNote: string; // the editor's "Skipped: …" line when there's nothing to show
  defaults(site: SiteData): S;
  read(site: SiteData, raw: unknown): S;
  available(site: SiteData, s: S): boolean;
}

export function asRecord(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

/** The strings in an array (others dropped), or undefined when it isn't an array. */
export function stringList(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : undefined;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

export const visibleApps = (site: SiteData): PortfolioApp[] => site.apps.filter((a) => a.visible);

/** Every titled Wallet pass on the site, newest first (undated last, ties keep their order), with its Wallet's title. */
export function sitePasses(site: SiteData): { pass: BadgePass; wallet: string }[] {
  const all = visibleApps(site).flatMap((a) => (a.type === 'wallet' ? (a.content.passes ?? []).filter((p) => p.title.trim()).map((pass) => ({ pass, wallet: a.title })) : []));
  return [...all].sort((a, b) => (b.pass.earned ?? '').localeCompare(a.pass.earned ?? ''));
}
