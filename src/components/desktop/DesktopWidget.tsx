'use client';

import type { ReactNode, RefObject } from 'react';
import { useRef } from 'react';
import { isSelectedApp, useEditor } from '@/components/editor/EditorContext';
import type { PortfolioApp, WidgetSize } from '@/lib/types';
import { useAreaDrag, type PctPosition } from './useAreaDrag';

/** Widget footprints, like macOS: small is square-ish, medium is twice as wide, large is twice as tall too. */
export const WIDGET_DIMENSIONS: Record<WidgetSize, { width: number; height: number }> = {
  small: { width: 220, height: 180 },
  medium: { width: 456, height: 180 },
  large: { width: 456, height: 376 },
};

interface DesktopWidgetProps {
  app: PortfolioApp;
  position: PctPosition;
  size: WidgetSize;
  areaRef: RefObject<HTMLElement | null>;
  onOpen: (appId: string) => void;
  onMove: (appId: string, position: PctPosition) => void;
  onMoveEnd?: (appId: string, position: PctPosition) => void;
  children: ReactNode;
}

/** A draggable macOS-style widget card (clock, status). Click opens it; in Edit mode click selects. */
export function DesktopWidget({ app, position, size, areaRef, onOpen, onMove, onMoveEnd, children }: DesktopWidgetProps) {
  const { width: WIDGET_W, height: WIDGET_H } = WIDGET_DIMENSIONS[size];
  const ref = useRef<HTMLButtonElement>(null);
  const drag = useAreaDrag(
    areaRef,
    ref,
    (next) => onMove(app.id, next),
    (final) => onMoveEnd?.(app.id, final),
  );
  const editor = useEditor();
  const selected = isSelectedApp(editor, app.id);
  return (
    <button
      ref={ref}
      type="button"
      aria-label={app.title}
      aria-pressed={editor ? selected : undefined}
      data-app-id={app.id}
      data-testid="desktop-widget"
      onPointerDown={drag.onPointerDown}
      onClick={() => {
        if (drag.wasDragged()) return;
        if (editor) editor.select({ kind: 'app', appId: app.id });
        else onOpen(app.id);
      }}
      onDoubleClick={() => editor && onOpen(app.id)}
      onContextMenu={(e) => {
        if (!editor) return;
        e.preventDefault();
        editor.select({ kind: 'app', appId: app.id });
        editor.openMenu({ x: e.clientX, y: e.clientY, target: { kind: 'app', appId: app.id } });
      }}
      className={`absolute z-[15] cursor-default touch-none select-none overflow-hidden rounded-[22px] text-left shadow-[0_14px_34px_rgba(0,0,0,.18)] ${
        selected ? 'outline outline-2 outline-offset-4 outline-[#0a84ff]' : ''
      }`}
      style={{
        width: WIDGET_W,
        height: WIDGET_H,
        left: `max(0px, min(${position.xPct}%, calc(100% - ${WIDGET_W}px)))`,
        top: `max(0px, min(${position.yPct}%, calc(100% - ${WIDGET_H}px)))`,
      }}
    >
      {children}
    </button>
  );
}
