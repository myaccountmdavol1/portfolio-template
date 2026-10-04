'use client';

import { useEffect, useRef } from 'react';
import { deepLinkParams, readDeepLink, resolveDeepLink, withDeepLink, type LinkTarget, type ResolvedLink } from '@/lib/deepLink';
import type { SiteData } from '@/lib/types';

interface Options {
  /** Only the public site; the editor never touches the address bar. */
  enabled: boolean;
  data: SiteData;
  /** The front window (and the item it shows), or null with nothing open. */
  current: LinkTarget | null;
  openTarget: (target: ResolvedLink) => void;
  closeAll: () => void;
  /** The guided tour is playing: it opens and closes windows on its own, all on one history entry. */
  touring?: boolean;
}

/** Marks a history entry this hook pushed. */
const PUSHED = 'portfolioWindow';

const here = () => window.location.pathname + window.location.search + window.location.hash;

/** Replaces the query string, keeping this hook's history mark (e.g. to tidy away /?tour=1). */
export function replaceSearch(search: string): void {
  const pushed = window.history.state?.[PUSHED] === true;
  window.history.replaceState(pushed ? { [PUSHED]: true } : null, '', window.location.pathname + search + window.location.hash);
}

/** Opens what the URL asks for (on load and on Back/Forward), and keeps the URL in step with the front window. */
export function useDeepLinkSync({ enabled, data, current, openTarget, closeAll, touring = false }: Options): void {
  const latest = useRef({ data, current, openTarget, closeAll, touring });
  useEffect(() => {
    latest.current = { data, current, openTarget, closeAll, touring };
  });
  const started = useRef(false);
  // The app a link (first load, Back or Forward) is opening; the URL already says so, so it isn't rewritten until its window shows.
  const pending = useRef<string | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const apply = (initial: boolean) => {
      const { data, current, openTarget, closeAll } = latest.current;
      const { open, item } = readDeepLink(window.location.search);
      const target = resolveDeepLink(data, open, item);
      if (target) {
        if (current?.appId !== target.appId) pending.current = target.appId;
        openTarget(target);
        return;
      }
      if (!initial) {
        closeAll();
        return;
      }
      const raw = new URLSearchParams(window.location.search);
      if (raw.has('open') || raw.has('item')) {
        window.history.replaceState(null, '', window.location.pathname + withDeepLink(window.location.search, null) + window.location.hash);
      }
    };
    if (!started.current) {
      started.current = true;
      apply(true);
    }
    const onPop = () => apply(false);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [enabled]);

  const key = current ? `${current.appId}\n${current.itemKey ?? ''}` : '';
  useEffect(() => {
    if (!enabled || !started.current) return;
    // Re-runs when the tour starts or stops too: stopping with nothing open (between stops) has to step back
    // off the entry the tour's first window pushed; otherwise it's a same-URL replace and returns early.
    const { data, current } = latest.current;
    const opened = current !== null && !wasOpen.current;
    wasOpen.current = current !== null;
    let mode: 'push' | 'replace' = opened ? 'push' : 'replace';
    if (pending.current !== null) {
      if (current?.appId !== pending.current) return;
      pending.current = null;
      mode = 'replace'; // the URL already names this window: landing here means Back leaves, and Back/Forward add no entry
    }
    const pushed = window.history.state?.[PUSHED] === true;
    // The tour closes windows between stops. It stays on one entry: a Back here would land (as a popstate)
    // after the next stop had opened, and close it.
    if (touring && pushed) mode = 'replace';
    // This entry was added when its window opened, so closing the last window steps back off it (and Back leaves the page).
    if (current === null && pushed && !touring) {
      window.history.back();
      return;
    }
    const params = current ? deepLinkParams(data, current) : null;
    const next = window.location.pathname + withDeepLink(window.location.search, params) + window.location.hash;
    if (next === here()) return;
    // Next keeps its own keys in history.state but drops others on a replace, so the mark is carried over.
    if (mode === 'push') window.history.pushState({ [PUSHED]: true }, '', next);
    else window.history.replaceState(pushed ? { [PUSHED]: true } : null, '', next);
  }, [enabled, key, touring]);
}
