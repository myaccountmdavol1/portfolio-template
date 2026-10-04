'use client';

import { Ellipsis, Image as ImageIcon, Plus, RotateCcw, Settings2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Desktop } from '@/components/desktop/Desktop';
import { Phone } from '@/components/phone/Phone';
import { useIsPhone } from '@/hooks/useIsPhone';
import { catalogIconUrl } from '@/lib/iconCatalog';
import { appMenuEntries, dockMenuEntries, phoneMenuEntries, sizeFromAction, type AppAction, type DockAction } from '@/lib/editor/appMenu';
import type { EditorBackend, UploadFolder } from '@/lib/editor/backend';
import { startsInEditMode } from '@/lib/editor/gate';
import {
  addApp,
  addDockLink,
  addDockSeparator,
  deleteApp,
  duplicateApp,
  isInDock,
  isOnDesktop,
  removeDockEntry,
  setInDock,
  setDesktopWidgetSize,
  setOnDesktop,
  updateApp,
  updateAppContent,
  updateDockEntry,
  updateSite,
} from '@/lib/editor/mutations';
import { isInPhoneDock, movePhoneItem, resetPhoneLayout, setPhoneWidgetSize } from '@/lib/editor/phoneMutations';
import { PHONE_DOCK_MAX } from '@/lib/phoneLayout';
import { APP_TYPE_LABELS, APP_TYPES, newAppId } from '@/lib/editor/starters';
import type { AppType, IconSpec, SiteData } from '@/lib/types';
import { ContextMenu } from './ContextMenu';
import { EditorContext, requestCleanUp, type EditorApi, type IconTarget, type MenuRequest, type Selection } from './EditorContext';
import { EditorToolbar, toolbarButton, type Preview } from './EditorToolbar';
import { IconPicker } from './IconPicker';
import { Inspector, INSPECTOR_W } from './Inspector';
import { PhoneFrame } from './PhoneFrame';
import { useDraft } from './useDraft';
import { MediaLibrary } from './MediaLibrary';
import { VersionHistory } from './VersionHistory';
import { WallpaperPicker } from './WallpaperPicker';

interface EditorAppProps {
  backend: EditorBackend;
  published: SiteData;
  initialIsPhone: boolean;
  /** null in local mode (nothing to sign out of). */
  onSignOut: (() => void) | null;
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

export function EditorApp({ backend, published, initialIsPhone, onSignOut }: EditorAppProps) {
  const router = useRouter();
  const draft = useDraft(backend, published);
  const isPhoneDevice = useIsPhone(initialIsPhone);
  const [editing, setEditing] = useState(() => startsInEditMode(window.location.search));
  const [preview, setPreview] = useState<Preview>(() => (initialIsPhone ? 'phone' : 'desktop'));
  const [selection, setSelection] = useState<Selection | null>(null);
  const [menu, setMenu] = useState<MenuRequest | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [addMenu, setAddMenu] = useState<{ x: number; y: number } | null>(null);
  const closeAddMenu = useCallback(() => setAddMenu(null), []);
  const [picker, setPicker] = useState<
    | { kind: 'icon'; target: IconTarget }
    | { kind: 'wallpaper' }
    | { kind: 'versions' }
    | { kind: 'media'; folder?: UploadFolder; onPick?: (url: string) => void }
    | null
  >(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  const ready = draft.loadState === 'ready';
  const active = editing && ready;
  const { undo, redo } = draft;

  // ⌘Z / ⇧⌘Z (Ctrl on Windows), except while typing in a field.
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z' || isTypingTarget(e.target)) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, undo, redo]);

  const { apply, data } = draft;

  // Publish state is tied to the exact draft that was published, so any later edit shows "Publish" again.
  const [publishing, setPublishing] = useState<'idle' | 'publishing' | 'error'>('idle');
  const [publishedDraft, setPublishedDraft] = useState<SiteData | null>(null);
  const isPublished = publishedDraft !== null && publishedDraft === data;

  async function publish() {
    if (
      !window.confirm(
        'Publish your draft?\n\nThis publishes everything at once — the desktop and phone layouts, all apps, and site settings — no matter which preview you’re in. Everyone visiting your site will see the changes.',
      )
    )
      return;
    const snapshot = data;
    setPublishing('publishing');
    try {
      await draft.flush();
      await backend.publish(snapshot);
      setPublishedDraft(snapshot);
      setPublishing('idle');
      router.refresh(); // re-read published data on the server, so Edit off shows the new live site
    } catch (err) {
      console.error('Publish failed', err);
      setPublishing('error');
    }
  }

  const [moreMenu, setMoreMenu] = useState<{ x: number; y: number } | null>(null);
  const closeMoreMenu = useCallback(() => setMoreMenu(null), []);
  const moreItems = [
    { id: 'cleanUp', label: 'Clean Up Desktop Icons' },
    { id: 'media', label: 'Media library…' },
    { id: 'versions', label: 'Version history…' },
    { id: 'discard', label: 'Discard draft changes…', danger: true },
    { id: 'leave', label: onSignOut ? 'Sign out' : 'Leave the editor' },
  ];
  function pickMore(id: string) {
    if (id === 'cleanUp') {
      setPreview('desktop');
      window.setTimeout(() => requestCleanUp('position'), 0);
    }
    if (id === 'versions') setPicker({ kind: 'versions' });
    if (id === 'media') setPicker({ kind: 'media' });
    if (id === 'discard' && window.confirm('Throw away your draft and go back to what’s live? You can undo this.')) {
      apply(() => published);
      setSelection(null);
    }
    if (id === 'leave') {
      if (onSignOut) onSignOut();
      else window.location.assign('/');
    }
  }

  const runAppAction = useCallback(
    (action: AppAction, appId: string, surface: 'desktop' | 'phone' = 'desktop') => {
      const app = data.apps.find((a) => a.id === appId);
      if (!app) return;
      const size = sizeFromAction(action);
      if (size) {
        apply((d) => (surface === 'phone' ? setPhoneWidgetSize(d, appId, size) : setDesktopWidgetSize(d, appId, size)));
        return;
      }
      switch (action) {
        case 'rename':
          setRenamingId(appId);
          break;
        case 'changeIcon':
          setPicker({ kind: 'icon', target: { kind: 'app', appId } });
          break;
        case 'duplicate': {
          const id = newAppId(app.type, data.apps.map((a) => a.id));
          apply((d) => duplicateApp(d, appId, id));
          setSelection({ kind: 'app', appId: id });
          break;
        }
        case 'toggleDesktop':
          apply((d) => setOnDesktop(d, appId, !isOnDesktop(d, appId)));
          break;
        case 'togglePhoneDock':
          apply((d) =>
            isInPhoneDock(d, appId)
              ? movePhoneItem(d, appId, { kind: 'page', page: 0, index: Number.MAX_SAFE_INTEGER })
              : movePhoneItem(d, appId, { kind: 'dock', index: PHONE_DOCK_MAX }),
          );
          break;
        case 'newPhonePage':
          apply((d) => movePhoneItem(d, appId, { kind: 'newPage' }));
          break;
        case 'toggleDock':
          apply((d) => setInDock(d, appId, !isInDock(d, appId)));
          break;
        case 'hide':
          apply((d) => updateApp(d, appId, { visible: false }));
          setSelection(null);
          break;
        case 'delete':
          if (window.confirm(`Delete “${app.title}”? You can undo this.`)) {
            apply((d) => deleteApp(d, appId));
            setSelection(null);
          }
          break;
      }
    },
    [apply, data],
  );

  const api = useMemo<EditorApi>(
    () => ({
      data,
      apply,
      selection,
      select: setSelection,
      upload: backend.upload,
      chatLogs: backend.chatLogs,
      guestbook: backend.guestbook,
      hallOfFame: backend.hallOfFame,
      inbox: backend.inbox,
      openMenu: setMenu,
      renamingId,
      setRenamingId,
      openIconPicker: (target) => setPicker({ kind: 'icon', target }),
      openWallpaperPicker: () => setPicker({ kind: 'wallpaper' }),
      openMediaLibrary: (options) => setPicker({ kind: 'media', ...options }),
      runAppAction,
    }),
    [data, apply, selection, backend, renamingId, runAppAction],
  );

  const runDockAction = useCallback(
    (action: DockAction, index: number) => {
      if (action === 'changeIcon') setPicker({ kind: 'icon', target: { kind: 'dock', index } });
      if (action === 'removeDock') {
        apply((d) => removeDockEntry(d, index));
        setSelection(null);
      }
    },
    [apply],
  );

  const addItems = [
    ...APP_TYPES.flatMap((type) =>
      type === 'link'
        ? [
            { id: type, label: APP_TYPE_LABELS[type] },
            { id: 'preset:canva', label: 'Canva design (embed)' },
            { id: 'preset:slides', label: 'Google Slides (embed)' },
          ]
        : [{ id: type, label: APP_TYPE_LABELS[type] }],
    ),
    { id: 'dockLink', label: 'Dock link' },
    { id: 'dockSeparator', label: 'Dock separator' },
  ];

  function addItem(id: string) {
    if (id === 'dockLink') {
      const index = data.layout.desktop.dock.length;
      apply((d) => addDockLink(d, { label: 'New link', url: 'https://example.com/', iconUrl: catalogIconUrl('safari') }));
      setSelection({ kind: 'dock', index });
    } else if (id === 'preset:canva' || id === 'preset:slides') {
      // A Link app set up to embed: the right icon and name, waiting for the share link.
      const appId = newAppId('link', data.apps.map((a) => a.id));
      const canva = id === 'preset:canva';
      apply((d) => {
        const added = updateApp(addApp(d, 'link', appId), appId, {
          title: canva ? 'Canva Design' : 'Presentation',
          icon: { kind: 'catalog', slug: canva ? 'canva' : 'google-slides' },
        });
        return updateAppContent(added, appId, { url: '', mode: 'embed' });
      });
      setSelection({ kind: 'app', appId });
    } else if (id === 'dockSeparator') {
      apply(addDockSeparator);
    } else {
      const type = id as AppType;
      const appId = newAppId(type, data.apps.map((a) => a.id));
      apply((d) => addApp(d, type, appId));
      setSelection({ kind: 'app', appId });
    }
  }

  function pickIcon(target: IconTarget, icon: IconSpec) {
    if (target.kind === 'app') {
      apply((d) => updateApp(d, target.appId, { icon }));
    } else if (target.kind === 'menuBarLogo') {
      apply((d) => updateSite(d, { menuBar: { ...d.site.menuBar, logo: { kind: 'icon', icon } } }));
    } else {
      const iconUrl = icon.kind === 'catalog' ? catalogIconUrl(icon.slug) : icon.kind === 'image' ? icon.url : undefined;
      apply((d) => {
        const entry = d.layout.desktop.dock[target.index];
        return entry?.kind === 'url' ? updateDockEntry(d, target.index, { ...entry, iconUrl }) : d;
      });
    }
    setPicker(null);
  }

  const pickerTarget = picker?.kind === 'icon' ? picker.target : null;
  // Everything the draft and the live site point at, so the media library can mark files “In use”.
  const usedUrls = picker?.kind === 'media' ? JSON.stringify([data, published]) : '';
  const menuLogo = data.site.menuBar.logo;
  const pickerIcon =
    pickerTarget?.kind === 'app'
      ? (data.apps.find((a) => a.id === pickerTarget.appId)?.icon ?? null)
      : pickerTarget?.kind === 'menuBarLogo' && menuLogo?.kind === 'icon'
        ? menuLogo.icon
        : null;

  const menuDockEntry = menu?.target.kind === 'dock' ? data.layout.desktop.dock[menu.target.index] : undefined;
  const desktopMenuItems = [
    { id: 'cleanUp', label: 'Clean Up' },
    { id: 'cleanUpByName', label: 'Clean Up By Name' },
    { id: 'wallpaper', label: 'Change Wallpaper…' },
  ];
  const menuItems =
    menu?.target.kind === 'desktop'
      ? desktopMenuItems
      : menu?.target.kind === 'app'
      ? menu.surface === 'phone'
        ? phoneMenuEntries(data, menu.target.appId)
        : appMenuEntries(data, menu.target.appId)
      : menuDockEntry
        ? dockMenuEntries(menuDockEntry)
        : [];

  const shown = active ? draft.data : published;
  const inspectorOpen = active && selection !== null;
  const framed = preview === 'phone' && !isPhoneDevice;
  const site = preview === 'phone' ? <Phone data={shown} framed={framed} /> : <Desktop data={shown} />;

  return (
    <>
      <div
        data-testid="editor-stage"
        className="fixed inset-y-0 left-0 overflow-hidden"
        style={{ right: inspectorOpen && !isPhoneDevice ? INSPECTOR_W : 0, transform: 'translateZ(0)' }}
      >
        <EditorContext.Provider value={active ? api : null}>{framed ? <PhoneFrame>{site}</PhoneFrame> : site}</EditorContext.Provider>
      </div>
      <EditorToolbar
        editing={editing}
        onEditingChange={(on) => {
          setEditing(on);
          setSelection(null);
          setMenu(null);
        }}
        preview={preview}
        onPreviewChange={setPreview}
        canUndo={draft.canUndo}
        canRedo={draft.canRedo}
        onUndo={undo}
        onRedo={redo}
        saveStatus={draft.saveStatus}
        loadState={draft.loadState}
        onRetryLoad={draft.retryLoad}
      >
        <button
          type="button"
          aria-label="Add"
          aria-haspopup="menu"
          aria-expanded={addMenu !== null}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setAddMenu(addMenu ? null : { x: r.left, y: r.bottom + 8 });
          }}
          className={toolbarButton}
        >
          <Plus size={15} aria-hidden /> <span className="hidden sm:inline">Add</span>
        </button>
        <button type="button" aria-label="Wallpaper" onClick={() => setPicker({ kind: 'wallpaper' })} className={toolbarButton}>
          <ImageIcon size={14} aria-hidden /> <span className="hidden sm:inline">Wallpaper</span>
        </button>
        <button
          type="button"
          aria-label="Site"
          aria-pressed={selection?.kind === 'site'}
          onClick={() => setSelection(selection?.kind === 'site' ? null : { kind: 'site' })}
          className={toolbarButton}
        >
          <Settings2 size={14} aria-hidden /> <span className="hidden sm:inline">Site</span>
        </button>
        <button
          type="button"
          aria-label="More"
          aria-haspopup="menu"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setMoreMenu(moreMenu ? null : { x: r.left, y: r.bottom + 8 });
          }}
          className={toolbarButton}
        >
          <Ellipsis size={15} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => void publish()}
          disabled={publishing === 'publishing' || isPublished}
          className="ml-1 inline-flex h-8 flex-none cursor-pointer items-center whitespace-nowrap rounded-full bg-[#0a84ff] px-3.5 text-xs font-semibold text-white hover:bg-[#0071e3] disabled:cursor-default disabled:bg-[#0a84ff]/50"
        >
          {publishing === 'publishing' ? 'Publishing…' : isPublished ? 'Published ✓' : 'Publish'}
        </button>
        {publishing === 'error' && (
          <span role="alert" className="px-1 text-xs text-[#ffb4ab]">
            Publish failed — try again
          </span>
        )}
        {preview === 'phone' && data.layout.phone.overrides && (
          <button
            aria-label="Reset phone layout"
             type="button" onClick={() => apply(resetPhoneLayout)} className={toolbarButton} title="Go back to the automatic phone layout">
            <RotateCcw size={14} aria-hidden /> <span className="hidden sm:inline">Reset layout</span>
          </button>
        )}
      </EditorToolbar>
      {active && (
        <EditorContext.Provider value={api}>
          <Inspector fullScreen={isPhoneDevice} />
          {picker?.kind === 'icon' && (
            <IconPicker current={pickerIcon} onClose={() => setPicker(null)} onPick={(icon) => pickIcon(picker.target, icon)} />
          )}
          {picker?.kind === 'media' && (
            <MediaLibrary
              media={backend.media}
              upload={backend.upload}
              folder={picker.folder}
              onPick={
                picker.onPick
                  ? (url) => {
                      picker.onPick?.(url);
                      setPicker(null);
                    }
                  : undefined
              }
              inUse={(url) => usedUrls.includes(url)}
              onClose={() => setPicker(null)}
            />
          )}
          {picker?.kind === 'versions' && (
            <VersionHistory
              load={backend.versions.list}
              onClose={() => setPicker(null)}
              onRestore={(version) => {
                apply(() => version);
                setSelection(null);
                setPicker(null);
              }}
            />
          )}
          {picker?.kind === 'wallpaper' && (
            <WallpaperPicker
              current={data.site.wallpaper}
              onClose={() => setPicker(null)}
              onPick={(wallpaper) => {
                apply((d) => updateSite(d, { wallpaper }));
                setPicker(null);
              }}
            />
          )}
        </EditorContext.Provider>
      )}
      {active && moreMenu && (
        <ContextMenu x={moreMenu.x} y={moreMenu.y} label="More" items={moreItems} onClose={closeMoreMenu} onPick={pickMore} />
      )}
      {active && addMenu && (
        <ContextMenu x={addMenu.x} y={addMenu.y} label="Add" items={addItems} onClose={closeAddMenu} onPick={addItem} />
      )}
      {active && menu && menuItems.length > 0 && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          label="Actions"
          items={menuItems}
          onClose={closeMenu}
          onPick={(id) => {
            if (menu.target.kind === 'app') runAppAction(id as AppAction, menu.target.appId, menu.surface);
            if (menu.target.kind === 'dock') runDockAction(id as DockAction, menu.target.index);
            if (menu.target.kind === 'desktop') {
              if (id === 'wallpaper') setPicker({ kind: 'wallpaper' });
              else requestCleanUp(id === 'cleanUpByName' ? 'name' : 'position');
            }
          }}
        />
      )}
    </>
  );
}
