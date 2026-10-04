'use client';

import { useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import { isSelectedApp, useEditor } from '@/components/editor/EditorContext';
import { usePointerDrag } from '@/hooks/usePointerDrag';
import { movePhoneItem, type PhoneTarget } from '@/lib/editor/phoneMutations';
import { PHONE_DOCK_MAX } from '@/lib/phoneLayout';

const LONG_PRESS_MS = 550;

/** What's under the pointer: a slot (take its place), a page's empty space (append), or the dock. */
function phoneTargetAt(x: number, y: number, draggedId: string): PhoneTarget | null {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const dockItem = el.closest<HTMLElement>('[data-phone-dock-index]');
  if (dockItem && dockItem.dataset.appId !== draggedId) return { kind: 'dock', index: Number(dockItem.dataset.phoneDockIndex) };
  if (el.closest('[data-phone-dock]')) return { kind: 'dock', index: PHONE_DOCK_MAX };
  const slot = el.closest<HTMLElement>('[data-phone-slot]');
  if (slot && slot.dataset.appId !== draggedId) {
    const [page, index] = (slot.dataset.phoneSlot ?? '0:0').split(':').map(Number);
    return { kind: 'page', page, index };
  }
  const page = el.closest<HTMLElement>('[data-phone-page]');
  if (page) return { kind: 'page', page: Number(page.dataset.phonePage), index: Number.MAX_SAFE_INTEGER };
  return null;
}

/** Edit-mode behaviour for a phone icon, widget, or dock item. Returns null outside Edit mode. */
export function useEditablePhoneItem(appId: string) {
  const editor = useEditor();
  const [offset, setOffset] = useState<{ dx: number; dy: number } | null>(null);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearLongPress = () => {
    if (longPress.current) clearTimeout(longPress.current);
    longPress.current = null;
  };

  const drag = usePointerDrag({
    onStart: clearLongPress,
    onMove: (dx, dy) => setOffset({ dx, dy }),
    onEnd: (dragged, point) => {
      clearLongPress();
      setOffset(null);
      if (!dragged || !editor) return;
      const target = phoneTargetAt(point.x, point.y, appId);
      if (target) editor.apply((d) => movePhoneItem(d, appId, target));
    },
  });

  if (!editor) return null;

  const openMenu = (x: number, y: number) => {
    editor.select({ kind: 'app', appId });
    editor.openMenu({ x, y, target: { kind: 'app', appId }, surface: 'phone' });
  };

  const style: CSSProperties | undefined = offset
    ? { transform: `translate(${offset.dx}px, ${offset.dy}px) scale(1.06)`, zIndex: 50, position: 'relative', pointerEvents: 'none' }
    : undefined;

  return {
    selected: isSelectedApp(editor, appId),
    style,
    handlers: {
      'data-app-id': appId,
      onPointerDown: (e: PointerEvent) => {
        drag.onPointerDown(e);
        const { clientX, clientY } = e;
        clearLongPress();
        longPress.current = setTimeout(() => openMenu(clientX, clientY), LONG_PRESS_MS);
      },
      onPointerUp: clearLongPress,
      onPointerLeave: clearLongPress,
      onContextMenu: (e: MouseEvent) => {
        e.preventDefault();
        clearLongPress();
        openMenu(e.clientX, e.clientY);
      },
      // In Edit mode a tap selects instead of opening the app.
      onClickCapture: (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!drag.wasDragged()) editor.select({ kind: 'app', appId });
      },
    },
  };
}

export const selectedRing = 'outline outline-2 outline-offset-2 outline-[#0a84ff] rounded-[18px]';
