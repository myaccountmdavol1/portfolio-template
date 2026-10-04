'use client';

import { useEffect, useMemo } from 'react';
import { SiteView } from '@/components/SiteView';
import { createFirebaseBackend } from '@/lib/editor/firebaseBackend';
import { setEditorFlag, type EditorMode } from '@/lib/editor/gate';
import { createHttpBackend } from '@/lib/editor/httpBackend';
import { createLocalBackend } from '@/lib/editor/localBackend';
import type { SiteData } from '@/lib/types';
import { EditorApp } from './EditorApp';
import { useOwnerSession } from './useOwnerSession';
import { usePasswordSession } from './usePasswordSession';

export interface EditorShellProps {
  mode: EditorMode;
  ownerBackend: 'firebase' | 'vercel';
  published: SiteData;
  initialIsPhone: boolean;
}

export function EditorShell({ mode, ownerBackend, published, initialIsPhone }: EditorShellProps) {
  if (mode === 'local') return <LocalEditor published={published} initialIsPhone={initialIsPhone} />;
  return ownerBackend === 'vercel' ? (
    <HttpEditor published={published} initialIsPhone={initialIsPhone} />
  ) : (
    <FirebaseEditor published={published} initialIsPhone={initialIsPhone} />
  );
}

type Props = Omit<EditorShellProps, 'mode' | 'ownerBackend'>;

function LocalEditor({ published, initialIsPhone }: Props) {
  const backend = useMemo(() => createLocalBackend(window.localStorage), []);
  return <EditorApp backend={backend} published={published} initialIsPhone={initialIsPhone} onSignOut={null} />;
}

function FirebaseEditor({ published, initialIsPhone }: Props) {
  const session = useOwnerSession();
  const backend = useMemo(() => (session.status === 'owner' ? createFirebaseBackend() : null), [session.status]);

  // Anyone who isn't the signed-in owner just gets the public site, and stops loading the editor.
  useEffect(() => {
    if (session.status === 'signedOut' || session.status === 'notOwner' || session.status === 'unconfigured') {
      setEditorFlag(false);
    }
  }, [session.status]);

  if (!backend) return <SiteView data={published} initialIsPhone={initialIsPhone} />;
  return (
    <EditorApp
      backend={backend}
      published={published}
      initialIsPhone={initialIsPhone}
      onSignOut={() => {
        setEditorFlag(false);
        void session.signOut().then(() => window.location.assign('/'));
      }}
    />
  );
}

function HttpEditor({ published, initialIsPhone }: Props) {
  const { session } = usePasswordSession();
  const ready = session.status === 'ready' ? session : null;
  const owner = ready?.owner ?? false;
  const media = ready?.media ?? null;
  const backend = useMemo(
    () =>
      owner
        ? createHttpBackend({
            media,
            // An expired session: back to /admin. Unsaved edits stay in this browser and come back after signing in.
            onUnauthorized: () => window.location.assign('/admin?expired=1'),
          })
        : null,
    [owner, media],
  );

  // Anyone who isn't the signed-in owner just gets the public site, and stops loading the editor.
  useEffect(() => {
    if (ready && !ready.owner) setEditorFlag(false);
  }, [ready]);

  if (!backend) return <SiteView data={published} initialIsPhone={initialIsPhone} />;
  return (
    <EditorApp
      backend={backend}
      published={published}
      initialIsPhone={initialIsPhone}
      onSignOut={() => {
        setEditorFlag(false);
        void fetch('/api/owner/session', { method: 'DELETE' })
          .catch(() => null)
          .then(() => window.location.assign('/'));
      }}
    />
  );
}
