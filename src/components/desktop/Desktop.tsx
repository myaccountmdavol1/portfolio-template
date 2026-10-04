'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ContextMenu } from '@/components/editor/ContextMenu';
import { CLEAN_UP_EVENT, useEditor } from '@/components/editor/EditorContext';
import { AchievementToast } from '@/components/AchievementToast';
import { BrightnessOverlay, ControlCenter } from '@/components/ControlCenter';
import { FaceTimeCall } from '@/components/FaceTimeCall';
import { Finale } from '@/components/finale/Finale';
import { useFinale } from '@/components/finale/useFinale';
import { AppIcon } from '@/components/AppIcon';
import { startFinale } from '@/lib/gameEvents';
import { SiteContext } from '@/components/SiteContext';
import { IncomingCall } from '@/components/IncomingCall';
import { Spotlight, useSpotlightShortcut } from '@/components/Spotlight';
import { openExternal, runAction } from '@/lib/actions';
import { findAboutAppId, resolveApp, visibleAppsById } from '@/lib/apps';
import { cleanUpDesktop, moveDesktopItem } from '@/lib/editor/mutations';
import { cascadePosition, DOCK_RESERVED_H, MENU_BAR_H, tileFrames, windowWidth } from '@/lib/geometry';
import type { SiteData } from '@/lib/types';
import { useAppearance } from '@/hooks/useAppearance';
import { shownTiles } from '@/lib/controlCenter';
import { recordOpen } from '@/lib/openEffects';
import { trackEvent } from '@/lib/gameEvents';
import { wallpaperStyle } from '@/lib/wallpaper';
import type { FocusRequest } from '@/components/AppLinkContext';
import { useDeepLinkSync } from '@/hooks/useDeepLinkSync';
import { TourPlayer } from '@/components/tour/TourPlayer';
import { useTour } from '@/components/tour/useTour';
import { LockScreen } from '@/components/screensaver/LockScreen';
import { requestSaverPreview, useScreensaver } from '@/components/screensaver/useScreensaver';
import { anyMediaPlaying, focusBlocksIdle, idleBlocker } from '@/lib/screensavers/idle';
import { tourContacts } from '@/lib/tour';
import { deepLinkParams, withDeepLink, type LinkTarget } from '@/lib/deepLink';
import { initialWindowsState, topWindowId, windowsReducer } from '@/lib/windows';
import { DesktopIcon } from './DesktopIcon';
import { ClockFace } from '@/components/apps/ClockView';
import { StatusCard } from '@/components/apps/StatusView';
import { BadgeShowcase } from '@/components/apps/WalletView';
import { DesktopWidget } from './DesktopWidget';
import { Dock } from './Dock';
import { Headline } from './Headline';
import { MacWindow } from './MacWindow';
import { MenuBar } from './MenuBar';
import { StickyNote } from './StickyNote';
import type { PctPosition } from './useAreaDrag';

// The screen saver's frame (and, through it, each module) downloads only the first time it shows.
const Screensaver = dynamic(() => import('@/components/screensaver/Screensaver').then((m) => m.Screensaver), { ssr: false, loading: () => null });

/** `rec` without keys outside `keep` (the same object when nothing goes, so React can skip the update). */
function keepOnly<T>(rec: Record<string, T>, keep: Set<string>): Record<string, T> {
  const entries = Object.entries(rec).filter(([k]) => keep.has(k));
  return entries.length === Object.keys(rec).length ? rec : Object.fromEntries(entries);
}

/** `linkSync`: the public site — the address bar follows the windows and Share buttons show. Off in the editor. */
export function Desktop({ data, linkSync = false }: { data: SiteData; linkSync?: boolean }) {
  const { site, apps, layout } = data;
  const appsById = useMemo(() => visibleAppsById(apps), [apps]);
  const aboutId = findAboutAppId(apps);
  const tiles = shownTiles(site);
  const appearance = useAppearance(site.appearance, tiles.has('darkMode'));
  const finale = useFinale(data);
  const wp = wallpaperStyle(site.wallpaper, appearance.dark);
  const [controlCenter, setControlCenter] = useState(false);
  const closeControlCenter = useCallback(() => setControlCenter(false), []);
  const areaRef = useRef<HTMLDivElement>(null);
  const editor = useEditor();

  const [state, dispatch] = useReducer(windowsReducer, initialWindowsState);
  // Per window: the item a link asked it to show, and the item it reports showing now.
  const [focusReqs, setFocusReqs] = useState<Record<string, FocusRequest>>({});
  const [items, setItems] = useState<Record<string, string>>({});
  const focusNonce = useRef(0);
  const openKey = state.windows.map((w) => w.appId).sort().join('\n');
  const [seenOpenKey, setSeenOpenKey] = useState(openKey);
  if (seenOpenKey !== openKey) {
    // Closed windows forget both, so reopening one starts fresh (adjusted during render, not in an effect).
    setSeenOpenKey(openKey);
    const open = new Set(openKey.split('\n'));
    setFocusReqs((prev) => keepOnly(prev, open));
    setItems((prev) => keepOnly(prev, open));
  }
  const onItemChange = useCallback((appId: string, itemKey: string | null) => {
    setItems((prev) => {
      if ((prev[appId] ?? null) === itemKey) return prev;
      if (itemKey === null) {
        const { [appId]: _gone, ...rest } = prev;
        return rest;
      }
      return { ...prev, [appId]: itemKey };
    });
  }, []);
  const pathFor = useCallback(
    (appId: string, itemKey?: string) => {
      if (!linkSync) return null;
      const params = deepLinkParams(data, { appId, itemKey });
      return params ? `/${withDeepLink('', params)}` : null;
    },
    [data, linkSync],
  );
  const [searching, setSearching] = useState(false);
  const [onFaceTime, setOnFaceTime] = useState(false);
  const openSearch = useCallback(() => setSearching(true), []);
  useSpotlightShortcut(openSearch, !data.site.menuBar.hide?.includes('search'));
  // Positions being dragged right now. Visitors' drags stay here (never saved); in Edit mode a finished
  // drag is written to the draft and removed from here, so undo/redo always show the draft.
  const [dragPositions, setDragPositions] = useState<Record<string, PctPosition>>({});
  // Once a visitor arranges icons themselves, stop auto-tidying over their changes.
  const [visitorArranged, setVisitorArranged] = useState(false);
  const trackDrag = (id: string, pos: PctPosition) => {
    if (!editor) setVisitorArranged(true);
    setDragPositions((prev) => ({ ...prev, [id]: pos }));
  };
  const commitDrag = (id: string, pos: PctPosition) => {
    if (!editor) return;
    editor.apply((d) => moveDesktopItem(d, id, pos));
    setDragPositions(({ [id]: _done, ...rest }) => rest);
  };

  /** `silent`: the guided tour is opening it — no achievement step, the bubble stays. */
  function openApp(ref: string, silent = false) {
    const app = resolveApp(appsById, ref);
    if (!app) return;
    const appId = app.id;
    recordOpen(app, data, appsById.size, silent);
    if (app.type === 'link' && app.content.mode === 'open') {
      openExternal(app.content.url);
      return;
    }
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const width = windowWidth(app.type, viewport.width);
    const { x, y } = cascadePosition(state.openedCount, width, viewport);
    dispatch({ type: 'open', appId, x, y, width });
  }

  function openTarget(target: LinkTarget & { itemMissing?: boolean; silent?: boolean }) {
    openApp(target.appId, target.silent);
    if (!target.itemKey && !target.itemMissing) return;
    focusNonce.current += 1;
    const req: FocusRequest = { itemKey: target.itemKey, missing: !!target.itemMissing, nonce: focusNonce.current };
    setFocusReqs((prev) => ({ ...prev, [target.appId]: req }));
  }

  const top = topWindowId(state);
  const topItem = top ? items[top] : undefined;
  const current = useMemo<LinkTarget | null>(() => (top ? { appId: top, itemKey: topItem } : null), [top, topItem]);
  const closeAll = useCallback(() => dispatch({ type: 'closeAll' }), []);
  const tour = useTour({ data, variant: 'desktop', linkSync, openTarget, closeAll });
  useDeepLinkSync({ enabled: linkSync, data, current, openTarget, closeAll, touring: tour.playing });

  // The screen saver waits while any of this is going on (read when its timer fires, so refs are enough).
  const callRinging = useRef(false);
  const onRingingChange = useCallback((ringing: boolean) => {
    callRinging.current = ringing;
  }, []);
  const busy = useRef({ tour: false, faceTime: false, finale: false, spotlight: false, controlCenter: false, editor: false });
  useEffect(() => {
    busy.current = { tour: tour.playing || tour.phase === 'ended', faceTime: onFaceTime, finale: finale.mode !== null, spotlight: searching, controlCenter, editor: !!editor };
  });
  const idleBlocked = useCallback(
    () =>
      idleBlocker({
        ...busy.current,
        call: callRinging.current,
        mediaPlaying: anyMediaPlaying(Array.from(document.querySelectorAll<HTMLMediaElement>('video, audio'))),
        typing: focusBlocksIdle(document.activeElement),
        hidden: document.hidden,
      }) !== null,
    [],
  );
  const saver = useScreensaver({ data, variant: 'desktop', linkSync, blocked: idleBlocked });
  const locked = saver.phase !== 'off';
  // Control Center's button, so focus can go back to it after Control Center starts the screen saver or locks.
  const controlCenterButton = useRef<HTMLElement | null>(null);
  // The editor has no real start or lock: the same buttons play the Previews.
  const startFromControlCenter = () => (linkSync ? saver.start(controlCenterButton.current) : requestSaverPreview({ kind: 'screensaver' }));
  const lockFromControlCenter = () => (linkSync ? saver.lock(controlCenterButton.current) : requestSaverPreview({ kind: 'lock' }));
  const startFromMenu = linkSync ? saver.start : () => requestSaverPreview({ kind: 'screensaver' });
  const lockFromMenu = linkSync ? saver.lock : () => requestSaverPreview({ kind: 'lock' });

  /** The desktop's size and where widgets sit on it, for Clean Up. */
  const measure = useCallback(() => {
    const area = areaRef.current;
    if (!area) return null;
    const box = area.getBoundingClientRect();
    const obstacles = Array.from(area.querySelectorAll<HTMLElement>('[data-testid="sticky-note"], [data-testid="desktop-widget"]')).map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left - box.left, top: r.top - box.top, width: r.width, height: r.height };
    });
    return { size: { width: box.width, height: box.height }, obstacles };
  }, []);

  // Edit mode: Clean Up lines the saved icons up around the widgets.
  useEffect(() => {
    if (!editor) return;
    const onCleanUp = (e: Event) => {
      const m = measure();
      if (!m) return;
      const sortBy = (e as CustomEvent<'position' | 'name'>).detail;
      editor.apply((d) => cleanUpDesktop(d, m.size, m.obstacles, sortBy));
    };
    window.addEventListener(CLEAN_UP_EVENT, onCleanUp);
    return () => window.removeEventListener(CLEAN_UP_EVENT, onCleanUp);
  }, [editor, measure]);

  // Visitors: tidying only rearranges their own view (nothing is saved).
  const [visitorMenu, setVisitorMenu] = useState<{ x: number; y: number } | null>(null);
  const closeVisitorMenu = useCallback(() => setVisitorMenu(null), []);
  // The screen saver or lock comes up (idle, the hot corner, ⌥⌘L): open menus and Control Center close rather than
  // waiting behind it. Adjusted while rendering, not in an effect.
  const [wasLocked, setWasLocked] = useState(locked);
  if (locked !== wasLocked) {
    setWasLocked(locked);
    if (locked) {
      setVisitorMenu(null);
      setControlCenter(false);
    }
  }
  const tidyForVisitor = useCallback(
    (sortBy: 'position' | 'name') => {
      const m = measure();
      if (!m) return;
      const tidy = cleanUpDesktop(data, m.size, m.obstacles, sortBy);
      setDragPositions(Object.fromEntries(tidy.layout.desktop.icons.map((p) => [p.appId, { xPct: p.xPct, yPct: p.yPct }])));
    },
    [data, measure],
  );

  // Visitors on a smaller screen than the owner designed for: if icons would overlap, tidy automatically.
  useEffect(() => {
    if (editor || visitorArranged) return;
    const check = () => {
      const m = measure();
      if (!m) return;
      const px = layout.desktop.icons.map((p) => ({ x: (p.xPct / 100) * m.size.width, y: (p.yPct / 100) * m.size.height }));
      const overlaps = px.some((a, i) => px.some((b, j) => j > i && Math.abs(a.x - b.x) < 96 && Math.abs(a.y - b.y) < 100));
      if (overlaps) tidyForVisitor('position');
      else setDragPositions({});
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [editor, visitorArranged, layout.desktop.icons, measure, tidyForVisitor]);

  // Esc closes the front window.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch({ type: 'closeTop' });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const openIds = new Set(state.windows.map((w) => w.appId));

  return (
    <SiteContext.Provider value={{ data, openApp, openTarget, variant: 'desktop' }}>
    <div
      data-layout="desktop"
      data-theme={appearance.dark ? 'dark' : 'light'}
      data-golden={finale.golden}
      data-touring={tour.playing || undefined}
      data-touring-cursor={tour.playing && tour.stopOnMove ? 'hidden' : undefined}
      data-wallpaper={site.wallpaper.kind === 'preset' ? site.wallpaper.preset : 'image'}
      className="fixed inset-0 select-none overflow-hidden"
      style={{ background: wp.background, color: wp.ink }}
    >
      <MenuBar
        site={site}
        ink={wp.ink}
        menuBg={wp.menuBg}
        onOwnerClick={() => {
          if (aboutId) openApp(aboutId);
        }}
        onAction={(action) => runAction(action, openApp)}
        onSearch={openSearch}
        onControlCenter={(button) => {
          controlCenterButton.current = button;
          setControlCenter((open) => !open);
        }}
        onTour={linkSync && tour.available ? tour.start : undefined}
        onStartScreenSaver={saver.wouldStart ? startFromMenu : undefined}
        onLockScreen={saver.wouldLock ? lockFromMenu : undefined}
        locked={locked}
      />
      <Headline site={site} ink={wp.ink} inkShadow={wp.inkShadow} />

      <div
        ref={areaRef}
        data-testid="desktop-area"
        className="absolute inset-x-0"
        style={{ top: MENU_BAR_H, bottom: DOCK_RESERVED_H }}
        onClick={(e) => {
          // Edit mode: clicking the bare wallpaper clears the selection, or (with nothing selected) opens the wallpaper picker.
          if (!editor || e.target !== e.currentTarget) return;
          if (editor.selection) editor.select(null);
          else editor.openWallpaperPicker();
        }}
        onContextMenu={(e) => {
          if (e.target !== e.currentTarget) return;
          e.preventDefault();
          if (editor) editor.openMenu({ x: e.clientX, y: e.clientY, target: { kind: 'desktop' } });
          else setVisitorMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        {layout.desktop.icons.map((p) => {
          const app = appsById.get(p.appId);
          if (!app) return null;
          // A Wallet set to “Show as a widget” sits where its icon would, as a badge showcase.
          if (app.type === 'wallet' && app.content.showAsWidget) {
            return (
              <DesktopWidget key={p.appId} app={app} position={dragPositions[p.appId] ?? p} size="small" areaRef={areaRef} onOpen={openApp} onMove={trackDrag} onMoveEnd={commitDrag}>
                <BadgeShowcase app={app} />
              </DesktopWidget>
            );
          }
          return (
            <DesktopIcon
              key={p.appId}
              app={app}
              position={dragPositions[p.appId] ?? p}
              areaRef={areaRef}
              labelBg={wp.labelBg}
              labelInk={wp.labelInk}
              accent={site.accent}
              onOpen={openApp}
              onMove={trackDrag}
              onMoveEnd={commitDrag}
            />
          );
        })}
        {finale.golden && !editor && (
          <button
            type="button"
            aria-label="Top Secret"
            onClick={() => startFinale('reward')}
            className="absolute bottom-3 right-3 z-10 flex w-[104px] cursor-default flex-col items-center gap-2 rounded-md p-1"
          >
            <span className="flex h-[60px] w-[72px] items-end justify-center drop-shadow-[0_0_12px_rgba(255,214,10,.7)]">
              <AppIcon icon={{ kind: 'builtin', name: 'folder' }} size={72} variant="desktop" />
            </span>
            <span className="rounded px-1.5 py-0.5 text-center text-xs font-semibold leading-tight" style={{ background: wp.labelBg, color: wp.labelInk, textShadow: wp.inkShadow }}>
              🏆 Top Secret
            </span>
          </button>
        )}
        {layout.desktop.widgets.map((p) => {
          const app = appsById.get(p.appId);
          if (!app) return null;
          if (app.type === 'clock' || app.type === 'status') {
            return (
              <DesktopWidget
                key={p.appId}
                app={app}
                position={dragPositions[p.appId] ?? p}
                size={p.size ?? 'small'}
                areaRef={areaRef}
                onOpen={openApp}
                onMove={trackDrag}
                onMoveEnd={commitDrag}
              >
                {app.type === 'clock' ? <ClockFace app={app} size="widget" /> : <StatusCard app={app} size="widget" />}
              </DesktopWidget>
            );
          }
          if (app.type !== 'note') return null; // other types are icons, not widgets
          return (
            <StickyNote
              key={p.appId}
              app={app}
              position={dragPositions[p.appId] ?? p}
              size={p.size}
              areaRef={areaRef}
              onMove={trackDrag}
              onMoveEnd={commitDrag}
            />
          );
        })}
      </div>

      {state.windows.map((win) => {
        const app = appsById.get(win.appId);
        if (!app) return null;
        return (
          <MacWindow
            key={win.appId}
            app={app}
            win={win}
            onFocus={(id) => dispatch({ type: 'focus', appId: id })}
            onClose={(id) => dispatch({ type: 'close', appId: id })}
            onMove={(id, x, y) => dispatch({ type: 'move', appId: id, x, y })}
            onResize={(id, width, height) => dispatch({ type: 'resize', appId: id, width, height })}
            onSetFrame={(id, frame) => dispatch({ type: 'setFrame', appId: id, frame })}
            onRestore={(id) => dispatch({ type: 'restore', appId: id })}
            onFit={(id, frame) => dispatch(frame ? { type: 'fit', appId: id, frame } : { type: 'unfit', appId: id })}
            focus={focusReqs[win.appId] ?? null}
            itemKey={items[win.appId] ?? null}
            onItemChange={onItemChange}
            pathFor={pathFor}
            onArrangeAll={() =>
              dispatch({ type: 'arrange', frames: tileFrames(state.windows.length, { width: window.innerWidth, height: window.innerHeight }) })
            }
          />
        );
      })}

      {finale.mode && <Finale data={data} variant="desktop" mode={finale.mode} onClose={finale.close} />}
      {visitorMenu && (
        <ContextMenu
          x={visitorMenu.x}
          y={visitorMenu.y}
          label="Desktop"
          items={[
            { id: 'position', label: 'Clean Up' },
            { id: 'name', label: 'Clean Up By Name' },
          ]}
          onClose={closeVisitorMenu}
          onPick={(id) => {
            setVisitorArranged(true);
            tidyForVisitor(id === 'name' ? 'name' : 'position');
          }}
        />
      )}
      {searching && <Spotlight data={data} variant="desktop" onOpen={openApp} onClose={() => setSearching(false)} />}
      {controlCenter && (
        <ControlCenter
          variant="desktop"
          dark={appearance.dark}
          brightness={appearance.brightness}
          onDarkChange={appearance.setDark}
          onBrightnessChange={appearance.setBrightness}
          tiles={tiles}
          onClose={closeControlCenter}
          onStartScreenSaver={saver.wouldStart ? startFromControlCenter : undefined}
          onLockScreen={saver.wouldLock ? lockFromControlCenter : undefined}
        />
      )}
      <BrightnessOverlay brightness={tiles.has('display') ? appearance.brightness : 1} nightShiftAllowed={tiles.has('nightShift')} />
      {!editor && apps.some((a) => a.type === 'gamecenter' && a.visible) && <AchievementToast held={tour.playing || locked} />}
      <Dock entries={layout.desktop.dock} appsById={appsById} openIds={openIds} onOpen={openApp} />
      <TourPlayer
        tour={tour}
        variant="desktop"
        showPill={linkSync && site.tour?.showButton !== false && state.windows.length === 0}
        contacts={tourContacts(data)}
        onOpenApp={openApp}
      />
      {!editor && (
        <IncomingCall
          focusAllowed={tiles.has('focus')}
          call={site.incomingCall}
          variant="desktop"
          held={tour.playing || locked}
          onRingingChange={onRingingChange}
          onAnswer={() => {
            trackEvent({ type: 'answerCall' });
            if (site.incomingCall.videoUrl) setOnFaceTime(true);
            else runAction(site.incomingCall.answerAction, openApp);
          }}
        />
      )}
      {onFaceTime && site.incomingCall.videoUrl && (
        <FaceTimeCall
          callerName={site.incomingCall.callerName}
          videoUrl={site.incomingCall.videoUrl}
          variant="desktop"
          onEnd={() => {
            setOnFaceTime(false);
            runAction(site.incomingCall.answerAction, openApp);
          }}
        />
      )}
      {saver.phase === 'saver' && saver.moduleId && <Screensaver data={data} moduleId={saver.moduleId} onCorner={saver.corner} />}
      {(saver.phase === 'lock' || saver.phase === 'unlocking') && (
        <LockScreen data={data} dark={appearance.dark} unlocking={saver.phase === 'unlocking'} isolateKeys={!saver.preview} onUnlock={saver.unlock} />
      )}
    </div>
    </SiteContext.Provider>
  );
}
