import { findAboutAppId, resolveApp, visibleAppsById } from '../apps';
import { deleteApp } from '../editor/mutations';
import type { SiteData } from '../types';

const OPEN_APP = /^openApp:(.+)$/;

/**
 * The site as visitors get it: without chat connected, every Messages app is left out, with its desktop icon,
 * widget, dock item and phone slots, so visitors never meet a chat that can't answer. Menu bar items that open a
 * removed app are dropped, and an incoming call that would open one opens About instead (or does nothing when
 * there is no About app). The saved draft and published site keep everything, so connecting a key brings it all
 * back with no edit. Returns `data` itself when nothing changes.
 */
export function withoutDisconnected(data: SiteData, connected: { chat: boolean }): SiteData {
  if (connected.chat) return data;
  const removed = new Set(data.apps.filter((a) => a.type === 'messages').map((a) => a.id));
  if (removed.size === 0) return data;
  const shown = [...removed].reduce((d, id) => deleteApp(d, id), data);

  // Matched the way the site opens an app: an exact id, or a type or title ref, against the original apps.
  const originalById = visibleAppsById(data.apps);
  const points = (action: string) => {
    const ref = OPEN_APP.exec(action)?.[1];
    if (ref === undefined) return false;
    const target = resolveApp(originalById, ref);
    return removed.has(ref) || (target !== undefined && removed.has(target.id));
  };
  const { menuBar, incomingCall } = shown.site;
  const items = menuBar.items.filter((i) => !points(i.action));
  const fixCall = points(incomingCall.answerAction);
  if (items.length === menuBar.items.length && !fixCall) return shown;
  const aboutId = findAboutAppId(shown.apps);
  const fallback = aboutId ? `openApp:${aboutId}` : '';
  return {
    ...shown,
    site: {
      ...shown.site,
      menuBar: items.length === menuBar.items.length ? menuBar : { ...menuBar, items },
      incomingCall: fixCall ? { ...incomingCall, answerAction: fallback } : incomingCall,
    },
  };
}
