'use client';

import { ChevronDown, Search } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { AppIcon } from '@/components/AppIcon';
import { ContextMenu } from '@/components/editor/ContextMenu';
import { useEditor } from '@/components/editor/EditorContext';
import { useClock } from '@/hooks/useClock';
import { formatMenuDate, formatTime } from '@/lib/format';
import { MENU_BAR_H } from '@/lib/geometry';
import type { SiteSettings } from '@/lib/types';

interface MenuBarProps {
  site: SiteSettings;
  ink: string;
  menuBg: string;
  onOwnerClick: () => void;
  onAction: (action: string) => void;
  onSearch: () => void;
  /** Gets the Control Center button, so focus can come back to it later. */
  onControlCenter: (button: HTMLElement) => void;
  /** Public site with a tour: a "Tour" item after the owner's items. */
  onTour?: () => void;
  /** Public site with the screen saver on: "Start Screen Saver" in the menu under the logo. Gets the menu's button (focus returns there). */
  onStartScreenSaver?: (returnFocus: HTMLElement | null) => void;
  /** Public site with the lock screen on: "Lock Screen ⌥⌘L" in the same menu. */
  onLockScreen?: (returnFocus: HTMLElement | null) => void;
  /** The screen saver or lock screen is up: the System menu closes (it never sits on top, or waits behind). */
  locked?: boolean;
}

export function MenuBar({ site, ink, menuBg, onOwnerClick, onAction, onSearch, onControlCenter, onTour, onStartScreenSaver, onLockScreen, locked = false }: MenuBarProps) {
  const now = useClock();
  const editor = useEditor();
  const off = new Set(site.menuBar.hide ?? []);
  const logo = site.menuBar.logo ?? { kind: 'dot' };
  const selected = editor?.selection?.kind === 'site';
  // Like the Apple menu: the logo opens a small menu with the screen saver and lock screen.
  const [systemMenu, setSystemMenu] = useState<{ x: number; y: number } | null>(null);
  const closeSystemMenu = useCallback(() => setSystemMenu(null), []);
  const systemButton = useRef<HTMLButtonElement>(null);
  // Locked by idle, the hot corner or ⌥⌘L with the menu open: it closes (adjusted while rendering, not in an effect).
  const [wasLocked, setWasLocked] = useState(locked);
  if (locked !== wasLocked) {
    setWasLocked(locked);
    if (locked) setSystemMenu(null);
  }
  const systemItems = [...(onStartScreenSaver ? [{ id: 'saver', label: 'Start Screen Saver' }] : []), ...(onLockScreen ? [{ id: 'lock', label: 'Lock Screen ⌥⌘L' }] : [])];
  // The button toggles it (the menu doesn't count a press on its button as outside).
  const toggleSystemMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setSystemMenu((open) => (open ? null : { x: r.left, y: MENU_BAR_H }));
  };
  const logoMark =
    logo.kind === 'dot' ? (
      <span aria-hidden className="h-3 w-3 flex-none rounded-full" style={{ background: site.accent }} />
    ) : logo.kind === 'icon' ? (
      <span aria-hidden className="flex-none">
        <AppIcon icon={logo.icon} size={18} variant="tile" />
      </span>
    ) : null;
  return (
    <>
    <header
      // Edit mode: clicking the bar itself (not one of its buttons) opens Site settings, where it's edited.
      onClick={(e) => {
        if (editor && !(e.target as HTMLElement).closest('button')) editor.select({ kind: 'site' });
      }}
      title={editor ? 'Menu bar — click to edit in Site settings' : undefined}
      className={`absolute inset-x-0 top-0 z-[9000] flex items-center justify-between gap-3 whitespace-nowrap px-4 text-[13px] backdrop-blur-[18px] ${editor ? 'cursor-pointer hover:outline hover:outline-2 hover:-outline-offset-2 hover:outline-[#0a84ff]/60' : ''} ${selected ? 'outline outline-2 -outline-offset-2 outline-[#0a84ff]' : ''}`}
      style={{ height: MENU_BAR_H, background: menuBg, color: ink, borderBottom: '1px solid rgba(0,0,0,.07)' }}
    >
      {/* Narrow windows: the name shortens with an ellipsis and the menu items give way before anything wraps. */}
      <nav aria-label="Menu bar" className="flex min-w-0 items-center gap-5 overflow-hidden">
        {logoMark && systemItems.length > 0 ? (
          <button
            ref={systemButton}
            type="button"
            aria-label="System menu"
            aria-haspopup="menu"
            aria-expanded={systemMenu !== null}
            onClick={toggleSystemMenu}
            className="flex flex-none cursor-pointer items-center rounded p-0.5 hover:bg-black/10"
          >
            {logoMark}
          </button>
        ) : (
          logoMark
        )}
        {!off.has('name') && (
          <button type="button" onClick={onOwnerClick} className="min-w-0 max-w-[40vw] cursor-pointer truncate font-semibold hover:underline">
            {site.ownerName}’s Portfolio
          </button>
        )}
        {!logoMark && systemItems.length > 0 && (
          // No logo to hang the menu on: a small chevron right after the name opens it instead.
          <button ref={systemButton} type="button" aria-label="System menu" aria-haspopup="menu" aria-expanded={systemMenu !== null} onClick={toggleSystemMenu} className="-ml-3 flex flex-none cursor-pointer items-center rounded p-0.5 hover:bg-black/10">
            <ChevronDown size={14} aria-hidden />
          </button>
        )}
        {site.menuBar.items.map((item, i) => (
          <button key={i} type="button" onClick={() => onAction(item.action)} className="flex-none cursor-pointer hover:underline">
            {item.label}
          </button>
        ))}
        {onTour && (
          <button type="button" onClick={onTour} className="flex-none cursor-pointer hover:underline">
            Tour
          </button>
        )}
      </nav>
      <div className="flex flex-none items-center gap-4 tabular-nums">
        {!off.has('search') && (
          <button type="button" aria-label="Spotlight Search" title="Spotlight Search (⌘K)" onClick={onSearch} className="cursor-pointer rounded p-0.5 hover:bg-black/10">
            <Search size={15} aria-hidden />
          </button>
        )}
        {!off.has('controlCenter') && (
          <button type="button" aria-label="Control Center" title="Control Center" onClick={(e) => onControlCenter(e.currentTarget)} className="cursor-pointer rounded p-0.5 hover:bg-black/10">
            <ControlCenterIcon />
          </button>
        )}
        {!off.has('date') && <span className="hidden min-w-[80px] text-right lg:inline">{now ? formatMenuDate(now) : ''}</span>}
        {!off.has('clock') && <span className="min-w-[64px] text-right font-medium">{now ? formatTime(now, site.clock24) : ''}</span>}
      </div>
    </header>
    {systemMenu && (
      <ContextMenu
        x={systemMenu.x}
        y={systemMenu.y}
        label="System menu"
        items={systemItems}
        onClose={closeSystemMenu}
        anchorRef={systemButton}
        onPick={(id) => (id === 'saver' ? onStartScreenSaver?.(systemButton.current) : onLockScreen?.(systemButton.current))}
      />
    )}
    </>
  );
}

/** The macOS Control Center glyph: two switches, the top one on (filled), the bottom one off (outlined). */
function ControlCenterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="none">
      <mask id="cc-top-knob">
        <rect width="16" height="16" fill="#fff" />
        <circle cx="11.25" cy="4.5" r="1.9" fill="#000" />
      </mask>
      <rect x="1" y="1.25" width="14" height="6.5" rx="3.25" fill="currentColor" mask="url(#cc-top-knob)" />
      <rect x="1.65" y="8.9" width="12.7" height="5.2" rx="2.6" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="4.75" cy="11.5" r="1.9" fill="currentColor" />
    </svg>
  );
}
