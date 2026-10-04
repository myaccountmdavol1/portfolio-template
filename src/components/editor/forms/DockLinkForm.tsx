'use client';

import { AppIcon } from '@/components/AppIcon';
import { removeDockEntry, updateDockEntry } from '@/lib/editor/mutations';
import type { DockEntry } from '@/lib/types';
import { useEditor } from '../EditorContext';
import { Section, smallButton, TextField } from '../fields';

export function DockLinkForm({ index, entry }: { index: number; entry: Extract<DockEntry, { kind: 'url' }> }) {
  const editor = useEditor();
  if (!editor) return null;
  const update = (patch: Partial<typeof entry>, field: string) =>
    editor.apply((d) => updateDockEntry(d, index, { ...entry, ...patch }), `dock:${index}:${field}`);
  return (
    <Section title="Dock link">
      <TextField label="Label" value={entry.label} onChange={(label) => update({ label }, 'label')} />
      <TextField label="URL" type="url" value={entry.url} onChange={(url) => update({ url }, 'url')} hint="https://…, mailto:…, or tel:…" />
      <div className="flex items-center gap-3">
        <AppIcon icon={entry.iconUrl ? { kind: 'image', url: entry.iconUrl } : { kind: 'builtin', name: 'globe' }} size={44} variant="tile" />
        <button type="button" onClick={() => editor.openIconPicker({ kind: 'dock', index })} className={smallButton}>
          Change icon…
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          editor.apply((d) => removeDockEntry(d, index));
          editor.select(null);
        }}
        className={`${smallButton} self-start text-[#c0362c]`}
      >
        Remove from Dock
      </button>
    </Section>
  );
}
