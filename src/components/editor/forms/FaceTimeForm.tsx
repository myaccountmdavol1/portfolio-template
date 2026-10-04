'use client';

import type { FaceTimeApp } from '@/lib/types';
import { useEditor } from '../EditorContext';
import { Section, TextField, UploadField } from '../fields';
import { useContentEditor } from './useContentEditor';

export function FaceTimeForm({ app }: { app: FaceTimeApp }) {
  const { set } = useContentEditor(app);
  const editor = useEditor();
  const shared = editor?.data.site.incomingCall.videoUrl;
  return (
    <Section title="FaceTime">
      <TextField label="Line under your name" value={app.content.subtitle} onChange={(v) => set('subtitle', v)} />
      <UploadField label="Video" folder="videos" accept="video/*" value={app.content.videoUrl} onChange={(url) => set('videoUrl', url, true)} />
      <p className="m-0 text-[11px] text-[#6b675f]">
        {shared
          ? 'Leave empty to use your incoming-call video (Site → Incoming call).'
          : 'Upload a short hello video here, or add one under Site → Incoming call and it will be used for both.'}{' '}
        Your name and photo come from Site → Incoming call.
      </p>
    </Section>
  );
}
