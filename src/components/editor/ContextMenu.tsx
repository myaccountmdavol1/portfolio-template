'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { MenuEntry } from '@/lib/editor/appMenu';

interface ContextMenuProps {
  x: number;
  y: number;
  label: string;
  items: MenuEntry[];
  onPick: (id: string) => void;
  onClose: () => void;
  /** The button that opened it: a press there doesn't count as outside (the button closes it itself, as a toggle). */
  anchorRef?: RefObject<HTMLElement | null>;
}

const MENU_W = 220;

/** A small macOS-style menu at a screen position. Arrow keys move, Enter picks, Esc or a click outside closes. */
export function ContextMenu({ x, y, label, items, onPick, onClose, anchorRef }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (anchorRef?.current?.contains(target)) return;
      if (ref.current && !ref.current.contains(target)) onClose();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => window.removeEventListener('pointerdown', onPointerDown, true);
  }, [onClose, anchorRef]);

  function onKeyDown(e: React.KeyboardEvent) {
    const buttons = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = buttons.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      buttons[(i + step + buttons.length) % buttons.length]?.focus();
    }
  }

  const left = Math.max(8, Math.min(x, window.innerWidth - MENU_W - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - items.length * 30 - 16));

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-[9700] flex flex-col rounded-lg border border-black/10 bg-[#f6f5f2]/95 p-1 text-[13px] text-[#1d1c1a] shadow-[0_12px_32px_rgba(0,0,0,.22)] backdrop-blur-xl"
      style={{ left, top, width: MENU_W }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onPick(item.id);
          }}
          className={`cursor-pointer rounded-md px-2.5 py-1 text-left outline-none hover:bg-[#0a84ff] hover:text-white focus:bg-[#0a84ff] focus:text-white ${item.danger ? 'text-[#c0362c]' : ''}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
