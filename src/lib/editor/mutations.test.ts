import { describe, expect, it } from 'vitest';
import { seedSiteData } from '../seed';
import type { SiteData } from '../types';
import {
  addApp,
  addPhotosToAlbum,
  resolveAlbumTarget,
  snapshotAlbum,
  addDockLink,
  addDockSeparator,
  deleteApp,
  duplicateApp,
  isInDock,
  isOnDesktop,
  moveDesktopItem,
  moveDockEntry,
  nextFreeDesktopSlot,
  removeDockEntry,
  setInDock,
  setOnDesktop,
  updateApp,
  updateAppContent,
  updateDockEntry,
  updateSite,
} from './mutations';

const data: SiteData = seedSiteData;
const dockKinds = (d: SiteData) => d.layout.desktop.dock.map((e) => (e.kind === 'app' ? e.appId : e.kind));

describe('app and site edits', () => {
  it('updateApp patches one app without touching the input', () => {
    const next = updateApp(data, 'p1', { title: 'Renamed' });
    expect(next.apps.find((a) => a.id === 'p1')?.title).toBe('Renamed');
    expect(data.apps.find((a) => a.id === 'p1')?.title).toBe('Project One');
  });

  it('updateAppContent replaces content', () => {
    const note = data.apps.find((a) => a.id === 'todo')!;
    if (note.type !== 'note') throw new Error('seed changed');
    const next = updateAppContent(data, 'todo', { ...note.content, title: 'Later' });
    const updated = next.apps.find((a) => a.id === 'todo')!;
    expect(updated.type === 'note' && updated.content.title).toBe('Later');
  });

  it('updateSite merges a patch', () => {
    expect(updateSite(data, { ownerName: 'Ada' }).site.ownerName).toBe('Ada');
  });
});

describe('desktop placement', () => {
  it('moveDesktopItem moves icons and widgets', () => {
    const next = moveDesktopItem(moveDesktopItem(data, 'p1', { xPct: 50, yPct: 50 }), 'todo', { xPct: 10, yPct: 10 });
    expect(next.layout.desktop.icons.find((p) => p.appId === 'p1')).toEqual({ appId: 'p1', xPct: 50, yPct: 50 });
    expect(next.layout.desktop.widgets.find((p) => p.appId === 'todo')).toEqual({ appId: 'todo', xPct: 10, yPct: 10 });
  });

  it('nextFreeDesktopSlot skips taken cells', () => {
    expect(nextFreeDesktopSlot([])).toEqual({ xPct: 2, yPct: 4 });
    expect(nextFreeDesktopSlot([{ appId: 'a', xPct: 2, yPct: 4 }])).toEqual({ xPct: 2, yPct: 20 });
  });

  it('setOnDesktop adds and removes, putting notes in widgets', () => {
    expect(isOnDesktop(data, 'playlist')).toBe(false);
    const added = setOnDesktop(data, 'playlist', true);
    expect(added.layout.desktop.icons.some((p) => p.appId === 'playlist')).toBe(true);
    const removed = setOnDesktop(data, 'todo', false);
    expect(removed.layout.desktop.widgets.some((p) => p.appId === 'todo')).toBe(false);
    expect(setOnDesktop(removed, 'todo', true).layout.desktop.widgets.some((p) => p.appId === 'todo')).toBe(true);
  });

  it('setOnDesktop returns the same object when nothing changes', () => {
    expect(setOnDesktop(data, 'p1', true)).toBe(data);
  });
});

describe('dock', () => {
  it('setInDock inserts after the last app entry', () => {
    const added = setInDock(data, 'p1', true);
    expect(dockKinds(added).slice(0, 8)).toEqual(['about', 'credentials', 'playlist', 'resume', 'separator', 'stats', 'todo', 'p1']);
    expect(isInDock(added, 'p1')).toBe(true);
    expect(setInDock(data, 'about', true)).toBe(data);
  });

  it('removing apps tidies doubled separators', () => {
    const next = setInDock(setInDock(data, 'stats', false), 'todo', false);
    const kinds = dockKinds(next);
    expect(kinds.filter((k, i) => k === 'separator' && kinds[i + 1] === 'separator')).toHaveLength(0);
  });

  it('moveDockEntry moves one entry', () => {
    expect(dockKinds(moveDockEntry(data, 0, 2)).slice(0, 3)).toEqual(['credentials', 'playlist', 'about']);
    expect(moveDockEntry(data, 99, 0)).toBe(data);
  });

  it('adds, updates, and removes links and separators', () => {
    const withLink = addDockLink(data, { label: 'Site', url: 'https://x.dev/' });
    const last = withLink.layout.desktop.dock.length - 1;
    expect(withLink.layout.desktop.dock[last]).toEqual({ kind: 'url', label: 'Site', url: 'https://x.dev/' });
    const updated = updateDockEntry(withLink, last, { kind: 'url', label: 'Blog', url: 'https://x.dev/' });
    expect(updated.layout.desktop.dock[last]).toMatchObject({ label: 'Blog' });
    expect(removeDockEntry(updated, last).layout.desktop.dock).toHaveLength(data.layout.desktop.dock.length);
    expect(addDockSeparator(data).layout.desktop.dock.at(-1)).toEqual({ kind: 'separator' });
  });
});

describe('adding, duplicating, deleting', () => {
  it('addApp appends a starter app with the next order and puts it on the desktop', () => {
    const next = addApp(data, 'project', 'project-1');
    const app = next.apps.find((a) => a.id === 'project-1')!;
    expect(app.order).toBe(Math.max(...data.apps.map((a) => a.order)) + 1);
    expect(isOnDesktop(next, 'project-1')).toBe(true);
  });

  it('duplicateApp deep-copies with a new id, “copy” title, and an offset placement', () => {
    const next = duplicateApp(data, 'p1', 'project-1');
    const copy = next.apps.find((a) => a.id === 'project-1')!;
    const original = data.apps.find((a) => a.id === 'p1')!;
    expect(copy.title).toBe('Project One copy');
    expect(copy.content).toEqual(original.content);
    expect(copy.content).not.toBe(original.content);
    expect(next.layout.desktop.icons.find((p) => p.appId === 'project-1')).toEqual({ appId: 'project-1', xPct: 4, yPct: 8 });
  });

  it('deleteApp removes the app everywhere, including phone overrides', () => {
    const withOverrides: SiteData = {
      ...data,
      layout: {
        ...data.layout,
        phone: { overrides: { pages: [[{ appId: 'about', size: '1x1' }], [{ appId: 'p1', size: '1x1' }]], dock: ['about'] } },
      },
    };
    const next = deleteApp(withOverrides, 'about');
    expect(next.apps.some((a) => a.id === 'about')).toBe(false);
    expect(isOnDesktop(next, 'about')).toBe(false);
    expect(isInDock(next, 'about')).toBe(false);
    expect(next.layout.phone.overrides).toEqual({ pages: [[{ appId: 'p1', size: '1x1' }]], dock: [] });
  });
});

describe('setDesktopWidgetSize', () => {
  it('sets the size on a widget placement only', async () => {
    const { setDesktopWidgetSize } = await import('./mutations');
    expect(setDesktopWidgetSize(data, 'todo', 'large').layout.desktop.widgets[0]).toMatchObject({ appId: 'todo', size: 'large' });
    expect(setDesktopWidgetSize(data, 'p1', 'large')).toBe(data);
  });
});

describe('cleanUpDesktop', () => {
  const area = { width: 1280, height: 672 };
  const px = (d: SiteData, id: string) => {
    const p = d.layout.desktop.icons.find((i) => i.appId === id)!;
    return { x: Math.round((p.xPct / 100) * area.width), y: Math.round((p.yPct / 100) * area.height) };
  };

  it('lines icons up in non-overlapping columns from the top-left', async () => {
    const { cleanUpDesktop } = await import('./mutations');
    const messy = moveDesktopItem(moveDesktopItem(data, 'p1', { xPct: 50, yPct: 50 }), 'credentials', { xPct: 3, yPct: 5 });
    const tidy = cleanUpDesktop(messy, area);
    const spots = tidy.layout.desktop.icons.map((i) => px(tidy, i.appId));
    expect(new Set(spots.map((s) => `${s.x},${s.y}`)).size).toBe(spots.length);
    expect(Math.min(...spots.map((s) => s.x))).toBe(12);
    expect(tidy.layout.desktop.widgets).toBe(messy.layout.desktop.widgets);
  });

  it('sorts by name when asked', async () => {
    const { cleanUpDesktop } = await import('./mutations');
    const tidy = cleanUpDesktop(data, area, [], 'name');
    const order = [...tidy.layout.desktop.icons].sort((a, b) => a.xPct - b.xPct || a.yPct - b.yPct).map((i) => i.appId);
    expect(order).toEqual(['about', 'credentials', 'stats', 'p1', 'p2', 'resume']); // About Me, Credentials, My Path, Project One, Project Two, Resume.pdf
  });

  it('skips cells covered by widgets', async () => {
    const { cleanUpDesktop } = await import('./mutations');
    const tidy = cleanUpDesktop(data, area, [{ left: 0, top: 0, width: 120, height: 130 }]);
    expect(tidy.layout.desktop.icons.every((i) => !(px(tidy, i.appId).x === 12 && px(tidy, i.appId).y === 6))).toBe(true);
  });
});

describe('addPhotosToAlbum', () => {
  const withPhotos = (albums: { name: string; photos: { url: string; caption: string }[] }[]): SiteData => ({
    ...data,
    apps: [...data.apps, { id: 'ph', type: 'photos', title: 'Photos', icon: '', visible: true, order: 99, content: { albums } } as unknown as SiteData['apps'][number]],
  });
  const albumsOf = (d: SiteData) => (d.apps.find((a) => a.id === 'ph') as unknown as { content: { albums: { name: string; photos: { url: string; caption: string }[] }[] } }).content.albums;

  it('appends to the chosen album, in order, keeping what is there', () => {
    const d = withPhotos([{ name: 'A', photos: [] }, { name: 'B', photos: [{ url: 'x', caption: 'kept' }] }]);
    const next = albumsOf(addPhotosToAlbum(d, 'ph', snapshotAlbum(d, 'ph', 1), ['u1', 'u2']));
    expect(next[1].photos).toEqual([{ url: 'x', caption: 'kept' }, { url: 'u1', caption: '' }, { url: 'u2', caption: '' }]);
    expect(next[0].photos).toEqual([]);
  });
  it('targets by index when albums share a name', () => {
    const d = withPhotos([{ name: 'New album', photos: [] }, { name: 'New album', photos: [] }]);
    const next = albumsOf(addPhotosToAlbum(d, 'ph', snapshotAlbum(d, 'ph', 1), ['u']));
    expect(next[0].photos).toEqual([]);
    expect(next[1].photos).toHaveLength(1);
  });
  it('creates "Album 1" when there are no albums', () => {
    expect(albumsOf(addPhotosToAlbum(withPhotos([]), 'ph', null, ['u']))).toEqual([{ name: 'Album 1', photos: [{ url: 'u', caption: '' }] }]);
  });
  it('uses the first album when there is no target', () => {
    expect(albumsOf(addPhotosToAlbum(withPhotos([{ name: 'A', photos: [] }]), 'ph', null, ['u']))[0].photos).toHaveLength(1);
  });
  it('returns the same object when there is nothing to add or the app is not Photos', () => {
    const d = withPhotos([]);
    expect(addPhotosToAlbum(d, 'ph', null, [])).toBe(d);
    expect(addPhotosToAlbum(d, 'p1', null, ['u'])).toBe(d);
  });
});

describe('resolveAlbumTarget', () => {
  const A = { name: 'A', photos: [] };
  const B = { name: 'B', photos: [] };
  const C = { name: 'C', photos: [] };
  const D = { name: 'D', photos: [] };
  const target = (album: typeof A, index: number) => ({ album, index, name: album.name });

  it('follows the album when albums are reordered', () => {
    expect(resolveAlbumTarget([C, B, A], target(B, 1))).toBe(1);
    expect(resolveAlbumTarget([B, A, C], target(C, 2))).toBe(2);
    expect(resolveAlbumTarget([C, A, B], target(B, 1))).toBe(2);
  });
  it('follows the album when another one before it is deleted or added', () => {
    expect(resolveAlbumTarget([B, C], target(B, 1))).toBe(0);
    expect(resolveAlbumTarget([D, A, B, C], target(B, 1))).toBe(2);
  });
  it('finds an edited (new object) album by its old index', () => {
    const edited = { ...B, photos: [{ url: 'x', caption: '' }] };
    expect(resolveAlbumTarget([A, edited, C], target(B, 1))).toBe(1);
  });
  it('finds an edited album that moved by its name', () => {
    const edited = { ...B, photos: [{ url: 'x', caption: '' }] };
    expect(resolveAlbumTarget([edited, A, C], target(B, 1))).toBe(0);
  });
  it('falls back to the old index when the album was renamed, then the first album', () => {
    expect(resolveAlbumTarget([A, { ...B, name: 'Renamed' }, C], target(B, 1))).toBe(1);
    expect(resolveAlbumTarget([A], target(B, 3))).toBe(0);
  });
  it('uses the same index when the target was deleted and others remain', () => {
    expect(resolveAlbumTarget([A, C], target(B, 1))).toBe(1);
  });
  it('uses the first album with no target, and null with no albums', () => {
    expect(resolveAlbumTarget([A, B], null)).toBe(0);
    expect(resolveAlbumTarget([], target(A, 0))).toBeNull();
  });
  it('addPhotosToAlbum lands in the reordered album, and makes one if all were deleted', () => {
    const base = data.apps;
    const make = (albums: (typeof A)[]) => ({ ...data, apps: [...base, { id: 'ph', type: 'photos', title: 'P', icon: '', visible: true, order: 99, content: { albums } } as unknown as SiteData['apps'][number]] });
    const before = make([A, B]);
    const snap = snapshotAlbum(before, 'ph', 1);
    const after = make([B, A]);
    const out = addPhotosToAlbum(after, 'ph', snap, ['u']).apps.find((a) => a.id === 'ph') as unknown as { content: { albums: (typeof A)[] } };
    expect(out.content.albums.map((x) => x.photos.length)).toEqual([1, 0]);
    const none = addPhotosToAlbum(make([]), 'ph', snap, ['u']).apps.find((a) => a.id === 'ph') as unknown as { content: { albums: (typeof A)[] } };
    expect(none.content.albums).toEqual([{ name: 'Album 1', photos: [{ url: 'u', caption: '' }] }]);
  });
});
