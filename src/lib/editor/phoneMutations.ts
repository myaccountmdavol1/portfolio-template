import { clamp } from '../geometry';
import { buildPhoneLayout, canBeWidget, isLinkSlot, isPhoneWidget, PHONE_CELLS_PER_PAGE, PHONE_DOCK_MAX, slotCells, WIDGET_SLOT_SIZE } from '../phoneLayout';
import type { PhoneOverrides, PhoneSlot, SiteData, WidgetSize } from '../types';

/** `index` is the position after the dragged app has been removed, so dropping on an item takes its place. */
export type PhoneTarget =
  | { kind: 'page'; page: number; index: number }
  | { kind: 'dock'; index: number }
  | { kind: 'newPage' };

/** The layout visitors currently see, as explicit overrides. The first phone edit freezes the auto layout this way. */
export function materializePhoneOverrides(data: SiteData): PhoneOverrides {
  const current = buildPhoneLayout(data.apps, data.layout);
  // Link shortcuts are derived from the desktop dock on every render, so they're never saved as overrides.
  const pages = current.pages.map((page) => page.filter((s) => !isLinkSlot(s)).map((s) => ({ ...s }))).filter((p) => p.length > 0);
  return { pages, dock: [...current.dock] };
}

export function isInPhoneDock(data: SiteData, appId: string): boolean {
  return buildPhoneLayout(data.apps, data.layout).dock.includes(appId);
}

const cells = (page: PhoneSlot[]) => page.reduce((sum, s) => sum + slotCells(s), 0);

/** Inserts `slot` into `pages[pageIndex]`, or into a new page right after it if it would overflow. */
function insertSlot(pages: PhoneSlot[][], pageIndex: number, index: number, slot: PhoneSlot): PhoneSlot[][] {
  const result = pages.length > 0 ? pages.map((p) => [...p]) : [[]];
  const p = clamp(pageIndex, 0, result.length - 1);
  const page = result[p];
  if (cells(page) + slotCells(slot) > PHONE_CELLS_PER_PAGE) {
    result.splice(p + 1, 0, [slot]);
  } else {
    page.splice(clamp(index, 0, page.length), 0, slot);
  }
  return result;
}

export function movePhoneItem(data: SiteData, appId: string, target: PhoneTarget): SiteData {
  const app = data.apps.find((a) => a.id === appId && a.visible);
  if (!app) return data;
  const widget = isPhoneWidget(app);
  if (target.kind === 'dock' && widget) return data; // 2×2 widgets can't live in the dock

  const base = materializePhoneOverrides(data);
  const existing = base.pages.flat().find((s) => s.appId === appId);
  const slot: PhoneSlot = { appId, size: existing?.size ?? (widget ? '2x2' : '1x1') };

  let pages = base.pages.map((page) => page.filter((s) => s.appId !== appId));
  const dock = base.dock.filter((id) => id !== appId);

  if (target.kind === 'dock') {
    dock.splice(clamp(target.index, 0, dock.length), 0, appId);
    const bumped = dock.splice(PHONE_DOCK_MAX);
    for (const [i, id] of bumped.entries()) pages = insertSlot(pages, 0, i, { appId: id, size: '1x1' });
  } else if (target.kind === 'newPage') {
    pages = [...pages, [slot]];
  } else {
    pages = insertSlot(pages, target.page, target.index, slot);
  }

  return {
    ...data,
    layout: { ...data.layout, phone: { overrides: { pages: pages.filter((p) => p.length > 0), dock } } },
  };
}

/** Resizes a widget on the phone; it re-flows onto the next page if the bigger size no longer fits. */
export function setPhoneWidgetSize(data: SiteData, appId: string, size: WidgetSize): SiteData {
  const app = data.apps.find((a) => a.id === appId && a.visible);
  if (!app || !canBeWidget(app)) return data;
  const base = materializePhoneOverrides(data);
  const pageIndex = base.pages.findIndex((p) => p.some((s) => s.appId === appId));
  if (pageIndex < 0) return data; // it's in the dock: no widget there
  const index = base.pages[pageIndex].findIndex((s) => s.appId === appId);
  const nextSize = WIDGET_SLOT_SIZE[size];
  if (base.pages[pageIndex][index].size === nextSize) return data;
  let pages = base.pages.map((p) => p.filter((s) => s.appId !== appId));
  pages = insertSlot(pages, pageIndex, index, { appId, size: nextSize });
  return { ...data, layout: { ...data.layout, phone: { overrides: { pages: pages.filter((p) => p.length > 0), dock: base.dock } } } };
}

export function resetPhoneLayout(data: SiteData): SiteData {
  if (data.layout.phone.overrides === null) return data;
  return { ...data, layout: { ...data.layout, phone: { overrides: null } } };
}
