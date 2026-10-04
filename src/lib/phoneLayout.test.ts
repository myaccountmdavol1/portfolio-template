import { describe, expect, it } from 'vitest';
import { buildPhoneLayout } from './phoneLayout';
import type { DockEntry, Layout, PhoneOverrides, PortfolioApp } from './types';

// ---- tiny fixtures -------------------------------------------------------
const base = (id: string, order: number, visible = true) => ({
  id,
  title: id,
  icon: { kind: 'builtin' as const, name: 'folder' as const },
  visible,
  order,
});

const project = (id: string, order: number, visible = true): PortfolioApp => ({
  ...base(id, order, visible),
  type: 'project',
  content: { coverUrl: '', tag: '', year: '', role: '', body: { blocks: [] }, gallery: [], links: [] },
});

const note = (id: string, order: number): PortfolioApp => ({
  ...base(id, order),
  type: 'note',
  content: { title: '', items: [] },
});

const stats = (id: string, order: number, showAsPhoneWidget: boolean): PortfolioApp => ({
  ...base(id, order),
  type: 'stats',
  content: { heading: '', subheading: '', steps: [], metrics: [], chart: null, showAsPhoneWidget },
});

const layout = (dock: DockEntry[] = [], overrides: PhoneOverrides | null = null): Layout => ({
  desktop: { icons: [], widgets: [], dock },
  phone: { overrides },
});

const appDock = (...ids: string[]): DockEntry[] => ids.map((appId): DockEntry => ({ kind: 'app', appId }));
const one = (appId: string) => ({ appId, size: '1x1' as const });
const two = (appId: string) => ({ appId, size: '2x2' as const });
const projects = (count: number) => Array.from({ length: count }, (_, i) => project(`a${i}`, i + 1));

// ---- auto mode -----------------------------------------------------------
describe('buildPhoneLayout (auto)', () => {
  it('puts widgets first (notes, then stats widgets), then apps by order', () => {
    const apps = [project('b', 2), stats('s', 5, true), project('a', 1), note('n', 9), stats('s2', 3, false)];
    expect(buildPhoneLayout(apps, layout())).toEqual({
      pages: [[two('n'), two('s'), one('a'), one('b'), one('s2')]],
      dock: [],
    });
  });

  it('skips hidden apps', () => {
    const apps = [project('a', 1), project('h', 2, false)];
    expect(buildPhoneLayout(apps, layout()).pages).toEqual([[one('a')]]);
  });

  it('uses the first 4 app entries of the desktop dock and does not repeat them on the grid', () => {
    const apps = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => project(id, i + 1));
    const dock: DockEntry[] = [
      { kind: 'url', url: 'https://x.com', label: 'X' },
      { kind: 'app', appId: 'c' },
      { kind: 'separator' },
      ...appDock('a', 'missing', 'e', 'f', 'b'),
    ];
    // The dock's url entry becomes a home-screen shortcut (dock index 0) after the apps.
    expect(buildPhoneLayout(apps, layout(dock))).toEqual({ pages: [[one('b'), one('d'), one('link:0')]], dock: ['c', 'a', 'e', 'f'] });
  });

  it('starts a new page after 24 cells', () => {
    const result = buildPhoneLayout(projects(30), layout());
    expect(result.pages.map((p) => p.length)).toEqual([24, 6]);
  });

  it('counts a 2×2 widget as 4 cells', () => {
    const result = buildPhoneLayout([note('n', 0), ...projects(21)], layout());
    expect(result.pages.map((p) => p.length)).toEqual([21, 1]);
  });

  it('returns one empty page when there are no apps', () => {
    expect(buildPhoneLayout([], layout())).toEqual({ pages: [[]], dock: [] });
  });
});

// ---- override mode -------------------------------------------------------
describe('buildPhoneLayout (overrides)', () => {
  it('keeps the saved arrangement, dropping hidden and deleted apps', () => {
    const apps = [project('a', 1), project('b', 2), project('c', 3, false), project('d', 4)];
    const overrides: PhoneOverrides = {
      pages: [[one('b'), one('gone')], [one('c'), one('a')]],
      dock: ['d', 'gone'],
    };
    expect(buildPhoneLayout(apps, layout([], overrides))).toEqual({ pages: [[one('b')], [one('a')]], dock: ['d'] });
  });

  it('appends apps missing from the overrides to the last page', () => {
    const apps = [project('a', 1), project('b', 2), note('n', 3), project('e', 4)];
    const overrides: PhoneOverrides = { pages: [[one('a')], [one('b')]], dock: [] };
    expect(buildPhoneLayout(apps, layout([], overrides)).pages).toEqual([[one('a')], [one('b'), two('n'), one('e')]]);
  });

  it('forces 1×1 for apps that cannot be widgets', () => {
    const overrides: PhoneOverrides = { pages: [[two('a')]], dock: [] };
    expect(buildPhoneLayout([project('a', 1)], layout([], overrides)).pages).toEqual([[one('a')]]);
  });

  it('uses the override dock and ignores the desktop dock', () => {
    const apps = [project('a', 1), project('b', 2)];
    const result = buildPhoneLayout(apps, layout(appDock('a'), { pages: [], dock: ['b'] }));
    expect(result).toEqual({ pages: [[one('a')]], dock: ['b'] });
  });
});

describe('dock links on the phone', () => {
  it('adds desktop-dock links as home-screen shortcuts after the apps', async () => {
    const { seedSiteData } = await import('./seed');
    const { buildPhoneLayout, isLinkSlot } = await import('./phoneLayout');
    const layout = buildPhoneLayout(seedSiteData.apps, seedSiteData.layout);
    const all = layout.pages.flat();
    const links = all.filter(isLinkSlot);
    const urlCount = seedSiteData.layout.desktop.dock.filter((e) => e.kind === 'url').length;
    expect(links).toHaveLength(urlCount);
    expect(all.slice(-urlCount)).toEqual(links); // after every app
    expect(links[0].appId).toMatch(/^link:\d+$/);
  });
});
