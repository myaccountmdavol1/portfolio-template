'use client';

import type { AboutApp } from '@/lib/types';
import { LinkListEditor, ListEditor, Section, SelectField, StringListEditor, TextField, Toggle, UploadField } from '../fields';
import { RichTextField } from './RichTextField';
import { useContentEditor } from './useContentEditor';

export function AboutForm({ app }: { app: AboutApp }) {
  const { set } = useContentEditor(app);
  const c = app.content;
  return (
    <>
      <Section title="About">
        <SelectField
          label="Photo or video"
          value={c.media.kind}
          options={[
            { value: 'image', label: 'Photo' },
            { value: 'video', label: 'Video' },
          ]}
          onChange={(kind) => set('media', { ...c.media, kind }, true)}
        />
        {c.media.kind === 'image' ? (
          <UploadField label="Photo" value={c.media.url} onChange={(url) => set('media', { ...c.media, url }, true)} />
        ) : (
          <TextField label="Video URL" type="url" value={c.media.url} onChange={(url) => set('media', { ...c.media, url })} hint="A direct link to an .mp4 file" />
        )}
        <TextField label="Role" value={c.roleTitle} onChange={(v) => set('roleTitle', v)} />
        <RichTextField label="Bio" value={c.bio} onChange={(v) => set('bio', v)} />
      </Section>
      <Section title="Lists">
        <ListEditor
          label="Lists"
          items={c.lists}
          onChange={(items, s) => set('lists', items, s)}
          create={() => ({ heading: 'New list', items: [] })}
          itemTitle={(l) => l.heading}
          addLabel="Add list"
          render={(l, update) => (
            <>
              <TextField label="Heading" value={l.heading} onChange={(heading) => update({ ...l, heading })} />
              <StringListEditor label="Items" items={l.items} onChange={(items) => update({ ...l, items })} />
            </>
          )}
        />
      </Section>
      <Section title="Quote">
        <Toggle label="Show a quote" checked={c.quote !== null} onChange={(on) => set('quote', on ? { text: '', author: '' } : null, true)} />
        {c.quote && (
          <>
            <TextField label="Quote" multiline value={c.quote.text} onChange={(text) => set('quote', { ...c.quote!, text })} />
            <TextField label="Author" value={c.quote.author} onChange={(author) => set('quote', { ...c.quote!, author })} />
          </>
        )}
      </Section>
      <Section title="Contact">
        <LinkListEditor label="Contact links" items={c.contactLinks} onChange={(items, s) => set('contactLinks', items, s)} />
      </Section>
    </>
  );
}
