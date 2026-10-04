'use client';

import type { CSSProperties, RefObject } from 'react';
import { useRef } from 'react';
import { AppIcon } from '@/components/AppIcon';
import { NotificationBubble } from '@/components/NotificationBubble';
import { EditableText } from '@/components/editor/EditableText';
import { isSelectedApp, useEditor } from '@/components/editor/EditorContext';
import { updateApp } from '@/lib/editor/mutations';
import type { PortfolioApp } from '@/lib/types';
import { useAreaDrag, type PctPosition } from './useAreaDrag';

const ICON_W = 104;
const ICON_H = 110;

interface DesktopIconProps {
  app: PortfolioApp;
  position: PctPosition;
  areaRef: RefObject<HTMLElement | null>;
  labelBg: string;
  labelInk: string;
  accent: string;
  onOpen: (appId: string) => void;
  onMove: (appId: string, position: PctPosition) => void;
  /** Edit mode: a drag finished at this position. */
  onMoveEnd?: (appId: string, position: PctPosition) => void;
}

export function DesktopIcon({ app, position, areaRef, labelBg, labelInk, accent, onOpen, onMove, onMoveEnd }: DesktopIconProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const drag = useAreaDrag(
    areaRef,
    ref,
    (next) => onMove(app.id, next),
    (final) => onMoveEnd?.(app.id, final),
  );
  const editor = useEditor();
  const selected = isSelectedApp(editor, app.id);

  const placement: CSSProperties = {
    width: ICON_W,
    left: `max(0px, min(${position.xPct}%, calc(100% - ${ICON_W}px)))`,
    top: `max(0px, min(${position.yPct}%, calc(100% - ${ICON_H}px)))`,
  };
  const iconArt = (
    <span className="relative flex h-[60px] w-[72px] items-end justify-center">
      <AppIcon icon={app.icon} size={72} variant="desktop" accent={accent} />
      <NotificationBubble app={app} size={60} />
    </span>
  );

  // Renaming: an editable label can't live inside a <button>, so swap in a plain container.
  if (editor && editor.renamingId === app.id) {
    return (
      <div data-app-id={app.id} className="absolute z-10 flex flex-col items-center gap-2 p-1" style={placement}>
        {iconArt}
        <EditableText
          label="New name"
          value={app.title}
          autoFocus
          className="bg-white px-1.5 py-0.5 text-center text-xs leading-tight text-[#1d1c1a]"
          onCommit={(title) => editor.apply((d) => updateApp(d, app.id, { title }))}
          onDone={() => editor.setRenamingId(null)}
        />
      </div>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      aria-label={app.title}
      aria-pressed={editor ? selected : undefined}
      data-app-id={app.id}
      onPointerDown={drag.onPointerDown}
      onClick={() => {
        if (drag.wasDragged()) return;
        if (editor) editor.select({ kind: 'app', appId: app.id });
        else onOpen(app.id);
      }}
      onDoubleClick={() => {
        if (editor) onOpen(app.id);
      }}
      onContextMenu={(e) => {
        if (!editor) return;
        e.preventDefault();
        editor.select({ kind: 'app', appId: app.id });
        editor.openMenu({ x: e.clientX, y: e.clientY, target: { kind: 'app', appId: app.id } });
      }}
      className={`absolute z-10 flex cursor-default touch-none select-none flex-col items-center gap-2 rounded-md p-1 ${
        selected ? 'bg-[#0a84ff]/15 outline outline-2 outline-[#0a84ff]/70' : ''
      }`}
      style={placement}
    >
      {iconArt}
      <span
        className="rounded px-1.5 py-0.5 text-center text-xs leading-tight text-balance"
        style={selected ? { background: '#0a84ff', color: '#fff' } : { background: labelBg, color: labelInk }}
      >
        {app.title}
      </span>
    </button>
  );
}
