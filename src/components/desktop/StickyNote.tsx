'use client';

import type { RefObject } from 'react';
import { useRef } from 'react';
import { NOTE_INK, NOTE_YELLOW, NoteChecklist } from '@/components/apps/NoteView';
import { EditableText } from '@/components/editor/EditableText';
import { isSelectedApp, useEditor, type EditorApi } from '@/components/editor/EditorContext';
import { updateAppContent } from '@/lib/editor/mutations';
import type { NoteApp, NoteContent, WidgetSize } from '@/lib/types';
import { useAreaDrag, type PctPosition } from './useAreaDrag';

const STICKY_WIDTHS: Record<WidgetSize, number> = { small: 190, medium: 240, large: 320 };

interface StickyNoteProps {
  app: NoteApp;
  position: PctPosition;
  /** Missing = medium, the original sticky-note size. */
  size?: WidgetSize;
  areaRef: RefObject<HTMLElement | null>;
  onMove: (appId: string, position: PctPosition) => void;
  /** Edit mode: a drag finished at this position. */
  onMoveEnd?: (appId: string, position: PctPosition) => void;
}

export function StickyNote({ app, position, size = 'medium', areaRef, onMove, onMoveEnd }: StickyNoteProps) {
  const STICKY_W = STICKY_WIDTHS[size];
  const ref = useRef<HTMLDivElement>(null);
  const drag = useAreaDrag(
    areaRef,
    ref,
    (next) => onMove(app.id, next),
    (final) => onMoveEnd?.(app.id, final),
  );
  const editor = useEditor();
  const selected = isSelectedApp(editor, app.id);
  return (
    <div
      ref={ref}
      role="group"
      aria-label={app.title}
      data-testid="sticky-note"
      onPointerDown={drag.onPointerDown}
      onClickCapture={(e) => {
        if (drag.wasDragged()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onClick={() => editor?.select({ kind: 'app', appId: app.id })}
      onContextMenu={(e) => {
        if (!editor) return;
        e.preventDefault();
        editor.select({ kind: 'app', appId: app.id });
        editor.openMenu({ x: e.clientX, y: e.clientY, target: { kind: 'app', appId: app.id } });
      }}
      className={`absolute z-20 touch-none select-none px-[18px] pb-5 pt-[18px] shadow-[0_14px_30px_rgba(0,0,0,.16)] ${
        selected ? 'outline outline-2 outline-offset-4 outline-[#0a84ff]/70' : ''
      }`}
      style={{
        width: STICKY_W,
        left: `max(0px, min(${position.xPct}%, calc(100% - ${STICKY_W + 10}px)))`,
        top: `max(0px, min(${position.yPct}%, calc(100% - 300px)))`,
        background: NOTE_YELLOW,
        color: NOTE_INK,
        transform: 'rotate(-2deg)',
      }}
    >
      {editor ? (
        <EditableNote app={app} editor={editor} />
      ) : (
        <>
          <div className="mb-2.5 font-serif text-[26px]">{app.content.title}</div>
          <NoteChecklist items={app.content.items} />
        </>
      )}
    </div>
  );
}

/** Edit mode: title and items are edited in place, checkboxes are saved, items can be added or cleared. */
function EditableNote({ app, editor }: { app: NoteApp; editor: EditorApi }) {
  const { title, items } = app.content;
  const save = (next: Partial<NoteContent>) =>
    editor.apply((d) => {
      const current = d.apps.find((a) => a.id === app.id);
      return current?.type === 'note' ? updateAppContent(d, app.id, { ...current.content, ...next }) : d;
    });

  return (
    <>
      <div className="mb-2.5 font-serif text-[26px]">
        <EditableText label="Note title" value={title} onCommit={(t) => save({ title: t })} />
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] leading-snug">
            <input
              type="checkbox"
              aria-label={`Done: ${item.text}`}
              checked={item.done}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={() => save({ items: items.map((it, j) => (j === i ? { ...it, done: !it.done } : it)) })}
              className="mt-0.5 h-[13px] w-[13px] flex-none accent-[#2b2618]"
            />
            <EditableText
              label={`Note item ${i + 1}`}
              value={item.text}
              allowEmpty
              style={{ textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.7 : 1 }}
              onCommit={(text) =>
                save({ items: text ? items.map((it, j) => (j === i ? { ...it, text } : it)) : items.filter((_, j) => j !== i) })
              }
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => save({ items: [...items, { text: 'New item', done: false }] })}
        className="mt-2 cursor-pointer rounded px-1 text-xs opacity-60 hover:bg-black/5 hover:opacity-100"
      >
        + Add item
      </button>
    </>
  );
}
