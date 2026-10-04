import { describe, expect, it } from 'vitest';
import { seedSiteData } from '../seed';
import { appMenuEntries, dockMenuEntries, phoneMenuEntries } from './appMenu';

const labels = (appId: string) => appMenuEntries(seedSiteData, appId).map((e) => e.label);

describe('appMenuEntries', () => {
  it('offers the opposite of where the app currently is', () => {
    expect(labels('p1')).toEqual(expect.arrayContaining(['Remove from Desktop', 'Add to Dock']));
    expect(labels('playlist')).toEqual(expect.arrayContaining(['Show on Desktop', 'Remove from Dock']));
  });

  it('marks delete as dangerous and puts it last', () => {
    expect(appMenuEntries(seedSiteData, 'p1').at(-1)).toEqual({ id: 'delete', label: 'Delete…', danger: true });
  });
});

describe('widget sizes in menus', () => {
  it('offers sizes with a check on the current one, only for widgets', () => {
    const labels = appMenuEntries(seedSiteData, 'todo').map((e) => e.label);
    expect(labels.slice(0, 3)).toEqual(['Small Widget', '✓ Medium Widget', 'Large Widget']);
    expect(appMenuEntries(seedSiteData, 'p1').map((e) => e.label)).not.toContain('Small Widget');
    expect(phoneMenuEntries(seedSiteData, 'todo').map((e) => e.label)[0]).toBe('✓ Small Widget');
  });
});

describe('dockMenuEntries', () => {
  it('lets links change icon or be removed, and separators be removed', () => {
    expect(dockMenuEntries({ kind: 'url', url: 'https://x.dev', label: 'X' }).map((e) => e.id)).toEqual(['changeIcon', 'removeDock']);
    expect(dockMenuEntries({ kind: 'separator' }).map((e) => e.label)).toEqual(['Remove Separator']);
  });
});

describe('phoneMenuEntries', () => {
  it('uses the phone dock, not the desktop dock', () => {
    // 'stats' is in the desktop dock but not in the phone dock (only the first 4 dock apps are).
    expect(phoneMenuEntries(seedSiteData, 'stats').map((e) => e.label)).toContain('Add to Dock');
    expect(phoneMenuEntries(seedSiteData, 'about').map((e) => e.label)).toContain('Remove from Dock');
  });
});
