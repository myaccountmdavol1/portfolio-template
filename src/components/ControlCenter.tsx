'use client';

import { BellOff, Lock, MonitorPlay, Moon, Radio, SlidersHorizontal, Sun, SunDim, Sunset } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useEditor } from '@/components/editor/EditorContext';
import { MENU_BAR_H } from '@/lib/geometry';
import type { NowPlaying } from '@/lib/spotify/nowPlaying';
import type { ControlCenterTile } from '@/lib/types';
import { setPref, usePref } from '@/lib/visitorPrefs';

interface ControlCenterProps {
  variant: 'desktop' | 'phone';
  dark: boolean;
  brightness: number;
  onDarkChange: (dark: boolean) => void;
  onBrightnessChange: (value: number) => void;
  /** The tiles the owner kept on (see shownTiles). */
  tiles: Set<ControlCenterTile>;
  onClose: () => void;
  /** Public desktop with the screen saver on: a "Screen Saver" button (closes Control Center, then starts it). */
  onStartScreenSaver?: () => void;
  /** Lock screen on (desktop or phone): a "Lock Screen" button. */
  onLockScreen?: () => void;
}

/** macOS/iOS-style Control Center: Dark Mode, AirDrop, Night Shift, Focus, Now Playing, and brightness. */
export function ControlCenter({ variant, dark, brightness, onDarkChange, onBrightnessChange, tiles, onClose, onStartScreenSaver, onLockScreen }: ControlCenterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const editor = useEditor();

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const isPhone = variant === 'phone';
  const tile = `rounded-2xl p-3 ${dark ? 'bg-white/10' : 'bg-black/[.06]'}`;
  const nightShift = usePref('nightShift');
  const focus = usePref('focus');
  const [shared, setShared] = useState<'idle' | 'copied'>('idle');
  const small = (['airdrop', 'nightShift', 'focus'] as const).filter((t) => tiles.has(t)).length;

  // AirDrop: the phone's share sheet where there is one; otherwise copy the site's link.
  async function share() {
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared('copied');
      window.setTimeout(() => setShared('idle'), 2000);
    } catch {
      // share sheet dismissed, or clipboard blocked
    }
  }
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Control Center"
      className={`fixed z-[9650] flex flex-col gap-2.5 rounded-3xl border p-3 shadow-[0_24px_60px_rgba(0,0,0,.3)] backdrop-blur-2xl ${
        dark ? 'border-white/10 bg-[#1c1c1e]/80 text-white' : 'border-white/50 bg-[#f6f5f2]/80 text-[#1d1c1a]'
      } ${isPhone ? 'inset-x-3' : 'right-3 w-[300px]'}`}
      style={{ top: isPhone ? 'calc(env(safe-area-inset-top) + 44px)' : MENU_BAR_H + 6 }}
    >
      {tiles.has('darkMode') && (
        <button
          type="button"
          role="switch"
          aria-checked={dark}
          onClick={() => onDarkChange(!dark)}
          className={`${tile} flex cursor-pointer items-center gap-3 text-left`}
        >
          <span className={`flex h-9 w-9 items-center justify-center rounded-full ${dark ? 'bg-[#0a84ff] text-white' : 'bg-white text-[#1d1c1a]'}`}>
            {dark ? <Moon size={18} aria-hidden /> : <Sun size={18} aria-hidden />}
          </span>
          <span className="flex flex-col">
            <span className="text-[13px] font-semibold">Dark Mode</span>
            <span className="text-[11px] opacity-65">{dark ? 'On' : 'Off'}</span>
          </span>
        </button>
      )}
      {small > 0 && (
        <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${small}, minmax(0, 1fr))` }}>
          {tiles.has('airdrop') && (
            <SmallTile tile={tile} dark={dark} label="AirDrop" status={shared === 'copied' ? 'Link copied' : 'Share site'} on={shared === 'copied'} onClick={share}>
              <Radio size={17} aria-hidden />
            </SmallTile>
          )}
          {tiles.has('nightShift') && (
            <SmallTile tile={tile} dark={dark} label="Night Shift" status={nightShift ? 'On' : 'Off'} on={nightShift} onClick={() => setPref('nightShift', !nightShift)} toggle>
              <Sunset size={17} aria-hidden />
            </SmallTile>
          )}
          {tiles.has('focus') && (
            <SmallTile tile={tile} dark={dark} label="Focus" status={focus ? 'No calls' : 'Off'} on={focus} onClick={() => setPref('focus', !focus)} toggle>
              <BellOff size={17} aria-hidden />
            </SmallTile>
          )}
        </div>
      )}
      {tiles.has('nowPlaying') && <NowPlayingTile tile={tile} />}
      {tiles.has('display') && (
        <div className={tile}>
          <label htmlFor="cc-brightness" className="mb-2 block text-[13px] font-semibold">
            Display
          </label>
          <div className="flex items-center gap-2">
            <SunDim size={16} aria-hidden className="opacity-70" />
            <input
              id="cc-brightness"
              type="range"
              aria-label="Brightness"
              min={30}
              max={100}
              value={Math.round(brightness * 100)}
              onChange={(e) => onBrightnessChange(Number(e.target.value) / 100)}
              className="h-1.5 flex-1 cursor-pointer accent-[#0a84ff]"
            />
            <Sun size={16} aria-hidden className="opacity-70" />
          </div>
        </div>
      )}
      {(onStartScreenSaver || onLockScreen) && (
        <div className="grid grid-flow-col gap-2.5">
          {onStartScreenSaver && (
            <button
              type="button"
              onClick={() => {
                onClose(); // closed first, so it never sits on top of the screen saver
                onStartScreenSaver();
              }}
              className={`${tile} flex cursor-pointer items-center justify-center gap-2 text-[12px] font-semibold`}
            >
              <MonitorPlay size={15} aria-hidden /> Screen Saver
            </button>
          )}
          {onLockScreen && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLockScreen();
              }}
              className={`${tile} flex cursor-pointer items-center justify-center gap-2 text-[12px] font-semibold`}
            >
              <Lock size={15} aria-hidden /> Lock Screen
            </button>
          )}
        </div>
      )}
      {tiles.size === 0 && !onStartScreenSaver && !onLockScreen && <p className="m-0 p-2 text-center text-xs opacity-65">Nothing here yet.</p>}
      {editor && (
        // Edit mode: jump to the settings for these tiles.
        <button
          type="button"
          onClick={() => {
            editor.select({ kind: 'site' });
            onClose();
          }}
          className="flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-dashed border-current/30 px-3 py-1.5 text-xs font-semibold opacity-75 hover:opacity-100"
        >
          <SlidersHorizontal size={13} aria-hidden /> Customize Control Center…
        </button>
      )}
    </div>
  );
}

/** What the owner is listening to on Spotify — hidden until Spotify is connected and has something to show. */
function NowPlayingTile({ tile }: { tile: string }) {
  const [track, setTrack] = useState<NowPlaying | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/now-playing')
      .then((r) => (r.ok ? (r.json() as Promise<{ track?: NowPlaying | null }>) : null))
      .then((body) => {
        if (!cancelled && body?.track) setTrack(body.track);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  if (!track) return null;
  return (
    <a
      href={track.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${track.isPlaying ? 'Now playing' : 'Last played'}: ${track.title} by ${track.artist}`}
      className={`${tile} flex items-center gap-3`}
    >
      {track.albumArt ? (
        // eslint-disable-next-line @next/next/no-img-element -- Spotify album art
        <img src={track.albumArt} alt="" width={48} height={48} className="h-12 w-12 flex-none rounded-lg object-cover shadow" />
      ) : (
        <span aria-hidden className="h-12 w-12 flex-none rounded-lg bg-[#1db954]" />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold opacity-65">
          {track.isPlaying && (
            <span aria-hidden className="now-playing-bars flex h-2.5 items-end gap-[2px]">
              <span />
              <span />
              <span />
            </span>
          )}
          {track.isPlaying ? 'I’m listening to' : 'I last played'}
        </span>
        <span className="truncate text-[13px] font-semibold">{track.title}</span>
        <span className="truncate text-[11px] opacity-65">{track.artist}</span>
      </span>
    </a>
  );
}

function SmallTile({ tile, dark, label, status, on, onClick, toggle, children }: {
  tile: string;
  dark: boolean;
  label: string;
  status: string;
  on: boolean;
  onClick: () => void;
  toggle?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      {...(toggle ? { role: 'switch', 'aria-checked': on } : {})}
      aria-label={label}
      onClick={onClick}
      className={`${tile} flex cursor-pointer flex-col items-center gap-1.5 text-center`}
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${on ? 'bg-[#0a84ff] text-white' : dark ? 'bg-white/15' : 'bg-white'}`}>{children}</span>
      <span className="text-[11px] font-semibold leading-tight">{label}</span>
      <span className="-mt-1 text-[10px] leading-tight opacity-65">{status}</span>
    </button>
  );
}

/** Dims the screen for the brightness slider, and warms it for Night Shift (never blocks clicks). */
export function BrightnessOverlay({ brightness, nightShiftAllowed = true }: { brightness: number; nightShiftAllowed?: boolean }) {
  const nightShift = usePref('nightShift') && nightShiftAllowed;
  return (
    <>
      {nightShift && <div aria-hidden data-testid="night-shift" className="pointer-events-none fixed inset-0 z-[9989] bg-[#ff9a3c] mix-blend-multiply" style={{ opacity: 0.22 }} />}
      {brightness < 0.999 && <div aria-hidden className="pointer-events-none fixed inset-0 z-[9990] bg-black" style={{ opacity: (1 - brightness) * 0.85 }} />}
    </>
  );
}
