'use client';

import { updateAppContent } from '@/lib/editor/mutations';
import type { PortfolioApp } from '@/lib/types';
import { useEditor } from '../EditorContext';

/**
 * Setters for one app's content fields. They read the latest content inside `apply`, so quick successive
 * edits never overwrite each other. Typing coalesces per field; `structural` edits get their own undo step.
 */
export function useContentEditor<A extends PortfolioApp>(app: A) {
  const editor = useEditor();
  type C = A['content'];

  function patch(next: Partial<C>, key?: string) {
    editor?.apply((d) => {
      const current = d.apps.find((a) => a.id === app.id);
      if (!current || current.type !== app.type) return d;
      return updateAppContent(d, app.id, { ...current.content, ...next } as C);
    }, key);
  }

  function set<K extends keyof C>(field: K, value: C[K], structural = false) {
    patch({ [field]: value } as unknown as Partial<C>, structural ? undefined : `${app.id}:content:${String(field)}`);
  }

  return { set, patch };
}
