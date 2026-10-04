'use client';

import type { PhoneApp } from '@/lib/types';
import { Section, TextField, Toggle } from '../fields';
import { useContentEditor } from './useContentEditor';

export function PhoneForm({ app }: { app: PhoneApp }) {
  const { set } = useContentEditor(app);
  const c = app.content;
  return (
    <Section title="Phone">
      <TextField label="Label" value={c.label} placeholder="Office" onChange={(v) => set('label', v)} />
      <TextField label="Phone number" value={c.number} placeholder="+1 (555) 123-4567" onChange={(v) => set('number', v)} hint="Include the country code (e.g. +1) so it dials correctly from anywhere." />
      <TextField label="Hours" value={c.hours} placeholder="Mon–Fri, 9am–5pm" onChange={(v) => set('hours', v)} />
      <TextField label="Note (optional)" multiline value={c.note} onChange={(v) => set('note', v)} />
      <Toggle label="Show a Message (text) button" checked={c.allowText} onChange={(v) => set('allowText', v, true)} />
    </Section>
  );
}
