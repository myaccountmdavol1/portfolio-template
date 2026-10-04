import { buildPhoneLayout, canBeWidget, widgetSizeOfSlot } from '../phoneLayout';
import type { DockEntry, SiteData, WidgetSize } from '../types';
import { isInDock, isOnDesktop } from './mutations';
import { isInPhoneDock } from './phoneMutations';

export type AppAction =
  | 'rename'
  | 'changeIcon'
  | 'duplicate'
  | 'hide'
  | 'toggleDesktop'
  | 'toggleDock'
  | 'togglePhoneDock'
  | 'newPhonePage'
  | 'sizeSmall'
  | 'sizeMedium'
  | 'sizeLarge'
  | 'delete';

export interface MenuEntry<A extends string = string> {
  id: A;
  label: string;
  danger?: boolean;
}

const SIZE_ACTIONS: { id: AppAction; size: WidgetSize; label: string }[] = [
  { id: 'sizeSmall', size: 'small', label: 'Small' },
  { id: 'sizeMedium', size: 'medium', label: 'Medium' },
  { id: 'sizeLarge', size: 'large', label: 'Large' },
];

export function sizeFromAction(action: AppAction): WidgetSize | null {
  return SIZE_ACTIONS.find((a) => a.id === action)?.size ?? null;
}

function sizeEntries(current: WidgetSize | null): MenuEntry<AppAction>[] {
  if (!current) return [];
  return SIZE_ACTIONS.map((a) => ({ id: a.id, label: `${a.size === current ? '✓ ' : ''}${a.label} Widget` }));
}

/** The right-click menu for an app icon or widget on the desktop, or in the dock. */
export function appMenuEntries(data: SiteData, appId: string): MenuEntry<AppAction>[] {
  const widget = data.layout.desktop.widgets.find((p) => p.appId === appId);
  const app = data.apps.find((a) => a.id === appId);
  const current = widget ? (widget.size ?? (app?.type === 'note' ? 'medium' : 'small')) : null;
  return [
    ...sizeEntries(current),
    { id: 'rename', label: 'Rename' },
    { id: 'changeIcon', label: 'Change Icon…' },
    { id: 'duplicate', label: 'Duplicate' },
    { id: 'toggleDesktop', label: isOnDesktop(data, appId) ? 'Remove from Desktop' : 'Show on Desktop' },
    { id: 'toggleDock', label: isInDock(data, appId) ? 'Remove from Dock' : 'Add to Dock' },
    { id: 'hide', label: 'Hide' },
    { id: 'delete', label: 'Delete…', danger: true },
  ];
}

export type DockAction = 'changeIcon' | 'removeDock';

/** The long-press / right-click menu for an app in the phone preview (the phone dock is separate from the desktop dock). */
export function phoneMenuEntries(data: SiteData, appId: string): MenuEntry<AppAction>[] {
  const app = data.apps.find((a) => a.id === appId);
  const slot = buildPhoneLayout(data.apps, data.layout).pages.flat().find((s) => s.appId === appId);
  const current = app && canBeWidget(app) && slot ? widgetSizeOfSlot(slot.size) : null;
  return [
    ...sizeEntries(current),
    { id: 'changeIcon', label: 'Change Icon…' },
    { id: 'togglePhoneDock', label: isInPhoneDock(data, appId) ? 'Remove from Dock' : 'Add to Dock' },
    { id: 'newPhonePage', label: 'Move to New Page' },
    { id: 'duplicate', label: 'Duplicate' },
    { id: 'hide', label: 'Hide' },
    { id: 'delete', label: 'Delete…', danger: true },
  ];
}

/** The right-click menu for a dock link or separator (dock apps use appMenuEntries). */
export function dockMenuEntries(entry: DockEntry): MenuEntry<DockAction>[] {
  if (entry.kind === 'url') {
    return [
      { id: 'changeIcon', label: 'Change Icon…' },
      { id: 'removeDock', label: 'Remove from Dock', danger: true },
    ];
  }
  return [{ id: 'removeDock', label: 'Remove Separator', danger: true }];
}
