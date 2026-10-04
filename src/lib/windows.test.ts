import { describe, expect, it } from 'vitest';
import { initialWindowsState, topWindowId, windowsReducer, type WindowsState } from './windows';

const open = (state: WindowsState, appId: string) =>
  windowsReducer(state, { type: 'open', appId, x: 10, y: 20, width: 500 });

describe('windowsReducer', () => {
  it('opens a window on top', () => {
    const s = open(initialWindowsState, 'a');
    expect(s.windows).toEqual([{ appId: 'a', x: 10, y: 20, width: 500, z: 1 }]);
    expect(s.nextZ).toBe(2);
    expect(s.openedCount).toBe(1);
  });

  it('focuses instead of duplicating when opening an already-open app', () => {
    const s = open(open(open(initialWindowsState, 'a'), 'b'), 'a');
    expect(s.windows).toHaveLength(2);
    expect(s.openedCount).toBe(2);
    expect(topWindowId(s)).toBe('a');
  });

  it('brings a window to the front on focus', () => {
    const s = windowsReducer(open(open(initialWindowsState, 'a'), 'b'), { type: 'focus', appId: 'a' });
    expect(s.windows.find((w) => w.appId === 'a')?.z).toBe(3);
    expect(s.nextZ).toBe(4);
  });

  it('returns the same state when focusing the top window or a missing one', () => {
    const s = open(open(initialWindowsState, 'a'), 'b');
    expect(windowsReducer(s, { type: 'focus', appId: 'b' })).toBe(s);
    expect(windowsReducer(s, { type: 'focus', appId: 'zzz' })).toBe(s);
  });

  it('closes and moves windows', () => {
    const s = open(open(initialWindowsState, 'a'), 'b');
    expect(windowsReducer(s, { type: 'close', appId: 'a' }).windows.map((w) => w.appId)).toEqual(['b']);
    const moved = windowsReducer(s, { type: 'move', appId: 'a', x: 300, y: 400 });
    expect(moved.windows.find((w) => w.appId === 'a')).toMatchObject({ x: 300, y: 400 });
  });

  it('closes the top window', () => {
    const s = windowsReducer(open(open(initialWindowsState, 'a'), 'b'), { type: 'closeTop' });
    expect(s.windows.map((w) => w.appId)).toEqual(['a']);
    expect(windowsReducer(initialWindowsState, { type: 'closeTop' })).toBe(initialWindowsState);
  });

  it('closes all windows', () => {
    const s = windowsReducer(open(open(initialWindowsState, 'a'), 'b'), { type: 'closeAll' });
    expect(s.windows).toEqual([]);
    expect(topWindowId(s)).toBeNull();
  });
});

describe('tiling', () => {
  const two = open(open(initialWindowsState, 'a'), 'b');

  it('setFrame remembers the old frame and restore puts it back', () => {
    const tiled = windowsReducer(two, { type: 'setFrame', appId: 'a', frame: { x: 8, y: 40, width: 600, height: 700 } });
    expect(tiled.windows[0]).toMatchObject({ x: 8, y: 40, width: 600, height: 700, restore: { x: 10, y: 20, width: 500 } });
    const back = windowsReducer(tiled, { type: 'restore', appId: 'a' });
    expect(back.windows[0]).toMatchObject({ x: 10, y: 20, width: 500, height: undefined, restore: undefined });
  });

  it('keeps the original frame when tiling twice in a row', () => {
    let s = windowsReducer(two, { type: 'setFrame', appId: 'a', frame: { x: 1, y: 1, width: 1, height: 1 } });
    s = windowsReducer(s, { type: 'setFrame', appId: 'a', frame: { x: 2, y: 2, width: 2, height: 2 } });
    expect(s.windows[0].restore).toEqual({ x: 10, y: 20, width: 500, height: undefined });
  });

  it('arrange gives the front window the first slot', () => {
    const s = windowsReducer(two, { type: 'arrange', frames: [{ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 0, width: 10, height: 10 }] });
    expect(s.windows.find((w) => w.appId === 'b')).toMatchObject({ x: 0 }); // b was opened last, so it's in front
    expect(s.windows.find((w) => w.appId === 'a')).toMatchObject({ x: 20 });
  });

  it('resize sets an explicit size and forgets any restore frame', () => {
    const tiled = windowsReducer(two, { type: 'setFrame', appId: 'a', frame: { x: 8, y: 40, width: 600, height: 700 } });
    expect(windowsReducer(tiled, { type: 'resize', appId: 'a', width: 450, height: 300 }).windows[0]).toMatchObject({ width: 450, height: 300, restore: undefined });
  });
});

describe('fitting a window to its content', () => {
  const opened = windowsReducer(initialWindowsState, { type: 'open', appId: 'p', x: 10, y: 40, width: 600 });

  it('fits, then goes back to the old size (keeping where it was moved)', () => {
    const fitted = windowsReducer(opened, { type: 'fit', appId: 'p', frame: { x: 20, y: 50, width: 900, height: 500 } });
    expect(fitted.windows[0]).toMatchObject({ width: 900, height: 500, fitFrom: { width: 600, height: undefined } });
    const moved = windowsReducer(fitted, { type: 'move', appId: 'p', x: 200, y: 60 });
    const back = windowsReducer(moved, { type: 'unfit', appId: 'p' });
    expect(back.windows[0]).toMatchObject({ x: 200, y: 60, width: 600, height: undefined });
  });

  it('leaves a tiled window alone', () => {
    const tiled = windowsReducer(opened, { type: 'setFrame', appId: 'p', frame: { x: 0, y: 40, width: 700, height: 800 } });
    const fitted = windowsReducer(tiled, { type: 'fit', appId: 'p', frame: { x: 20, y: 50, width: 900, height: 500 } });
    expect(fitted.windows[0].width).toBe(700);
  });
});
