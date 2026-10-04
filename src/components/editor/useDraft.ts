'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { createAutosaver, type Autosaver, type SaveStatus } from '@/lib/editor/autosaver';
import type { EditorBackend } from '@/lib/editor/backend';
import { historyReducer, initHistory, type History, type HistoryAction } from '@/lib/editor/history';
import { clearUnsavedMirror, readUnsavedMirror, writeUnsavedMirror } from '@/lib/editor/unsavedMirror';
import type { SiteData } from '@/lib/types';

export type LoadState = 'loading' | 'ready' | 'error';

const reducer = (state: History<SiteData>, action: HistoryAction<SiteData>) => historyReducer(state, action);

/** The editable draft: undo history + loading from the backend + autosave 2s after the last change. */
export function useDraft(backend: EditorBackend, published: SiteData) {
  // Only the first published value seeds a brand-new draft; later refreshes of `published` must not reload.
  const [initialPublished] = useState(published);
  const [history, dispatch] = useReducer(reducer, initialPublished, initHistory);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const saverRef = useRef<Autosaver<SiteData> | null>(null);
  const lastSavedRef = useRef<SiteData | null>(null);
  // The value just loaded; it needs no save. Cleared at the first real change.
  const baselineRef = useRef<SiteData | null>(null);

  useEffect(() => {
    const store = window.localStorage;
    const saver = createAutosaver<SiteData>({
      save: async (value) => {
        await backend.saveDraft(value, lastSavedRef.current);
        lastSavedRef.current = value;
      },
      onStatus: (status) => {
        setSaveStatus(status);
        if (status === 'saved') clearUnsavedMirror(store, backend.kind);
      },
    });
    saverRef.current = saver;
    let cancelled = false;

    backend.loadDraft().then(
      (draft) => {
        if (cancelled) return;
        lastSavedRef.current = draft;
        const start = readUnsavedMirror(store, backend.kind) ?? draft ?? initialPublished;
        baselineRef.current = start;
        dispatch({ type: 'reset', present: start });
        setLoadState('ready');
        if (start !== draft) saver.update(start); // restored unsaved edits, or a first-ever draft
      },
      (err: unknown) => {
        if (cancelled) return;
        console.error('Could not load the draft', err);
        setLoadState('error');
      },
    );

    return () => {
      cancelled = true;
      saver.dispose();
    };
  }, [backend, initialPublished, loadAttempt]);

  useEffect(() => {
    if (loadState !== 'ready' || history.present === baselineRef.current) return;
    baselineRef.current = null;
    writeUnsavedMirror(window.localStorage, backend.kind, history.present);
    saverRef.current?.update(history.present);
  }, [history.present, loadState, backend.kind]);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (saveStatus === 'saved') return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveStatus]);

  const apply = useCallback((fn: (data: SiteData) => SiteData, key?: string) => dispatch({ type: 'update', fn, key }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  const flush = useCallback(() => saverRef.current?.flush() ?? Promise.resolve(), []);
  const retryLoad = useCallback(() => {
    setLoadState('loading');
    setLoadAttempt((n) => n + 1);
  }, []);

  return {
    loadState,
    data: history.present,
    apply,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    saveStatus,
    flush,
    retryLoad,
  };
}

export type Draft = ReturnType<typeof useDraft>;
