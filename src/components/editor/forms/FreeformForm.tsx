'use client';

import type { FreeformApp } from '@/lib/types';
import { Section, TextField, Toggle } from '../fields';
import { useContentEditor } from './useContentEditor';

export function FreeformForm({ app }: { app: FreeformApp }) {
  const { set } = useContentEditor(app);
  return (
    <Section title="Freeform">
      <TextField label="Prompt on the empty canvas" value={app.content.prompt} onChange={(v) => set('prompt', v)} />
      <Toggle label="Let visitors send drawings to the guestbook" checked={app.content.allowSend} onChange={(v) => set('allowSend', v, true)} />
      <p className="m-0 text-[11px] text-[#6b675f]">Needs a Stickies guestbook app. Drawings follow its approval setting.</p>
    </Section>
  );
}
