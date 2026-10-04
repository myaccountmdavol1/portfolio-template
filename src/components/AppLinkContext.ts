'use client';

import { createContext, useContext, useEffect, useRef } from 'react';

/** "Show this item" — sent to an app when a link (or, later, Claude or the tour) opens it. A new nonce = a new request. */
export interface FocusRequest {
  itemKey?: string;
  /** The link named an item that isn't there; the window shows a note instead. */
  missing: boolean;
  nonce: number;
}

/** Between a window (or phone sheet) and the app inside it. Null in places with no links (widgets). */
export interface AppLinkApi {
  focus: FocusRequest | null;
  /** The app says which item it's showing (null = none), so the address bar and Share follow it. */
  reportItem: (itemKey: string | null) => void;
  /** The site-relative link to this app (and item), or null where links are off (the editor). */
  pathFor: (itemKey?: string) => string | null;
}

export const AppLinkContext = createContext<AppLinkApi | null>(null);

export function useAppLink(): AppLinkApi | null {
  return useContext(AppLinkContext);
}

/** Runs `apply` once for each new focus request. */
export function useFocusRequest(apply: (req: FocusRequest) => void): void {
  const focus = useAppLink()?.focus ?? null;
  const applyRef = useRef(apply);
  useEffect(() => {
    applyRef.current = apply;
  });
  const seen = useRef(0);
  useEffect(() => {
    if (!focus || focus.nonce === seen.current) return;
    seen.current = focus.nonce;
    applyRef.current(focus);
  }, [focus]);
}

/** Tells the window which item is showing whenever it changes. */
export function useReportItem(itemKey: string | null): void {
  const report = useAppLink()?.reportItem;
  useEffect(() => {
    report?.(itemKey);
  }, [report, itemKey]);
}
