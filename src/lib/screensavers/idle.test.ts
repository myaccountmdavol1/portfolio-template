import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anyMediaPlaying, createIdleEngine, focusBlocksIdle, HOT_CORNER_MS, idleBlocker, inHotCorner, type IdleGuards } from './idle';

const calm: IdleGuards = { tour: false, call: false, faceTime: false, finale: false, mediaPlaying: false, typing: false, spotlight: false, controlCenter: false, editor: false, hidden: false };

describe('inHotCorner', () => {
  it('is within 4 px of the chosen corner', () => {
    expect(inHotCorner('top-left', 4, 0, 1280, 800)).toBe(true);
    expect(inHotCorner('top-left', 5, 0, 1280, 800)).toBe(false);
    expect(inHotCorner('bottom-right', 1279, 799, 1280, 800)).toBe(true);
    expect(inHotCorner('bottom-right', 1279, 790, 1280, 800)).toBe(false);
    expect(inHotCorner('top-right', 1277, 3, 1280, 800)).toBe(true);
    expect(inHotCorner('bottom-left', 0, 797, 1280, 800)).toBe(true);
    expect(inHotCorner('none', 0, 0, 1280, 800)).toBe(false);
  });
});

describe('idleBlocker', () => {
  it('names what keeps the screen saver away, or null', () => {
    expect(idleBlocker(calm)).toBeNull();
    for (const key of Object.keys(calm) as (keyof IdleGuards)[]) expect(idleBlocker({ ...calm, [key]: true })).toBe(key);
  });
});

describe('focusBlocksIdle', () => {
  it('is true while the visitor is in a text field or an embed', () => {
    expect(focusBlocksIdle({ tagName: 'INPUT', type: 'text' })).toBe(true);
    expect(focusBlocksIdle({ tagName: 'INPUT', type: 'password' })).toBe(true);
    expect(focusBlocksIdle({ tagName: 'INPUT', type: 'checkbox' })).toBe(false);
    expect(focusBlocksIdle({ tagName: 'TEXTAREA' })).toBe(true);
    expect(focusBlocksIdle({ tagName: 'SELECT' })).toBe(true);
    expect(focusBlocksIdle({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(focusBlocksIdle({ tagName: 'IFRAME' })).toBe(true);
    expect(focusBlocksIdle({ tagName: 'BUTTON' })).toBe(false);
    expect(focusBlocksIdle(null)).toBe(false);
  });
});

describe('anyMediaPlaying', () => {
  it('counts audible playing media only', () => {
    expect(anyMediaPlaying([{ paused: false, ended: false, muted: false }])).toBe(true);
    expect(anyMediaPlaying([{ paused: false, ended: false, muted: true }])).toBe(false); // a muted background loop
    expect(anyMediaPlaying([{ paused: true, ended: false, muted: false }, { paused: false, ended: true, muted: false }])).toBe(false);
    expect(anyMediaPlaying([])).toBe(false);
  });
});

describe('createIdleEngine', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const setup = (blocked: () => boolean = () => false, corner: 'none' | 'bottom-right' = 'none') => {
    const onTrigger = vi.fn();
    const engine = createIdleEngine({ delayMs: 1000, corner, blocked, onTrigger });
    return { engine, onTrigger };
  };

  it('fires after the delay with no input, and input restarts the count', () => {
    const { engine, onTrigger } = setup();
    vi.advanceTimersByTime(900);
    engine.activity();
    vi.advanceTimersByTime(900);
    expect(onTrigger).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(onTrigger).toHaveBeenCalledWith('idle');
  });

  it('waits while something blocks it, then fires a full delay later', () => {
    let busy = true;
    const { onTrigger } = setup(() => busy);
    vi.advanceTimersByTime(1000);
    expect(onTrigger).not.toHaveBeenCalled();
    busy = false;
    vi.advanceTimersByTime(999);
    expect(onTrigger).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onTrigger).toHaveBeenCalledOnce();
  });

  it('starts from the hot corner after the pointer rests there for 1 s', () => {
    const { engine, onTrigger } = setup(() => false, 'bottom-right');
    engine.pointer(1279, 799, 1280, 800);
    vi.advanceTimersByTime(HOT_CORNER_MS - 1);
    engine.pointer(1278, 798, 1280, 800); // still in the corner: the second keeps counting
    vi.advanceTimersByTime(1);
    expect(onTrigger).toHaveBeenCalledWith('corner');
  });

  it('leaving the corner (or the window) early cancels it', () => {
    const { engine, onTrigger } = setup(() => false, 'bottom-right');
    engine.pointer(1279, 799, 1280, 800);
    vi.advanceTimersByTime(500);
    engine.pointer(600, 400, 1280, 800);
    engine.pointer(1279, 799, 1280, 800);
    vi.advanceTimersByTime(500);
    engine.leave();
    vi.advanceTimersByTime(600);
    expect(onTrigger).not.toHaveBeenCalledWith('corner');
  });

  it('does nothing while paused and counts from scratch on resume', () => {
    const { engine, onTrigger } = setup();
    engine.pause();
    vi.advanceTimersByTime(5000);
    expect(onTrigger).not.toHaveBeenCalled();
    engine.resume();
    vi.advanceTimersByTime(999);
    expect(onTrigger).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onTrigger).toHaveBeenCalledOnce();
    engine.dispose();
  });
});
