'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { createAutosaver, type Autosaver, type SaveStatus } from '@/lib/editor/autosaver';
import type { EditorBackend } from '@/lib/editor/backend';
import { chooseStart } from '@/lib/editor/chooseStart';
import { historyReducer, initHistory, type History, type HistoryAction } from '@/lib/editor/history';
import { clearUnsavedMirror, readUnsavedMirror, writeUnsavedMirror } from '@/lib/editor/unsavedMirror';
import type { SiteData } from '@/lib/types';

export type LoadState = 'loading' | 'ready' | 'error';

const reducer = (state: History<SiteData>, action: HistoryAction<SiteData>) => historyReducer(state, action);

/** The editable draft: undo history + loading from the backend + autosave 2s after the last change. */
export function useDraft(backend: EditorBackend, published: SiteData, hostingChat: boolean) {
  // Only the first published value seeds a brand-new draft; later refreshes of `published` must not reload.
  const [initialPublished] = useState(published);
  // The published site as stored: `published` (the page's copy) leaves out add-ons that aren't connected.
  const [livePublished, setLivePublished] = useState(published);
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

    // A failed read of the stored copy is told apart from "no stored copy"; chooseStart decides what it means.
    let storedFailed = false;
    const stored = backend.loadPublished().catch((err: unknown) => {
      console.warn('Could not load the published site', err);
      storedFailed = true;
      return null;
    });
    Promise.all([backend.loadDraft(), stored]).then(
      ([draft, storedPublished]) => {
        if (cancelled) return;
        const mirror = readUnsavedMirror(store, backend.kind);
        const chosen = chooseStart({ kind: backend.kind, mirror, draft, stored: storedPublished, storedFailed, hostingChat, page: initialPublished });
        if (chosen === 'error') {
          setLoadState('error');
          return;
        }
        lastSavedRef.current = draft;
        setLivePublished(chosen.published);
        const start = chosen.start;
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
    /** The published site as stored, for Discard and the media library. */
    published: livePublished,
    /** After a successful publish: that snapshot is now the published site. */
    markPublished: setLivePublished,
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
