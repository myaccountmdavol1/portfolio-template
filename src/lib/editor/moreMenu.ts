import type { MenuEntry } from './appMenu';
import type { EditorBackend } from './backend';

export type MoreAction = 'cleanUp' | 'media' | 'versions' | 'setup' | 'discard' | 'leave';

/**
 * The toolbar's More menu. "Run setup again" is for Vercel-backend sites only (the http backend): Firebase sites have
 * no /setup. `canSignOut` false (local mode) turns Sign out into Leave the editor.
 */
export function moreMenuEntries(kind: EditorBackend['kind'], canSignOut: boolean): MenuEntry<MoreAction>[] {
  return [
    { id: 'cleanUp', label: 'Clean Up Desktop Icons' },
    { id: 'media', label: 'Media library\u2026' },
    { id: 'versions', label: 'Version history\u2026' },
    ...(kind === 'http' ? [{ id: 'setup' as const, label: 'Run setup again\u2026' }] : []),
    { id: 'discard', label: 'Discard draft changes\u2026', danger: true },
    { id: 'leave', label: canSignOut ? 'Sign out' : 'Leave the editor' },
  ];
}
