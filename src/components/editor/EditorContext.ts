'use client';

import { createContext, useContext } from 'react';
import type { AppAction } from '@/lib/editor/appMenu';
import type { EditorBackend, UploadFolder } from '@/lib/editor/backend';
import type { SiteData } from '@/lib/types';

export type Selection = { kind: 'app'; appId: string } | { kind: 'dock'; index: number } | { kind: 'site' };

export interface EditorApi {
  data: SiteData;
  /** Runs a pure edit against the latest draft. Edits sharing a `key` in a row become one undo step. */
  apply: (fn: (data: SiteData) => SiteData, key?: string) => void;
  selection: Selection | null;
  select: (selection: Selection | null) => void;
  upload: EditorBackend['upload'];
  chatLogs: EditorBackend['chatLogs'];
  guestbook: EditorBackend['guestbook'];
  hallOfFame: EditorBackend['hallOfFame'];
  inbox: EditorBackend['inbox'];
  /** Opens the right-click menu for `target` at a screen position. */
  openMenu: (menu: MenuRequest) => void;
  /** Id of the app whose desktop label is being renamed inline. */
  renamingId: string | null;
  setRenamingId: (appId: string | null) => void;
  openIconPicker: (target: IconTarget) => void;
  openWallpaperPicker: () => void;
  /** Browse uploads; with `onPick`, choose one for a field (limited to `folder`). */
  openMediaLibrary: (options?: { folder?: UploadFolder; onPick?: (url: string) => void }) => void;
  /** The same actions as the right-click menu (duplicate, delete…). */
  runAppAction: (action: AppAction, appId: string, surface?: 'desktop' | 'phone') => void;
}

/** What an icon picker is choosing for: an app's icon, or a dock link's icon. */
export type IconTarget = { kind: 'app'; appId: string } | { kind: 'dock'; index: number } | { kind: 'menuBarLogo' };

export interface MenuRequest {
  x: number;
  y: number;
  /** `desktop` = the bare wallpaper (Clean Up, wallpaper). */
  target: Selection | { kind: 'desktop' };
  /** Which layout the menu was opened from; the phone has its own dock and pages. */
  surface?: 'desktop' | 'phone';
}

/** Provided only while Edit mode is on. `null` means “behave exactly like the public site”. */
export const EditorContext = createContext<EditorApi | null>(null);

/** Asks the desktop to tidy its icons (it knows its own size and where widgets are). */
export const CLEAN_UP_EVENT = 'portfolio:clean-up';
export function requestCleanUp(sortBy: 'position' | 'name') {
  window.dispatchEvent(new CustomEvent(CLEAN_UP_EVENT, { detail: sortBy }));
}

export function useEditor(): EditorApi | null {
  return useContext(EditorContext);
}

export function isSelectedApp(editor: EditorApi | null, appId: string): boolean {
  return editor?.selection?.kind === 'app' && editor.selection.appId === appId;
}
