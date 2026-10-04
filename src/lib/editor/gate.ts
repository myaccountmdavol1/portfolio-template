export type EditorMode = 'firebase' | 'local';

/** Set by /admin after the owner signs in, so the editor loads on the home page without ?edit. */
export const EDITOR_FLAG_KEY = 'portfolio:editor';

/**
 * Whether to load the editor at all. Visitors (no flag, no query) get null and never download it.
 * `?editor=local` is a dev-only localStorage editor used by the e2e tests.
 */
export function editorModeFor(search: string, flag: string | null, isProduction: boolean): EditorMode | null {
  const params = new URLSearchParams(search);
  if (params.get('editor') === 'local' && !isProduction) return 'local';
  if (params.has('edit') || flag === '1') return 'firebase';
  return null;
}

/** The toolbar starts with Edit on when the URL explicitly asked for the editor. */
export function startsInEditMode(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.has('edit') || params.get('editor') === 'local';
}

export function readEditorFlag(): string | null {
  try {
    return window.localStorage.getItem(EDITOR_FLAG_KEY);
  } catch {
    return null;
  }
}

export function setEditorFlag(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(EDITOR_FLAG_KEY, '1');
    else window.localStorage.removeItem(EDITOR_FLAG_KEY);
  } catch {
    // storage blocked — the owner can still use /?edit
  }
}
