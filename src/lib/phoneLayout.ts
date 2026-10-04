import { WIDGET_TYPES, type Layout, type PhoneSlot, type PortfolioApp, type WidgetSize } from './types';

export const PHONE_CELLS_PER_PAGE = 24; // 4 columns × 6 rows
export const PHONE_DOCK_MAX = 4;

/** Home-screen slots for desktop-dock links use this id prefix plus the dock index, e.g. "link:9". */
export const LINK_SLOT_PREFIX = 'link:';
export const isLinkSlot = (slot: PhoneSlot) => slot.appId.startsWith(LINK_SLOT_PREFIX);

export interface PhoneLayout {
  pages: PhoneSlot[][]; // always at least one page
  dock: string[]; // app ids
}

/** Apps shown as a 2×2 widget on the phone home screen. */
export function isPhoneWidget(app: PortfolioApp): boolean {
  return WIDGET_TYPES.includes(app.type) || (app.type === 'stats' && app.content.showAsPhoneWidget) || (app.type === 'wallet' && !!app.content.showAsWidget);
}

/** Types that are allowed to occupy a widget slot at all. */
export function canBeWidget(app: PortfolioApp): boolean {
  return WIDGET_TYPES.includes(app.type) || app.type === 'stats' || app.type === 'wallet';
}

const CELLS: Record<PhoneSlot['size'], number> = { '1x1': 1, '2x2': 4, '4x2': 8, '4x4': 16 };

export function slotCells(slot: PhoneSlot): number {
  return CELLS[slot.size] ?? 1;
}

export const WIDGET_SLOT_SIZE: Record<WidgetSize, PhoneSlot['size']> = { small: '2x2', medium: '4x2', large: '4x4' };

export function widgetSizeOfSlot(size: PhoneSlot['size']): WidgetSize | null {
  return size === '2x2' ? 'small' : size === '4x2' ? 'medium' : size === '4x4' ? 'large' : null;
}

const byOrder = (a: PortfolioApp, b: PortfolioApp) => a.order - b.order;

/** Adds slots to the last page, starting a new page whenever the next slot doesn't fit. */
function appendSlots(pages: PhoneSlot[][], slots: PhoneSlot[]): PhoneSlot[][] {
  const result = pages.map((page) => [...page]);
  if (result.length === 0) result.push([]);
  for (const slot of slots) {
    let page = result[result.length - 1];
    const used = page.reduce((sum, s) => sum + slotCells(s), 0);
    if (used + slotCells(slot) > PHONE_CELLS_PER_PAGE) {
      page = [];
      result.push(page);
    }
    page.push(slot);
  }
  return result;
}

export function buildPhoneLayout(apps: PortfolioApp[], layout: Layout): PhoneLayout {
  const visible = apps.filter((a) => a.visible);
  const byId = new Map(visible.map((a) => [a.id, a]));
  const overrides = layout.phone.overrides;

  // 1. Dock
  const dockSource = overrides
    ? overrides.dock
    : layout.desktop.dock.flatMap((entry) => (entry.kind === 'app' ? [entry.appId] : []));
  const dock: string[] = [];
  for (const id of dockSource) {
    if (dock.length === PHONE_DOCK_MAX) break;
    if (byId.has(id) && !dock.includes(id)) dock.push(id);
  }
  const placed = new Set(dock);

  // 2. Saved pages (override mode only)
  const pages: PhoneSlot[][] = [];
  if (overrides) {
    for (const savedPage of overrides.pages) {
      const kept: PhoneSlot[] = [];
      for (const slot of savedPage) {
        const app = byId.get(slot.appId);
        if (!app || placed.has(app.id)) continue;
        placed.add(app.id);
        kept.push({ appId: app.id, size: slot.size !== '1x1' && canBeWidget(app) ? slot.size : '1x1' });
      }
      if (kept.length > 0) pages.push(kept);
    }
  }

  // 3. Everything not placed yet. Auto mode puts widgets first; override mode just appends by order.
  const remaining = visible.filter((a) => !placed.has(a.id)).sort(byOrder);
  const ordered = overrides
    ? remaining
    : [
        ...remaining.filter((a) => WIDGET_TYPES.includes(a.type)),
        ...remaining.filter((a) => a.type === 'stats' && isPhoneWidget(a)),
        ...remaining.filter((a) => !isPhoneWidget(a)),
      ];
  const slots = ordered.map((a): PhoneSlot => ({ appId: a.id, size: isPhoneWidget(a) ? '2x2' : '1x1' }));
  // Dock links (Mail, LinkedIn…) become home-screen shortcuts after the apps, like iOS web clips.
  const links = layout.desktop.dock.flatMap((entry, i): PhoneSlot[] => (entry.kind === 'url' ? [{ appId: `${LINK_SLOT_PREFIX}${i}`, size: '1x1' }] : []));

  return { pages: appendSlots(pages, [...slots, ...links]), dock };
}
