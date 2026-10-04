'use client';

import type { StatusApp } from '@/lib/types';
import { ColorField, Section, TextField } from '../fields';
import { useContentEditor } from './useContentEditor';

const PRESETS = [
  { emoji: '👋', headline: 'Open to work', color: '#34c759' },
  { emoji: '🚀', headline: 'Currently building', color: '#0a84ff' },
  { emoji: '🎓', headline: 'Studying', color: '#af52de' },
  { emoji: '🌴', headline: 'Away until…', color: '#ff9f0a' },
];

export function StatusForm({ app }: { app: StatusApp }) {
  const { set, patch } = useContentEditor(app);
  const c = app.content;
  return (
    <Section title="Status">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.headline}
            type="button"
            onClick={() => patch(p)}
            className="cursor-pointer rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs hover:bg-black/5"
          >
            {p.emoji} {p.headline}
          </button>
        ))}
      </div>
      <TextField label="Emoji" value={c.emoji} onChange={(v) => set('emoji', v)} />
      <TextField label="Headline" value={c.headline} onChange={(v) => set('headline', v)} />
      <TextField label="Detail" multiline value={c.detail} onChange={(v) => set('detail', v)} />
      <ColorField label="Dot colour" value={c.color} onChange={(v) => set('color', v)} />
    </Section>
  );
}
