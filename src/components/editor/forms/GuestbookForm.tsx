'use client';

import { Check, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StickyCard } from '@/components/apps/GuestbookView';
import type { GuestbookNote } from '@/lib/guestbook/notes';
import type { GuestbookApp } from '@/lib/types';
import { useEditor } from '../EditorContext';
import { ListEditor, Section, smallButton, TextField, Toggle, UploadField } from '../fields';
import { useContentEditor } from './useContentEditor';

export function GuestbookForm({ app }: { app: GuestbookApp }) {
  const { set } = useContentEditor(app);
  const c = app.content;
  return (
    <>
      <Section title="Guestbook">
        <TextField label="Heading" value={c.heading} onChange={(v) => set('heading', v)} />
        <TextField label="Placeholder text" value={c.prompt} onChange={(v) => set('prompt', v)} />
        <Toggle label="Approve notes before they appear" checked={c.requireApproval} onChange={(v) => set('requireApproval', v, true)} />
        <p className="m-0 text-[11px] text-[#6b675f]">Recommended: new notes stay hidden until you approve them below. Changes apply after you Publish.</p>
      </Section>
      <Section title="Stickers">
        <p className="m-0 text-[11px] text-[#6b675f]">Visitors can put up to 3 stickers on their note. Transparent PNGs look best.</p>
        <Toggle label="Offer the built-in emoji stickers" checked={c.emojiStickers !== false} onChange={(v) => set('emojiStickers', v, true)} />
        <ListEditor
          label="Your sticker library"
          items={c.stickers ?? []}
          onChange={(items, s) => set('stickers', items, s)}
          create={() => ({ label: 'Sticker', url: '' })}
          itemTitle={(st) => st.label}
          addLabel="Add sticker"
          render={(st, update) => (
            <>
              <UploadField label="Sticker image" value={st.url} onChange={(url) => update({ ...st, url })} />
              <TextField label="Name (for screen readers)" value={st.label} onChange={(label) => update({ ...st, label })} />
            </>
          )}
        />
      </Section>
      <Moderation appId={app.id} />
    </>
  );
}

function Moderation({ appId }: { appId: string }) {
  const editor = useEditor();
  const store = editor?.guestbook ?? null;
  const [notes, setNotes] = useState<GuestbookNote[] | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    store.list(appId).then(
      (list) => {
        if (cancelled) return;
        setNotes(list);
        setError(false);
      },
      (err: unknown) => {
        console.error('Could not load guestbook notes', err);
        if (!cancelled) setError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [store, appId, reload]);

  if (!store) {
    return (
      <Section title="Notes">
        <p className="m-0 text-xs text-[#6b675f]">Visitors’ notes are collected on your live site (with Firebase connected), not in this local preview.</p>
      </Section>
    );
  }

  const pending = notes?.filter((n) => n.status === 'pending') ?? [];
  const approved = notes?.filter((n) => n.status === 'approved') ?? [];
  const act = async (fn: () => Promise<void>) => {
    await fn();
    setReload((n) => n + 1);
  };

  const list = (items: GuestbookNote[], canApprove: boolean) => (
    <div className="flex flex-col gap-3">
      {items.map((n, i) => (
        <div key={n.id} className="flex flex-col gap-1.5">
          <StickyCard note={n} index={i} />
          <div className="flex gap-1.5">
            {canApprove && (
              <button type="button" onClick={() => void act(() => store.approve(n.id))} className={`${smallButton} text-[#1f7a35]`}>
                <Check size={12} aria-hidden /> Approve
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete ${n.name}’s note? This can’t be undone.`)) void act(() => store.remove(n.id));
              }}
              className={`${smallButton} text-[#c0362c]`}
            >
              <Trash2 size={12} aria-hidden /> Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Section title={`Waiting for approval${notes ? ` (${pending.length})` : ''}`}>
        <button type="button" onClick={() => setReload((n) => n + 1)} className={`${smallButton} self-start`}>
          <RefreshCw size={12} aria-hidden /> Refresh
        </button>
        {error && (
          <p role="alert" className="m-0 text-xs text-[#b3261e]">
            Couldn’t load notes.
          </p>
        )}
        {notes === null && !error && <p className="m-0 text-xs text-[#6b675f]">Loading…</p>}
        {notes && pending.length === 0 && <p className="m-0 text-xs text-[#6b675f]">Nothing new.</p>}
        {list(pending, true)}
      </Section>
      <Section title={`On the wall${notes ? ` (${approved.length})` : ''}`}>
        {notes && approved.length === 0 && <p className="m-0 text-xs text-[#6b675f]">No approved notes yet.</p>}
        {list(approved, false)}
      </Section>
    </>
  );
}
