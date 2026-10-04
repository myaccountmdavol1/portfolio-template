import type { PortfolioApp } from './types';

/** Visible apps keyed by id. Everything that renders an app looks it up here, so hidden apps never show. */
export function visibleAppsById(apps: PortfolioApp[]): Map<string, PortfolioApp> {
  return new Map(apps.filter((a) => a.visible).map((a) => [a.id, a]));
}

/**
 * Finds the app an action points at: its exact id, or — forgivingly, for hand-typed actions like
 * "openApp:mail" — the first visible app of that type, or with that title.
 */
export function resolveApp(appsById: Map<string, PortfolioApp>, ref: string): PortfolioApp | undefined {
  const direct = appsById.get(ref);
  if (direct) return direct;
  const r = ref.trim().toLowerCase();
  const all = [...appsById.values()];
  return all.find((a) => a.type === r) ?? all.find((a) => a.title.toLowerCase() === r);
}

/** The app opened by clicking the owner's name in the menu bar. */
export function findAboutAppId(apps: PortfolioApp[]): string | null {
  return apps.find((a) => a.visible && a.type === 'about')?.id ?? null;
}
