import { clamp, pxToPct } from '../geometry';
import { WIDGET_TYPES, type AppType, type DesktopPlacement, type DockEntry, type PortfolioApp, type SiteData, type SiteSettings } from '../types';
import { starterApp } from './starters';

// Every function here is pure and returns the same `data` object when nothing changes
// (the undo history relies on === to skip no-op entries).

export type DesktopPosition = Omit<DesktopPlacement, 'appId'>;
export type AppPatch = Partial<Pick<PortfolioApp, 'title' | 'icon' | 'visible' | 'notification'>>;

type Desktop = SiteData['layout']['desktop'];

function withDesktop(data: SiteData, patch: Partial<Desktop>): SiteData {
  return { ...data, layout: { ...data.layout, desktop: { ...data.layout.desktop, ...patch } } };
}

function mapApp(data: SiteData, appId: string, fn: (app: PortfolioApp) => PortfolioApp): SiteData {
  if (!data.apps.some((a) => a.id === appId)) return data;
  return { ...data, apps: data.apps.map((a) => (a.id === appId ? fn(a) : a)) };
}

const nextOrder = (data: SiteData) => Math.max(0, ...data.apps.map((a) => a.order)) + 1;

// ---- apps and site ----

export function updateApp(data: SiteData, appId: string, patch: AppPatch): SiteData {
  return mapApp(data, appId, (a) => ({ ...a, ...patch }) as PortfolioApp);
}

/** `content` must match the app's type; the inspector forms guarantee that. */
export function updateAppContent(data: SiteData, appId: string, content: PortfolioApp['content']): SiteData {
  return mapApp(data, appId, (a) => ({ ...a, content }) as PortfolioApp);
}

type Album = Extract<PortfolioApp, { type: 'photos' }>['content']['albums'][number];

/** The album the owner meant when they chose or dropped files: the object itself, where it was and what it was called. */
export interface AlbumTarget {
  album: Album;
  index: number;
  name: string;
}

/** Captures the album at `index` in a Photos app's current draft, or null (meaning "the first album") if there isn't one. */
export function snapshotAlbum(data: SiteData, appId: string, index: number | null): AlbumTarget | null {
  const app = data.apps.find((a) => a.id === appId);
  const album = app?.type === 'photos' && index !== null ? app.content.albums[index] : undefined;
  return album ? { album, index: index as number, name: album.name } : null;
}

/**
 * Finds where `target` is now, after the owner may have reordered, renamed, added or deleted albums. In order: the very same
 * album object (untouched albums keep their identity through edits, undo and redo); the album at the old index if its name
 * still matches; the first album with that name; the old index if it exists; the first album. Null if there are no albums.
 */
export function resolveAlbumTarget(albums: readonly Album[], target: AlbumTarget | null): number | null {
  if (albums.length === 0) return null;
  if (!target) return 0;
  const same = albums.indexOf(target.album);
  if (same >= 0) return same;
  if (albums[target.index]?.name === target.name) return target.index;
  const named = albums.findIndex((al) => al.name === target.name);
  if (named >= 0) return named;
  return albums[target.index] ? target.index : 0;
}

/** Adds photos (no captions yet) to the end of the album `target` now points at (see resolveAlbumTarget) — the first album if `target` is null, made, as "Album 1", if there are none. */
export function addPhotosToAlbum(data: SiteData, appId: string, target: AlbumTarget | null, urls: string[]): SiteData {
  if (urls.length === 0 || data.apps.find((a) => a.id === appId)?.type !== 'photos') return data;
  return mapApp(data, appId, (a) => {
    if (a.type !== 'photos') return a;
    const added = urls.map((url) => ({ url, caption: '' }));
    const albums = a.content.albums.length > 0 ? a.content.albums : [{ name: 'Album 1', photos: [] }];
    const at = resolveAlbumTarget(albums, target) ?? 0;
    return { ...a, content: { ...a.content, albums: albums.map((al, i) => (i === at ? { ...al, photos: [...al.photos, ...added] } : al)) } };
  });
}

export function updateSite(data: SiteData, patch: Partial<SiteSettings>): SiteData {
  return { ...data, site: { ...data.site, ...patch } };
}

// ---- desktop ----

export function moveDesktopItem(data: SiteData, appId: string, pos: DesktopPosition): SiteData {
  const move = (list: DesktopPlacement[]) =>
    list.map((p) => (p.appId === appId ? { appId, xPct: pos.xPct, yPct: pos.yPct } : p));
  return withDesktop(data, { icons: move(data.layout.desktop.icons), widgets: move(data.layout.desktop.widgets) });
}

const SLOT_XS = [2, 10, 18, 26, 34, 42, 50, 58, 66, 74, 82, 90];
const SLOT_YS = [4, 20, 36, 52, 68];

/** First free cell scanning column by column from the top-left. */
export function nextFreeDesktopSlot(taken: DesktopPlacement[]): DesktopPosition {
  for (const xPct of SLOT_XS) {
    for (const yPct of SLOT_YS) {
      if (!taken.some((p) => Math.abs(p.xPct - xPct) < 6 && Math.abs(p.yPct - yPct) < 12)) return { xPct, yPct };
    }
  }
  return { xPct: SLOT_XS[0], yPct: SLOT_YS[0] };
}

/** Resizes a desktop widget (clock, status, sticky note). */
export function setDesktopWidgetSize(data: SiteData, appId: string, size: DesktopPlacement['size']): SiteData {
  const widgets = data.layout.desktop.widgets;
  if (!widgets.some((p) => p.appId === appId)) return data;
  return withDesktop(data, { widgets: widgets.map((p) => (p.appId === appId ? { ...p, size } : p)) });
}

export function isOnDesktop(data: SiteData, appId: string): boolean {
  const { icons, widgets } = data.layout.desktop;
  return icons.some((p) => p.appId === appId) || widgets.some((p) => p.appId === appId);
}

/** Widget types (notes, clocks, status) go on the desktop as widgets; every other type as an icon. */
export function setOnDesktop(data: SiteData, appId: string, on: boolean, at?: DesktopPosition): SiteData {
  const { icons, widgets } = data.layout.desktop;
  if (!on) {
    if (!isOnDesktop(data, appId)) return data;
    return withDesktop(data, {
      icons: icons.filter((p) => p.appId !== appId),
      widgets: widgets.filter((p) => p.appId !== appId),
    });
  }
  if (isOnDesktop(data, appId)) return data;
  const app = data.apps.find((a) => a.id === appId);
  if (!app) return data;
  const placement = { appId, ...(at ?? nextFreeDesktopSlot([...icons, ...widgets])) };
  return WIDGET_TYPES.includes(app.type)
    ? withDesktop(data, { widgets: [...widgets, placement] })
    : withDesktop(data, { icons: [...icons, placement] });
}

// ---- dock ----

/** Drops separators at either end and collapses doubled ones. */
function tidySeparators(dock: DockEntry[]): DockEntry[] {
  const out: DockEntry[] = [];
  for (const entry of dock) {
    if (entry.kind === 'separator' && (out.length === 0 || out[out.length - 1].kind === 'separator')) continue;
    out.push(entry);
  }
  while (out.length > 0 && out[out.length - 1].kind === 'separator') out.pop();
  return out;
}

export function isInDock(data: SiteData, appId: string): boolean {
  return data.layout.desktop.dock.some((e) => e.kind === 'app' && e.appId === appId);
}

export function setInDock(data: SiteData, appId: string, on: boolean): SiteData {
  const dock = data.layout.desktop.dock;
  if (on === isInDock(data, appId)) return data;
  if (!on) return withDesktop(data, { dock: tidySeparators(dock.filter((e) => !(e.kind === 'app' && e.appId === appId))) });
  // Insert after the last app entry so links stay grouped at the end.
  const lastApp = dock.map((e) => e.kind).lastIndexOf('app');
  const next = [...dock];
  next.splice(lastApp + 1, 0, { kind: 'app', appId });
  return withDesktop(data, { dock: next });
}

export function moveDockEntry(data: SiteData, from: number, to: number): SiteData {
  const dock = [...data.layout.desktop.dock];
  if (from < 0 || from >= dock.length) return data;
  const target = clamp(to, 0, dock.length - 1);
  if (target === from) return data;
  const [entry] = dock.splice(from, 1);
  dock.splice(target, 0, entry);
  return withDesktop(data, { dock });
}

export function addDockLink(data: SiteData, link: { label: string; url: string; iconUrl?: string }): SiteData {
  return withDesktop(data, { dock: [...data.layout.desktop.dock, { kind: 'url', ...link }] });
}

export function addDockSeparator(data: SiteData): SiteData {
  return withDesktop(data, { dock: [...data.layout.desktop.dock, { kind: 'separator' }] });
}

export function updateDockEntry(data: SiteData, index: number, entry: DockEntry): SiteData {
  const dock = data.layout.desktop.dock;
  if (index < 0 || index >= dock.length) return data;
  return withDesktop(data, { dock: dock.map((e, i) => (i === index ? entry : e)) });
}

export function removeDockEntry(data: SiteData, index: number): SiteData {
  const dock = data.layout.desktop.dock;
  if (index < 0 || index >= dock.length) return data;
  return withDesktop(data, { dock: tidySeparators(dock.filter((_, i) => i !== index)) });
}

// ---- add / duplicate / delete ----

export function addApp(data: SiteData, type: AppType, id: string): SiteData {
  const withApp = { ...data, apps: [...data.apps, starterApp(type, id, nextOrder(data))] };
  return setOnDesktop(withApp, id, true);
}

export function duplicateApp(data: SiteData, appId: string, newId: string): SiteData {
  const source = data.apps.find((a) => a.id === appId);
  if (!source) return data;
  const copy = { ...structuredClone(source), id: newId, title: `${source.title} copy`, order: nextOrder(data) } as PortfolioApp;
  const next = { ...data, apps: [...data.apps, copy] };
  const placed = [...data.layout.desktop.icons, ...data.layout.desktop.widgets].find((p) => p.appId === appId);
  if (!placed) return next;
  return setOnDesktop(next, newId, true, { xPct: Math.min(96, placed.xPct + 2), yPct: Math.min(96, placed.yPct + 4) });
}

export function deleteApp(data: SiteData, appId: string): SiteData {
  if (!data.apps.some((a) => a.id === appId)) return data;
  const { icons, widgets, dock } = data.layout.desktop;
  const overrides = data.layout.phone.overrides;
  return {
    ...data,
    apps: data.apps.filter((a) => a.id !== appId),
    layout: {
      desktop: {
        icons: icons.filter((p) => p.appId !== appId),
        widgets: widgets.filter((p) => p.appId !== appId),
        dock: tidySeparators(dock.filter((e) => !(e.kind === 'app' && e.appId === appId))),
      },
      phone: {
        overrides: overrides
          ? {
              pages: overrides.pages.map((page) => page.filter((s) => s.appId !== appId)).filter((page) => page.length > 0),
              dock: overrides.dock.filter((id) => id !== appId),
            }
          : null,
      },
    },
  };
}

// ---- clean up (Finder's “Clean Up”) ----

export interface AreaRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const CELL_W = 112; // icon (104px) + gap
const CELL_H = 124;
const MARGIN = 12;

/**
 * Lines desktop icons up in a column-by-column grid from the top-left, in pixels for the given area,
 * skipping cells covered by widgets (`obstacles`, in the same pixel space). Widgets don't move.
 */
export function cleanUpDesktop(
  data: SiteData,
  area: { width: number; height: number },
  obstacles: AreaRect[] = [],
  sortBy: 'position' | 'name' = 'position',
): SiteData {
  const icons = [...data.layout.desktop.icons];
  if (icons.length === 0 || area.width <= 0 || area.height <= 0) return data;
  const titles = new Map(data.apps.map((a) => [a.id, a.title]));
  if (sortBy === 'name') {
    icons.sort((a, b) => (titles.get(a.appId) ?? '').localeCompare(titles.get(b.appId) ?? '', undefined, { sensitivity: 'base' }));
  } else {
    icons.sort((a, b) => a.xPct - b.xPct || a.yPct - b.yPct);
  }

  const rows = Math.max(1, Math.floor((area.height - MARGIN) / CELL_H));
  const cols = Math.max(1, Math.floor((area.width - MARGIN) / CELL_W));
  const blocked = (x: number, y: number) =>
    obstacles.some((o) => x < o.left + o.width && x + CELL_W > o.left && y < o.top + o.height && y + CELL_H > o.top);

  const placed: DesktopPlacement[] = [];
  let cell = 0;
  for (const icon of icons) {
    let x = MARGIN;
    let y = MARGIN;
    // Find the next free cell (column-major); if the desktop is full, stack on the last cell.
    while (cell < rows * cols) {
      x = MARGIN + Math.floor(cell / rows) * CELL_W;
      y = MARGIN / 2 + (cell % rows) * CELL_H;
      cell++;
      if (!blocked(x, y)) break;
    }
    placed.push({ appId: icon.appId, xPct: pxToPct(x, area.width), yPct: pxToPct(y, area.height) });
  }
  const byId = new Map(placed.map((p) => [p.appId, p]));
  return withDesktop(data, { icons: data.layout.desktop.icons.map((p) => byId.get(p.appId) ?? p) });
}
