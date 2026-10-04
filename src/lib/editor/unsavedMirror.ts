import type { SiteData } from '../types';
import type { EditorBackend, KeyValueStore } from './backend';

// Unsaved edits are mirrored to localStorage until the backend confirms a save, and restored on reload.

const key = (kind: EditorBackend['kind']) => `portfolio:unsavedDraft:${kind}`;

export function readUnsavedMirror(store: KeyValueStore, kind: EditorBackend['kind']): SiteData | null {
  try {
    const raw = store.getItem(key(kind));
    return raw ? (JSON.parse(raw) as SiteData) : null;
  } catch {
    return null;
  }
}

export function writeUnsavedMirror(store: KeyValueStore, kind: EditorBackend['kind'], data: SiteData): void {
  try {
    store.setItem(key(kind), JSON.stringify(data));
  } catch {
    // Storage full or blocked — autosave still runs, we just lose the reload safety net.
  }
}

export function clearUnsavedMirror(store: KeyValueStore, kind: EditorBackend['kind']): void {
  try {
    store.removeItem(key(kind));
  } catch {
    // ignore
  }
}
