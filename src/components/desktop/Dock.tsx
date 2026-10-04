'use client';

import { Fragment, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AppIcon } from '@/components/AppIcon';
import { NotificationBubble } from '@/components/NotificationBubble';
import { useEditor, type EditorApi } from '@/components/editor/EditorContext';
import { usePointerDrag } from '@/hooks/usePointerDrag';
import { insertionIndex } from '@/lib/editor/dockOrder';
import { moveDockEntry } from '@/lib/editor/mutations';
import type { DockEntry, PortfolioApp } from '@/lib/types';

const TILE = 52;

interface DockProps {
  entries: DockEntry[];
  appsById: Map<string, PortfolioApp>;
  openIds: Set<string>;
  onOpen: (appId: string) => void;
}

export function Dock({ entries, appsById, openIds, onOpen }: DockProps) {
  const editor = useEditor();
  const navRef = useRef<HTMLElement>(null);
  const [scale, setScale] = useState(1);

  // Fit the dock's natural width into the window (with 16px to spare), re-checking on resize.
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const fit = () => {
      const natural = nav.scrollWidth;
      const room = (nav.parentElement?.clientWidth ?? window.innerWidth) - 16;
      setScale(natural > room ? Math.max(0.5, room / natural) : 1);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(nav);
    if (nav.parentElement) observer.observe(nav.parentElement);
    return () => observer.disconnect();
  }, [entries.length]);

  function renderEntry(entry: DockEntry, i: number): ReactNode {
    if (entry.kind === 'separator') {
      if (!editor) return <span aria-hidden className="mx-1 block h-11 w-px self-center bg-black/25" />;
      // Edit mode: a real, comfortably sized button around the 1px line, so it can be clicked, dragged, or removed.
      const selected = editor.selection?.kind === 'dock' && editor.selection.index === i;
      return (
        <button
          type="button"
          aria-label="Separator"
          title="Separator — click to select, drag to move"
          onClick={() => editor.select({ kind: 'dock', index: i })}
          className={`flex h-[52px] w-5 cursor-pointer items-center justify-center self-center rounded-md hover:bg-black/10 ${selected ? 'bg-[#0a84ff]/15 outline outline-2 outline-[#0a84ff]' : ''}`}
        >
          <span aria-hidden className="block h-11 w-px bg-black/35" />
        </button>
      );
    }
    if (entry.kind === 'url') {
      const selected = editor?.selection?.kind === 'dock' && editor.selection.index === i;
      return (
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={entry.label}
          title={entry.label}
          onClick={(e) => {
            if (!editor) return;
            e.preventDefault();
            editor.select({ kind: 'dock', index: i });
          }}
          className={`dock-item flex flex-col items-center rounded-xl ${selected ? 'outline outline-2 outline-offset-2 outline-[#0a84ff]' : ''}`}
        >
          <AppIcon
            icon={entry.iconUrl ? { kind: 'image', url: entry.iconUrl } : { kind: 'builtin', name: 'globe' }}
            size={TILE}
            variant="tile"
          />
          <span aria-hidden className="mt-0.5 h-1 w-1" />
        </a>
      );
    }
    const app = appsById.get(entry.appId);
    if (!app) return null; // hidden or deleted
    const running = openIds.has(app.id);
    const selected = editor?.selection?.kind === 'app' && editor.selection.appId === app.id;
    return (
      <button
        type="button"
        aria-label={app.title}
        title={app.title}
        data-running={running}
        data-app-id={app.id}
        onClick={() => (editor ? editor.select({ kind: 'app', appId: app.id }) : onOpen(app.id))}
        onDoubleClick={() => editor && onOpen(app.id)}
        className={`dock-item flex cursor-pointer flex-col items-center rounded-xl ${selected ? 'outline outline-2 outline-offset-2 outline-[#0a84ff]' : ''}`}
      >
        <span className="relative block">
          <AppIcon icon={app.icon} size={TILE} variant="tile" />
          <NotificationBubble app={app} size={TILE} />
        </span>
        <span
          aria-hidden
          className="mt-0.5 h-1 w-1 rounded-full"
          style={{ background: running ? '#1d1c1a' : 'transparent' }}
        />
      </button>
    );
  }

  return (
    <nav
      ref={navRef}
      aria-label="Dock"
      className="dock-glass absolute bottom-2 left-1/2 z-[9000] flex w-max items-end gap-1.5 rounded-[22px] border border-white/30 bg-white/35 px-2.5 py-2 shadow-[0_12px_32px_rgba(0,0,0,.22)] backdrop-blur-xl [&>*]:flex-none"
      // Like macOS: when the window is too narrow, the whole dock shrinks instead of squashing its icons.
      style={{ transform: `translateX(-50%) scale(${scale})`, transformOrigin: '50% 100%' }}
    >
      {entries.map((entry, i) => {
        const content = renderEntry(entry, i);
        if (content === null) return null;
        return editor ? (
          <EditableDockSlot key={i} index={i} entry={entry} navRef={navRef} editor={editor}>
            {content}
          </EditableDockSlot>
        ) : (
          <Fragment key={i}>{content}</Fragment>
        );
      })}
    </nav>
  );
}

interface EditableDockSlotProps {
  index: number;
  entry: DockEntry;
  navRef: RefObject<HTMLElement | null>;
  editor: EditorApi;
  children: ReactNode;
}

/** Edit mode: drag sideways to reorder; right-click for the entry's menu. */
function EditableDockSlot({ index, entry, navRef, editor, children }: EditableDockSlotProps) {
  const [dx, setDx] = useState(0);
  const drag = usePointerDrag({
    onMove: (x) => setDx(x),
    onEnd: (dragged, point) => {
      setDx(0);
      if (!dragged || !navRef.current) return;
      const others = Array.from(navRef.current.querySelectorAll<HTMLElement>('[data-dock-index]'))
        .filter((el) => Number(el.dataset.dockIndex) !== index)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return r.left + r.width / 2;
        });
      const to = insertionIndex(point.x, others);
      editor.apply((d) => moveDockEntry(d, index, to));
      editor.select(null);
    },
  });

  return (
    <div
      data-dock-index={index}
      onPointerDown={drag.onPointerDown}
      onClickCapture={(e) => {
        if (drag.wasDragged()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        const target = entry.kind === 'app' ? ({ kind: 'app', appId: entry.appId } as const) : ({ kind: 'dock', index } as const);
        editor.select(target);
        editor.openMenu({ x: e.clientX, y: e.clientY, target });
      }}
      className="flex touch-none self-stretch"
      style={dx ? { transform: `translateX(${dx}px)`, zIndex: 1, position: 'relative' } : undefined}
    >
      {children}
    </div>
  );
}
