'use client';

import type { ProjectApp } from '@/lib/types';
import { LinkListEditor, ListEditor, Section, TextField, UploadField } from '../fields';
import { RichTextField } from './RichTextField';
import { useContentEditor } from './useContentEditor';

export function ProjectForm({ app }: { app: ProjectApp }) {
  const { set } = useContentEditor(app);
  const c = app.content;
  return (
    <>
      <Section title="Project">
        <UploadField label="Cover image" value={c.coverUrl} onChange={(url) => set('coverUrl', url, true)} />
        <TextField label="Tag" value={c.tag} placeholder="Mobile app · UX research" onChange={(v) => set('tag', v)} />
        <TextField label="Year" value={c.year} onChange={(v) => set('year', v)} />
        <TextField label="Role" value={c.role} onChange={(v) => set('role', v)} />
        <RichTextField label="Description" value={c.body} onChange={(v) => set('body', v)} />
      </Section>
      <Section title="Gallery">
        <ListEditor
          label="Images"
          items={c.gallery}
          onChange={(items, s) => set('gallery', items, s)}
          create={() => ({ url: '', caption: '' })}
          itemTitle={(g) => g.caption}
          addLabel="Add image"
          render={(g, update) => (
            <>
              <UploadField label="Image" value={g.url} onChange={(url) => update({ ...g, url })} />
              <TextField label="Caption" value={g.caption} onChange={(caption) => update({ ...g, caption })} />
            </>
          )}
        />
      </Section>
      <Section title="Links">
        <LinkListEditor label="Buttons" items={c.links} onChange={(items, s) => set('links', items, s)} />
      </Section>
    </>
  );
}
