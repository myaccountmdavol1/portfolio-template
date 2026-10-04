'use client';

import { Monitor, Redo2, Smartphone, Undo2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { SAVE_STATUS_LABEL, type SaveStatus } from '@/lib/editor/autosaver';
import { MENU_BAR_H } from '@/lib/geometry';
import type { LoadState } from './useDraft';

export type Preview = 'desktop' | 'phone';

export const toolbarButton =
  'inline-flex h-8 min-w-8 flex-none cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/15 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent aria-pressed:bg-white aria-pressed:text-[#1d1d1f]';

interface EditorToolbarProps {
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  preview: Preview;
  onPreviewChange: (preview: Preview) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  saveStatus: SaveStatus;
  loadState: LoadState;
  onRetryLoad: () => void;
  /** Extra controls shown only while editing (Add, Wallpaper, Site, Publish…). */
  children?: ReactNode;
}

export function EditorToolbar(props: EditorToolbarProps) {
  const { editing, preview, loadState } = props;
  const ready = loadState === 'ready';
  return (
    <div
      role="toolbar"
      aria-label="Editor"
      className="fixed left-1/2 z-[9500] flex max-w-[calc(100vw-16px)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-full bg-[#1d1d1f]/90 px-1.5 py-1.5 text-white shadow-[0_10px_30px_rgba(0,0,0,.3)] backdrop-blur-xl"
      style={{ top: MENU_BAR_H + 8 }}
    >
      <button type="button" aria-pressed={editing} disabled={!ready} onClick={() => props.onEditingChange(!editing)} className={toolbarButton}>
        Edit
      </button>
      <span aria-hidden className="mx-1 h-5 w-px bg-white/20" />
      <button type="button" aria-label="Desktop" title="Desktop preview" aria-pressed={preview === 'desktop'} onClick={() => props.onPreviewChange('desktop')} className={toolbarButton}>
        <Monitor size={14} aria-hidden /> <span className="hidden sm:inline">Desktop</span>
      </button>
      <button type="button" aria-label="Phone" title="Phone preview" aria-pressed={preview === 'phone'} onClick={() => props.onPreviewChange('phone')} className={toolbarButton}>
        <Smartphone size={14} aria-hidden /> <span className="hidden sm:inline">Phone</span>
      </button>
      {editing && ready && (
        <>
          <span aria-hidden className="mx-1 h-5 w-px bg-white/20" />
          <button type="button" aria-label="Undo" title="Undo (⌘Z)" disabled={!props.canUndo} onClick={props.onUndo} className={toolbarButton}>
            <Undo2 size={15} aria-hidden />
          </button>
          <button type="button" aria-label="Redo" title="Redo (⇧⌘Z)" disabled={!props.canRedo} onClick={props.onRedo} className={toolbarButton}>
            <Redo2 size={15} aria-hidden />
          </button>
          {props.children}
        </>
      )}
      <span aria-hidden className="mx-1 h-5 w-px bg-white/20" />
      {loadState === 'error' ? (
        <span role="alert" className="flex items-center gap-1.5 px-2 text-xs text-[#ffb4ab]">
          Couldn’t load your draft
          <button type="button" onClick={props.onRetryLoad} className={toolbarButton}>
            Retry
          </button>
        </span>
      ) : (
        <span role="status" data-testid="save-status" className="whitespace-nowrap px-2 text-xs text-white/70">
          {loadState === 'loading' ? 'Loading…' : SAVE_STATUS_LABEL[props.saveStatus]}
        </span>
      )}
    </div>
  );
}
