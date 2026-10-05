import type { SiteData } from '../types';
import type { EditorBackend } from './backend';

/**
 * Picks what a new editing session starts from, and what Discard goes back to.
 * - `stored` is the published site as stored (null: none, or local mode); `storedFailed` means reading it threw.
 * - The page's copy leaves out Messages apps while chat isn't connected, so when it may be filtered a failed read must
 *   not fall back to it (that would seed and save a draft without them): the editor shows its load error instead.
 * - That is always so on the http backend. On firebase it is so unless the hosting sets the chat key (`hostingChat`),
 *   because then chat is always connected and the page's copy is whole. local keeps the fallback.
 */
export function chooseStart(input: {
  kind: EditorBackend['kind'];
  /** Unsaved edits restored from this browser, if any. */
  mirror?: SiteData | null;
  draft: SiteData | null;
  stored: SiteData | null;
  storedFailed: boolean;
  /** The hosting sets the chat key, so the page's copy never leaves Messages apps out. */
  hostingChat: boolean;
  page: SiteData;
}): { start: SiteData; published: SiteData } | 'error' {
  const { kind, mirror = null, draft, stored, storedFailed, hostingChat, page } = input;
  const pageFiltered = kind === 'http' || (kind === 'firebase' && !hostingChat);
  if (storedFailed && pageFiltered) return 'error';
  const published = stored ?? page;
  return { start: mirror ?? draft ?? published, published };
}
