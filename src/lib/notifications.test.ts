import { describe, expect, it } from 'vitest';
import { starterApp } from './editor/starters';
import { bubbleFor, bubbleSignature, bubbleText, supportsAutoNotification } from './notifications';
import { seedSiteData } from './seed';
import type { PortfolioApp } from './types';

const withBubble = (app: PortfolioApp, notification: PortfolioApp['notification']) => ({ ...app, notification }) as PortfolioApp;

describe('notification bubbles', () => {
  const note = starterApp('note', 'n', 1);
  const wallet = starterApp('wallet', 'w', 2);
  const gc = starterApp('gamecenter', 'gc', 3);

  it('is off unless the owner turns it on', () => {
    expect(bubbleFor(note, null, null)).toBeNull();
    expect(bubbleFor(withBubble(note, { mode: 'dot' }), null, null)).toEqual({ kind: 'dot' });
    expect(bubbleFor(withBubble(note, { mode: 'number', count: 3 }), null, null)).toEqual({ kind: 'number', value: 3 });
    expect(bubbleFor(withBubble(note, { mode: 'number', count: 0 }), null, null)).toBeNull();
  });

  it('Automatic counts badges in Wallet and achievements left in Game Center', () => {
    expect(bubbleFor(withBubble(wallet, { mode: 'auto' }), null, null)).toEqual({ kind: 'number', value: 1 });
    const data = { ...seedSiteData, apps: [...seedSiteData.apps, gc] };
    const all = bubbleFor(withBubble(gc, { mode: 'auto' }), data, { opened: [], unlocked: [] });
    const fewer = bubbleFor(withBubble(gc, { mode: 'auto' }), data, { opened: [], unlocked: ['first-app'] });
    expect(all?.kind === 'number' && fewer?.kind === 'number' && all.value - fewer.value).toBe(1);
    expect(supportsAutoNotification(note)).toBe(false);
  });

  it('a new badge brings the bubble back; Game Center’s countdown doesn’t', () => {
    const w = withBubble(wallet, { mode: 'auto' });
    expect(bubbleSignature(w, { kind: 'number', value: 1 })).not.toBe(bubbleSignature(w, { kind: 'number', value: 2 }));
    const g = withBubble(gc, { mode: 'auto' });
    expect(bubbleSignature(g, { kind: 'number', value: 9 })).toBe(bubbleSignature(g, { kind: 'number', value: 8 }));
    expect(bubbleText(120)).toBe('99+');
  });
});
