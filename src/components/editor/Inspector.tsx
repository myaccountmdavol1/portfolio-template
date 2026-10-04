'use client';

import { X } from 'lucide-react';
import { removeDockEntry } from '@/lib/editor/mutations';
import { Section, smallButton } from './fields';
import { useEditor } from './EditorContext';
import { AppContentForm } from './forms/AppContentForm';
import { AppGeneralForm } from './forms/AppGeneralForm';
import { DockLinkForm } from './forms/DockLinkForm';
import { SiteForm } from './forms/SiteForm';

export const INSPECTOR_W = 340;

/** Right-side panel that edits whatever is selected. */
export function Inspector({ fullScreen }: { fullScreen: boolean }) {
  const editor = useEditor();
  if (!editor?.selection) return null;
  const { selection, data } = editor;

  let title = 'Site settings';
  let body = <SiteForm />;
  if (selection.kind === 'app') {
    const app = data.apps.find((a) => a.id === selection.appId);
    if (!app) return null;
    title = app.title;
    // key: switching apps remounts the forms, so no field state leaks between apps.
    body = (
      <div key={app.id}>
        <AppGeneralForm app={app} />
        <AppContentForm app={app} />
      </div>
    );
  } else if (selection.kind === 'dock') {
    const entry = data.layout.desktop.dock[selection.index];
    if (!entry || entry.kind === 'app') return null;
    if (entry.kind === 'url') {
      title = entry.label;
      body = <DockLinkForm key={selection.index} index={selection.index} entry={entry} />;
    } else {
      const index = selection.index;
      title = 'Dock separator';
      body = (
        <Section title="Separator">
          <p className="m-0 text-xs text-[#6b675f]">A divider line in the dock. Drag it sideways to move it.</p>
          <button
            type="button"
            onClick={() => {
              editor.apply((d) => removeDockEntry(d, index));
              editor.select(null);
            }}
            className={`${smallButton} self-start text-[#c0362c]`}
          >
            Remove separator
          </button>
        </Section>
      );
    }
  }

  return (
    <aside
      aria-label="Inspector"
      className="fixed bottom-0 right-0 top-0 z-[9600] flex flex-col border-l border-black/10 bg-[#f6f5f2] text-[13px] text-[#1d1c1a] shadow-[-8px_0_30px_rgba(0,0,0,.08)]"
      style={{ width: fullScreen ? '100%' : INSPECTOR_W }}
    >
      <div className="flex flex-none items-center gap-2 border-b border-black/10 px-4 py-3">
        <h2 className="m-0 min-w-0 flex-1 truncate text-sm font-semibold">{title}</h2>
        <button type="button" aria-label="Close inspector" onClick={() => editor.select(null)} className="cursor-pointer rounded-full p-1 hover:bg-black/5">
          <X size={16} aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-10">{body}</div>
    </aside>
  );
}
