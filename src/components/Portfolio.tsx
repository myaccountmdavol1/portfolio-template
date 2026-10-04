'use client';

import dynamic from 'next/dynamic';
import { useSyncExternalStore } from 'react';
import { ClaimPill } from '@/components/ClaimPill';
import { SiteView } from '@/components/SiteView';
import { editorModeFor, readEditorFlag, type EditorMode } from '@/lib/editor/gate';
import type { SiteData } from '@/lib/types';

// Loaded only for the owner (or ?editor=local in dev), so visitors never download the editor or Firebase Auth.
const EditorShell = dynamic(() => import('@/components/editor/EditorShell').then((m) => m.EditorShell), {
  ssr: false,
  loading: () => null,
});

const noopSubscribe = () => () => {};
const readEditorMode = (): EditorMode | null =>
  editorModeFor(window.location.search, readEditorFlag(), process.env.NODE_ENV === 'production');

export function Portfolio({
  data,
  initialIsPhone,
  ownerBackend,
  setupPending = false,
}: {
  data: SiteData;
  initialIsPhone: boolean;
  ownerBackend: 'firebase' | 'vercel';
  /** A new Vercel-backend site nobody has claimed: visitors see "Claim your site". Never in the editor. */
  setupPending?: boolean;
}) {
  const mode = useSyncExternalStore(noopSubscribe, readEditorMode, () => null);
  if (mode) return <EditorShell mode={mode} ownerBackend={ownerBackend} published={data} initialIsPhone={initialIsPhone} />;
  return (
    <>
      <SiteView data={data} initialIsPhone={initialIsPhone} />
      {setupPending && <ClaimPill />}
    </>
  );
}
