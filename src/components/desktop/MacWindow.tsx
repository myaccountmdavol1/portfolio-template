'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppLinkContext, type AppLinkApi, type FocusRequest } from '@/components/AppLinkContext';
import { MissingItemNote } from '@/components/MissingItemNote';
import { ShareButton } from '@/components/ShareButton';
import { AppContent } from '@/components/apps/AppContent';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { usePointerDrag } from '@/hooks/usePointerDrag';
import { clamp, clampWindowPosition, DOCK_RESERVED_H, fitMediaFrame, MIN_WINDOW, snapZoneAt, zoneFrame, type Frame, type SnapZone } from '@/lib/geometry';
import type { PortfolioApp } from '@/lib/types';
import type { OpenWindow } from '@/lib/windows';
import { WindowContext, type WindowApi } from './WindowContext';

interface MacWindowProps {
  app: PortfolioApp;
  win: OpenWindow;
  onFocus: (appId: string) => void;
  onClose: (appId: string) => void;
  onMove: (appId: string, x: number, y: number) => void;
  onResize: (appId: string, width: number, height: number) => void;
  /** Tile / fill to a frame (the window remembers where it was). */
  onSetFrame: (appId: string, frame: Frame) => void;
  onRestore: (appId: string) => void;
  /** Fit the window to the app's content (a frame), or go back to its old size (null). */
  onFit: (appId: string, frame: Frame | null) => void;
  /** Tile every open window. */
  onArrangeAll: () => void;
  /** An item a link asked this window to show. */
  focus: FocusRequest | null;
  /** The item the app reports showing (for Share). */
  itemKey: string | null;
  onItemChange: (appId: string, itemKey: string | null) => void;
  /** Site-relative link to an app (and item); null where links are off. */
  pathFor: (appId: string, itemKey?: string) => string | null;
}

const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });

type Axis = 'x' | 'y' | 'xy';

/** An invisible grab strip on a window edge or corner that resizes it. */
function ResizeHandle({ axis, className, testId, windowRef, win, onResize }: {
  axis: Axis;
  className: string;
  testId?: string;
  windowRef: React.RefObject<HTMLDivElement | null>;
  win: OpenWindow;
  onResize: (width: number, height: number) => void;
}) {
  const size = useRef({ width: 0, height: 0 });
  const drag = usePointerDrag({
    onStart: () => {
      const el = windowRef.current;
      size.current = { width: el?.offsetWidth ?? win.width, height: el?.offsetHeight ?? 400 };
    },
    onMove: (dx, dy) => {
      const vp = viewport();
      const width = axis === 'y' ? size.current.width : clamp(size.current.width + dx, MIN_WINDOW.width, vp.width - win.x - 8);
      const height = axis === 'x' ? size.current.height : clamp(size.current.height + dy, MIN_WINDOW.height, vp.height - DOCK_RESERVED_H - win.y);
      onResize(Math.round(width), Math.round(height));
    },
  });
  return <div aria-hidden data-testid={testId} onPointerDown={drag.onPointerDown} className={`absolute touch-none ${className}`} />;
}

export function MacWindow({ app, win, onFocus, onClose, onMove, onResize, onSetFrame, onRestore, onFit, onArrangeAll, focus, itemKey, onItemChange, pathFor }: MacWindowProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref);
  const [zone, setZone] = useState<SnapZone | null>(null);
  const [tileMenu, setTileMenu] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    [],
  );

  const tiled = win.restore !== undefined;
  const toggleFill = () => (tiled ? onRestore(app.id) : onSetFrame(app.id, zoneFrame('fill', viewport())));

  // ---- move by the title bar, snapping at the screen edges ----
  const pointerStart = useRef({ x: 0, y: 0 });
  const start = useRef({ x: 0, y: 0, width: win.width });
  const drag = usePointerDrag({
    onStart: () => {
      let x = win.x;
      let width = win.width;
      // Dragging a tiled window pops it back to its old size, still under the pointer.
      if (win.restore) {
        width = win.restore.width;
        x = pointerStart.current.x - width / 2;
        onRestore(app.id);
      }
      start.current = { x, y: win.y, width };
    },
    onMove: (dx, dy) => {
      const vp = viewport();
      const next = clampWindowPosition({ x: start.current.x + dx, y: start.current.y + dy }, start.current.width, vp);
      onMove(app.id, next.x, next.y);
      setZone(snapZoneAt({ x: pointerStart.current.x + dx, y: pointerStart.current.y + dy }, vp));
    },
    onEnd: (dragged, point) => {
      setZone(null);
      if (!dragged) return;
      const snap = snapZoneAt(point, viewport());
      if (snap) onSetFrame(app.id, zoneFrame(snap, viewport()));
    },
  });

  const preview = zone ? zoneFrame(zone, viewport()) : null;
  const tileActions: [string, () => void][] = [
    ['Fill', () => onSetFrame(app.id, zoneFrame('fill', viewport()))],
    ['Left half', () => onSetFrame(app.id, zoneFrame('left', viewport()))],
    ['Right half', () => onSetFrame(app.id, zoneFrame('right', viewport()))],
    ['Arrange all windows', onArrangeAll],
    ...(tiled ? ([['Restore size', () => onRestore(app.id)]] as [string, () => void][]) : []),
  ];
  const resize = (width: number, height: number) => onResize(app.id, width, height);
  const windowApi: WindowApi = {
    fitMedia: (media, extraHeight) => onFit(app.id, fitMediaFrame(media, extraHeight, { x: win.x, y: win.y }, viewport())),
    unfit: () => onFit(app.id, null),
  };
  const reportItem = useCallback((key: string | null) => onItemChange(app.id, key), [onItemChange, app.id]);
  const linkApi = useMemo<AppLinkApi>(() => ({ focus, reportItem, pathFor: (key) => pathFor(app.id, key) }), [focus, reportItem, pathFor, app.id]);
  const sharePath = pathFor(app.id, itemKey ?? undefined);

  return (
    <>
      {preview && (
        <div
          aria-hidden
          data-testid="snap-preview"
          className="pointer-events-none fixed rounded-xl border-2 border-[#0a84ff]/60 bg-[#0a84ff]/15 backdrop-blur-[2px]"
          style={{ left: preview.x, top: preview.y, width: preview.width, height: preview.height, zIndex: 99 + win.z }}
        />
      )}
      <div
        ref={ref}
        role="dialog"
        aria-label={app.title}
        tabIndex={-1}
        data-app-id={app.id}
        onPointerDownCapture={() => onFocus(app.id)}
        onFocusCapture={() => onFocus(app.id)}
        className="window-in fixed flex select-text flex-col overflow-hidden rounded-xl bg-[#fbfaf7] text-[#1d1c1a] shadow-[0_30px_70px_rgba(0,0,0,.28),0_0_0_1px_rgba(0,0,0,.08)] outline-none"
        style={{
          left: win.x,
          top: win.y,
          width: win.width,
          ...(win.height ? { height: win.height } : { maxHeight: `calc(100dvh - ${win.y}px - ${DOCK_RESERVED_H}px)` }),
          zIndex: 100 + win.z,
        }}
      >
        <div
          data-testid="window-titlebar"
          onPointerDown={(e) => {
            pointerStart.current = { x: e.clientX, y: e.clientY };
            drag.onPointerDown(e);
          }}
          onDoubleClick={toggleFill}
          className="window-chrome flex h-[38px] flex-none cursor-grab touch-none select-none items-center gap-2 border-b border-black/[.07] bg-[#f1efea] px-3.5"
        >
          <button
            type="button"
            aria-label="Close"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onClose(app.id)}
            className="h-3 w-3 cursor-pointer rounded-full bg-[#ee6a5f] hover:brightness-90"
          />
          <span aria-hidden className="h-3 w-3 rounded-full bg-[#d9d5cd]" />
          <span
            className="relative"
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onMouseEnter={() => {
              hoverTimer.current = setTimeout(() => setTileMenu(true), 450);
            }}
            onMouseLeave={() => {
              if (hoverTimer.current) clearTimeout(hoverTimer.current);
              setTileMenu(false);
            }}
          >
            <button
              type="button"
              aria-label={tiled ? 'Restore size' : 'Fill screen'}
              aria-haspopup="menu"
              onClick={toggleFill}
              onContextMenu={(e) => {
                e.preventDefault();
                setTileMenu(true);
              }}
              className="block h-3 w-3 cursor-pointer rounded-full bg-[#62c554] hover:brightness-90"
            />
            {tileMenu && (
              <span
                role="menu"
                aria-label="Window tiling"
                className="absolute left-0 top-4 z-10 flex w-44 flex-col rounded-lg border border-black/10 bg-[#f6f5f2]/95 p-1 text-[12px] shadow-lg backdrop-blur-xl"
              >
                {tileActions.map(([label, act]) => (
                  <button
                    key={label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setTileMenu(false);
                      act();
                    }}
                    className="cursor-pointer rounded-md px-2 py-1 text-left hover:bg-[#0a84ff] hover:text-white"
                  >
                    {label}
                  </button>
                ))}
              </span>
            )}
          </span>
          <span className="flex-1 truncate text-center text-xs font-medium text-[#6b675f]">{app.title}</span>
          {/* Keeps the title centred: as wide as the three buttons on the left. */}
          <span className="flex w-[52px] flex-none justify-end" onDoubleClick={(e) => e.stopPropagation()}>
            {sharePath && <ShareButton path={sharePath} title={app.title} look="icon" />}
          </span>
        </div>
        <MissingItemNote focus={focus} />
        <div className="app-content min-h-0 flex-1 overflow-auto bg-[#fbfaf7]">
          <WindowContext.Provider value={windowApi}>
            <AppLinkContext.Provider value={linkApi}>
              <AppContent app={app} />
            </AppLinkContext.Provider>
          </WindowContext.Provider>
        </div>
        <ResizeHandle axis="x" className="bottom-3 right-0 top-10 w-1.5 cursor-ew-resize" windowRef={ref} win={win} onResize={resize} />
        <ResizeHandle axis="y" className="bottom-0 left-3 right-3 h-1.5 cursor-ns-resize" windowRef={ref} win={win} onResize={resize} />
        <ResizeHandle axis="xy" testId="window-resize" className="bottom-0 right-0 h-4 w-4 cursor-nwse-resize" windowRef={ref} win={win} onResize={resize} />
      </div>
    </>
  );
}
