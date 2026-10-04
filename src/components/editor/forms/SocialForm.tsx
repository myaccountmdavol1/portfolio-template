'use client';

import { socialBrand } from '@/lib/brands';
import type { SocialApp } from '@/lib/types';
import { ListEditor, Section, TextField } from '../fields';
import { useContentEditor } from './useContentEditor';

export function SocialForm({ app }: { app: SocialApp }) {
  const { set } = useContentEditor(app);
  const c = app.content;
  return (
    <Section title="Social">
      <TextField label="Heading" value={c.heading} onChange={(v) => set('heading', v)} />
      <ListEditor
        label="Profiles"
        items={c.links}
        onChange={(items, s) => set('links', items, s)}
        create={() => ({ url: 'https://', label: '' })}
        itemTitle={(l) => socialBrand(l.url).name}
        addLabel="Add profile"
        render={(l, update) => (
          <>
            <TextField
              label="Profile link"
              type="url"
              value={l.url}
              onChange={(url) => update({ ...l, url })}
              hint="Facebook, X, Bluesky, Instagram, Threads, TikTok, Discord, Reddit, LinkedIn, YouTube, Twitch, GitHub, Mastodon… recognised automatically."
            />
            <TextField label="Shown as (optional)" value={l.label} placeholder="@yourhandle" onChange={(label) => update({ ...l, label })} />
          </>
        )}
      />
    </Section>
  );
}
