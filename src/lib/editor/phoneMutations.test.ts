import { describe, expect, it } from 'vitest';
import { buildPhoneLayout } from '../phoneLayout';
import { seedSiteData } from '../seed';
import type { SiteData } from '../types';
import { isInPhoneDock, materializePhoneOverrides, movePhoneItem, resetPhoneLayout } from './phoneMutations';

const data: SiteData = seedSiteData;
const layoutOf = (d: SiteData) => buildPhoneLayout(d.apps, d.layout);

describe('materializePhoneOverrides', () => {
  it('freezes the current auto layout', () => {
    const auto = layoutOf(data);
    const withoutLinks = auto.pages.map((p) => p.filter((s) => !s.appId.startsWith('link:'))).filter((p) => p.length > 0);
    expect(materializePhoneOverrides(data)).toEqual({ pages: withoutLinks, dock: auto.dock });
  });
});

describe('movePhoneItem', () => {
  it('reorders within a page: dropping on a slot takes its place', () => {
    const before = layoutOf(data).pages[0].map((s) => s.appId);
    const moved = movePhoneItem(data, before[0], { kind: 'page', page: 0, index: 2 });
    expect(layoutOf(moved).pages[0].map((s) => s.appId).slice(0, 3)).toEqual([before[1], before[2], before[0]]);
    expect(moved.layout.phone.overrides).not.toBeNull();
  });

  it('moves an app into a full dock, bumping the last dock app onto page 1', () => {
    const before = layoutOf(data);
    expect(before.dock).toHaveLength(4);
    const after = layoutOf(movePhoneItem(data, 'p1', { kind: 'dock', index: 0 }));
    expect(after.dock).toEqual(['p1', ...before.dock.slice(0, 3)]);
    expect(after.pages[0][0].appId).toBe(before.dock[3]);
  });

  it('isInPhoneDock reflects the dock', () => {
    expect(isInPhoneDock(movePhoneItem(data, 'p1', { kind: 'dock', index: 0 }), 'p1')).toBe(true);
  });

  it('refuses to put a 2×2 widget in the dock', () => {
    expect(movePhoneItem(data, 'todo', { kind: 'dock', index: 0 })).toBe(data);
  });

  it('moves an app to a new last page and drops pages that become empty', () => {
    const onOwnPage = movePhoneItem(data, 'p1', { kind: 'newPage' });
    expect(layoutOf(onOwnPage).pages.at(-1)?.filter((s) => !s.appId.startsWith('link:'))).toEqual([{ appId: 'p1', size: '1x1' }]);
    const back = movePhoneItem(onOwnPage, 'p1', { kind: 'page', page: 0, index: 0 });
    expect(layoutOf(back).pages).toHaveLength(1);
  });

  it('ignores unknown apps', () => {
    expect(movePhoneItem(data, 'nope', { kind: 'newPage' })).toBe(data);
  });
});

describe('resetPhoneLayout', () => {
  it('goes back to auto layout', () => {
    expect(resetPhoneLayout(movePhoneItem(data, 'p1', { kind: 'newPage' })).layout.phone.overrides).toBeNull();
    expect(resetPhoneLayout(data)).toBe(data);
  });
});

describe('setPhoneWidgetSize', () => {
  it('makes a widget medium (4×2) and large (4×4)', async () => {
    const { setPhoneWidgetSize } = await import('./phoneMutations');
    const medium = setPhoneWidgetSize(data, 'todo', 'medium');
    expect(layoutOf(medium).pages.flat().find((s) => s.appId === 'todo')?.size).toBe('4x2');
    const large = setPhoneWidgetSize(medium, 'todo', 'large');
    expect(layoutOf(large).pages.flat().find((s) => s.appId === 'todo')?.size).toBe('4x4');
  });

  it('ignores apps that cannot be widgets, and no-op resizes', async () => {
    const { setPhoneWidgetSize } = await import('./phoneMutations');
    expect(setPhoneWidgetSize(data, 'p1', 'large')).toBe(data);
    expect(setPhoneWidgetSize(data, 'todo', 'small')).toBe(data);
  });
});
