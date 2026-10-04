'use client';

import type { MessagesApp } from '@/lib/types';
import { Section, StringListEditor, TextField } from '../fields';
import { ChatLogs } from './ChatLogs';
import { useContentEditor } from './useContentEditor';

export function MessagesForm({ app }: { app: MessagesApp }) {
  const { set } = useContentEditor(app);
  const c = app.content;
  return (
    <>
      <Section title="Ask me anything">
        <p className="m-0 text-[11px] leading-snug text-[#6b675f]">
          Visitors chat with an AI that answers as you, using only your <strong>published</strong> portfolio plus the notes below. Changes apply after you
          Publish.
        </p>
        <TextField label="Name shown in the chat" value={c.contactName} onChange={(v) => set('contactName', v)} />
        <TextField label="Greeting" multiline value={c.greeting} onChange={(v) => set('greeting', v)} />
        <TextField
          label="Tone & extra facts for the AI"
          multiline
          value={c.persona}
          onChange={(v) => set('persona', v)}
          hint="E.g. “Warm and brief. I’m moving to Denver in 2027. Don’t discuss salary — suggest emailing me.”"
        />
        <StringListEditor label="Suggested questions" items={c.suggestions} onChange={(items, s) => set('suggestions', items, s)} />
      </Section>
      <ChatLogs appId={app.id} />
    </>
  );
}
