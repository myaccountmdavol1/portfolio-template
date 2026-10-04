'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FocusRequest } from '@/components/AppLinkContext';
import { useDeepLinkSync } from '@/hooks/useDeepLinkSync';
import { deepLinkParams, withDeepLink, type LinkTarget } from '@/lib/deepLink';
import { useEditor } from '@/components/editor/EditorContext';
import { Play, Search } from 'lucide-react';
import { TourPlayer } from '@/components/tour/TourPlayer';
import { useTour } from '@/components/tour/useTour';
import { PhoneLockScreen } from '@/components/screensaver/PhoneLockScreen';
import { requestSaverPreview, useScreensaver } from '@/components/screensaver/useScreensaver';
import { anyMediaPlaying, focusBlocksIdle, idleBlocker } from '@/lib/screensavers/idle';
import { tourContacts } from '@/lib/tour';
import { AchievementToast } from '@/components/AchievementToast';
import { BrightnessOverlay, ControlCenter } from '@/components/ControlCenter';
import { FaceTimeCall } from '@/components/FaceTimeCall';
import { Finale } from '@/components/finale/Finale';
import { useFinale } from '@/components/finale/useFinale';
import { SiteContext } from '@/components/SiteContext';
import { IncomingCall } from '@/components/IncomingCall';
import { Spotlight } from '@/components/Spotlight';
import { openExternal, runAction } from '@/lib/actions';
import { resolveApp, visibleAppsById } from '@/lib/apps';
import type { Rect } from '@/lib/geometry';
import { buildPhoneLayout } from '@/lib/phoneLayout';
import type { SiteData } from '@/lib/types';
import { useAppearance } from '@/hooks/useAppearance';
import { shownTiles } from '@/lib/controlCenter';
import { recordOpen } from '@/lib/openEffects';
import { trackEvent } from '@/lib/gameEvents';
import { wallpaperStyle } from '@/lib/wallpaper';
import { HomeGrid } from './HomeGrid';
import { PhoneHeadline } from './PhoneHeadline';
import { PhoneDock } from './PhoneDock';
import { PhoneSheet } from './PhoneSheet';
import { StatusBar } from './StatusBar';

interface OpenSheet {
  appId: string;
  origin: Rect | null;
  focus: FocusRequest | null;
}

/** `framed`: inside the editor's phone preview frame (no full-screen zoom). `linkSync`: the public site — the address bar follows the open app. */
export function Phone({ data, framed = false, linkSync = false }: { data: SiteData; framed?: boolean; linkSync?: boolean }) {
  const editor = useEditor();
  const { site, apps, layout } = data;
  const appsById = useMemo(() => visibleAppsById(apps), [apps]);
  const phoneLayout = useMemo(() => buildPhoneLayout(apps, layout), [apps, layout]);
  const tiles = shownTiles(site);
  const appearance = useAppearance(site.appearance, tiles.has('darkMode'));
  const finale = useFinale(data);
  const wp = wallpaperStyle(site.wallpaper, appearance.dark, 1080);
  const [controlCenter, setControlCenter] = useState(false);
  const closeControlCenter = useCallback(() => setControlCenter(false), []);
  const [sheet, setSheet] = useState<OpenSheet | null>(null);
  const [page, setPage] = useState(0);
  const [searching, setSearching] = useState(false);
  const [onFaceTime, setOnFaceTime] = useState(false);
  const [sheetItem, setSheetItem] = useState<string | null>(null);
  const focusNonce = useRef(0);
  const onItemChange = useCallback((_appId: string, itemKey: string | null) => setSheetItem(itemKey), []);
  const pathFor = useCallback(
    (appId: string, itemKey?: string) => {
      if (!linkSync) return null;
      const params = deepLinkParams(data, { appId, itemKey });
      return params ? `/${withDeepLink('', params)}` : null;
    },
    [data, linkSync],
  );

  /** `silent`: the guided tour is opening it — no achievement step, the bubble stays. */
  function openApp(ref: string, origin: Rect | null = null, focus: FocusRequest | null = null, silent = false) {
    const app = resolveApp(appsById, ref);
    if (!app) return;
    const appId = app.id;
    recordOpen(app, data, appsById.size, silent);
    if (app.type === 'link' && app.content.mode === 'open') {
      openExternal(app.content.url);
      return;
    }
    if (sheet?.appId !== appId) setSheetItem(null);
    setSheet({ appId, origin: framed ? null : origin, focus });
  }

  function openTarget(target: LinkTarget & { itemMissing?: boolean; silent?: boolean }) {
    let focus: FocusRequest | null = null;
    if (target.itemKey || target.itemMissing) {
      focusNonce.current += 1;
      focus = { itemKey: target.itemKey, missing: !!target.itemMissing, nonce: focusNonce.current };
    }
    openApp(target.appId, null, focus, target.silent);
  }

  const closeAll = useCallback(() => {
    setSheet(null);
    setSheetItem(null);
  }, []);
  const sheetId = sheet?.appId ?? null;
  const current = useMemo<LinkTarget | null>(() => (sheetId ? { appId: sheetId, itemKey: sheetItem ?? undefined } : null), [sheetId, sheetItem]);
  const tour = useTour({ data, variant: 'phone', linkSync, openTarget, closeAll });
  useDeepLinkSync({ enabled: linkSync, data, current, openTarget, closeAll, touring: tour.playing });

  // The lock screen waits while any of this is going on (read when its timer fires, so refs are enough).
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
  const saver = useScreensaver({ data, variant: 'phone', linkSync, blocked: idleBlocked });
  const locked = saver.phase !== 'off';
  // Control Center's button, so focus can go back to it after Control Center locks. The editor plays the Preview instead.
  const controlCenterButton = useRef<HTMLElement | null>(null);
  const lockFromControlCenter = () => (linkSync ? saver.lock(controlCenterButton.current) : requestSaverPreview({ kind: 'lock' }));

  const sheetApp = sheet ? appsById.get(sheet.appId) : undefined;

  return (
    <SiteContext.Provider value={{ data, openApp: (id: string) => openApp(id), openTarget, variant: 'phone' }}>
    <div
      data-layout="phone"
      data-touring={tour.playing || undefined}
      data-touring-cursor={tour.playing && tour.stopOnMove ? 'hidden' : undefined}
      data-theme={appearance.dark ? 'dark' : 'light'}
      data-wallpaper={site.wallpaper.kind === 'preset' ? site.wallpaper.preset : 'image'}
      className="fixed inset-0 flex select-none flex-col overflow-hidden"
      style={{ background: wp.background, color: wp.ink }}
    >
      <StatusBar clock24={site.clock24} ink={wp.ink} inkShadow={wp.inkShadow} onControlCenter={(button) => {
          controlCenterButton.current = button;
          setControlCenter((open) => !open);
        }}
      />

      <div
        role="region"
        aria-label="Home screen"
        className="phone-pages flex min-h-0 flex-1"
        onScroll={(e) => {
          const el = e.currentTarget;
          setPage(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
      >
        {phoneLayout.pages.map((slots, i) => (
          <HomeGrid
            key={i}
            page={i}
            slots={slots}
            appsById={appsById}
            dockEntries={layout.desktop.dock}
            ink={wp.ink}
            inkShadow={wp.inkShadow}
            onOpen={openApp}
            backdrop={i === 0 && site.headline.show && site.headline.showOnPhone ? <PhoneHeadline site={site} ink={wp.ink} inkShadow={wp.inkShadow} /> : undefined}
          />
        ))}
      </div>

      {phoneLayout.pages.length > 1 && (
        <div data-testid="page-dots" aria-hidden className="flex flex-none justify-center gap-2 py-2">
          {phoneLayout.pages.map((_, i) => (
            <span
              key={i}
              className="h-[7px] w-[7px] rounded-full"
              style={{ background: wp.ink, opacity: i === page ? 0.9 : 0.3, boxShadow: wp.inkShadow ? '0 0 2px rgba(0,0,0,.5)' : undefined }}
            />
          ))}
        </div>
      )}

      {/* Short screens (an iPhone SE): the Tour chip sits beside Search, so it doesn't take another row from the grid. */}
      <div className="flex flex-none flex-col items-center justify-center gap-1.5 pb-2 [@media(max-height:700px)]:flex-row">
        <button
          type="button"
          data-tour-search
          onClick={() => setSearching(true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-full bg-white/35 px-3.5 py-1.5 text-[13px] font-medium backdrop-blur-xl"
          style={{ color: wp.ink }}
        >
          <Search size={13} aria-hidden /> Search
        </button>
        {linkSync && tour.available && (
          <button
            type="button"
            aria-label="Take the tour"
            onClick={tour.start}
            className="flex cursor-pointer items-center gap-1 rounded-full bg-white/25 px-2.5 py-0.5 text-[12px] font-medium backdrop-blur-xl"
            style={{ color: wp.ink }}
          >
            <Play size={11} aria-hidden /> Tour
          </button>
        )}
      </div>

      {controlCenter && (
        <ControlCenter
          variant="phone"
          dark={appearance.dark}
          brightness={appearance.brightness}
          onDarkChange={appearance.setDark}
          onBrightnessChange={appearance.setBrightness}
          tiles={tiles}
          onClose={closeControlCenter}
          onLockScreen={saver.wouldLock ? lockFromControlCenter : undefined}
        />
      )}
      <BrightnessOverlay brightness={tiles.has('display') ? appearance.brightness : 1} nightShiftAllowed={tiles.has('nightShift')} />
      {!editor && apps.some((a) => a.type === 'gamecenter' && a.visible) && <AchievementToast held={tour.playing || locked} />}
      <PhoneDock appIds={phoneLayout.dock} appsById={appsById} onOpen={openApp} />

      {finale.mode && <Finale data={data} variant="phone" mode={finale.mode} onClose={finale.close} />}
      {searching && <Spotlight data={data} variant="phone" onOpen={(id) => openApp(id)} onClose={() => setSearching(false)} />}

      {sheet && sheetApp && (
        <PhoneSheet
          key={sheetApp.id}
          app={sheetApp}
          origin={sheet.origin}
          focus={sheet.focus}
          itemKey={sheetItem}
          onItemChange={onItemChange}
          pathFor={pathFor}
          onClosed={closeAll}
        />
      )}

      <TourPlayer tour={tour} variant="phone" showPill={false} contacts={tourContacts(data)} onOpenApp={(id) => openApp(id)} />

      {!editor && (
        <IncomingCall
          focusAllowed={tiles.has('focus')}
          call={site.incomingCall}
          variant="phone"
          held={tour.playing || locked}
          onRingingChange={onRingingChange}
          onAnswer={() => {
            trackEvent({ type: 'answerCall' });
            if (site.incomingCall.videoUrl) setOnFaceTime(true);
            else runAction(site.incomingCall.answerAction, (id) => openApp(id));
          }}
        />
      )}
      {onFaceTime && site.incomingCall.videoUrl && (
        <FaceTimeCall
          callerName={site.incomingCall.callerName}
          videoUrl={site.incomingCall.videoUrl}
          variant="phone"
          onEnd={() => {
            setOnFaceTime(false);
            runAction(site.incomingCall.answerAction, (id) => openApp(id));
          }}
        />
      )}
      {(saver.phase === 'lock' || saver.phase === 'unlocking') && (
        <PhoneLockScreen data={data} dark={appearance.dark} unlocking={saver.phase === 'unlocking'} isolateKeys={!saver.preview} onUnlock={saver.unlock} />
      )}
    </div>
    </SiteContext.Provider>
  );
}
