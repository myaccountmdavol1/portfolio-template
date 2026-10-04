'use client';

import type { NoteApp } from '@/lib/types';
import { ListEditor, Section, TextField, Toggle } from '../fields';
import { useContentEditor } from './useContentEditor';

export function NoteForm({ app }: { app: NoteApp }) {
  const { set } = useContentEditor(app);
  const c = app.content;
  return (
    <Section title="Note">
      <TextField label="Title" value={c.title} onChange={(v) => set('title', v)} />
      <ListEditor
        label="Items"
        items={c.items}
        onChange={(items, s) => set('items', items, s)}
        create={() => ({ text: 'New item', done: false })}
        itemTitle={(i) => i.text}
        addLabel="Add item"
        render={(i, update) => (
          <>
            <TextField label="Text" value={i.text} onChange={(text) => update({ ...i, text })} />
            <Toggle label="Done" checked={i.done} onChange={(done) => update({ ...i, done })} />
          </>
        )}
      />
    </Section>
  );
}
