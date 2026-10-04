'use client';

import { Reply, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { composeLinks, type InboxMessage } from '@/lib/contact';
import type { MailApp } from '@/lib/types';
import { useEditor } from '../EditorContext';
import { Section, smallButton, TextField } from '../fields';
import { useContentEditor } from './useContentEditor';

export function MailForm({ app }: { app: MailApp }) {
  const { set } = useContentEditor(app);
  const editor = useEditor();
  const siteEmail = editor?.data.site.email ?? '';
  return (
    <>
      <Section title="Mail">
        <TextField
          label="Your email (for the Gmail/Outlook links)"
          type="email"
          value={app.content.to}
          placeholder={siteEmail || 'you@example.com'}
          onChange={(v) => set('to', v)}
          hint={siteEmail ? `Leave blank to use ${siteEmail} (Site settings).` : 'Or set your email in Site settings.'}
        />
        <TextField label="Subject line" value={app.content.subject} onChange={(v) => set('subject', v)} />
        <TextField label="Intro line" value={app.content.intro} onChange={(v) => set('intro', v)} />
      </Section>
      <Inbox appId={app.id} />
    </>
  );
}

function Inbox({ appId }: { appId: string }) {
  const store = useEditor()?.inbox ?? null;
  const [messages, setMessages] = useState<InboxMessage[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    store.list(appId).then(
      (list) => !cancelled && setMessages(list),
      (err: unknown) => {
        console.error('Could not load inbox', err);
        if (!cancelled) setMessages([]);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [store, appId, reload]);

  if (!store) {
    return (
      <Section title="Inbox">
        <p className="m-0 text-xs text-[#6b675f]">Messages arrive on your live site (with Firebase connected), not in this local preview.</p>
      </Section>
    );
  }

  const unread = messages?.filter((m) => !m.read).length ?? 0;
  return (
    <Section title={`Inbox${messages ? ` (${unread} new)` : ''}`}>
      <button type="button" onClick={() => setReload((n) => n + 1)} className={`${smallButton} self-start`}>
        Refresh
      </button>
      {messages === null && <p className="m-0 text-xs text-[#6b675f]">Loading…</p>}
      {messages?.length === 0 && <p className="m-0 text-xs text-[#6b675f]">No messages yet.</p>}
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {messages?.map((m) => {
          const expanded = open === m.id;
          const reply = composeLinks(m.email, `Re: ${m.subject || 'your message'}`, '');
          return (
            <li key={m.id} className="rounded-md border border-black/10 bg-white">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => {
                  setOpen(expanded ? null : m.id);
                  if (!m.read) {
                    void store.markRead(m.id);
                    setMessages((prev) => prev?.map((x) => (x.id === m.id ? { ...x, read: true } : x)) ?? null);
                  }
                }}
                className="flex w-full cursor-pointer flex-col items-start gap-0.5 px-2.5 py-2 text-left"
              >
                <span className={`w-full truncate text-[13px] ${m.read ? '' : 'font-semibold'}`}>
                  {!m.read && <span aria-label="Unread" className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#0a84ff]" />}
                  {m.name} — {m.subject || '(no subject)'}
                </span>
                <span className="text-[11px] text-[#6b675f]">
                  {new Date(m.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {m.email}
                </span>
              </button>
              {expanded && (
                <div className="flex flex-col gap-2 border-t border-black/5 p-2.5 text-[13px]">
                  <p className="m-0 whitespace-pre-wrap">{m.message}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <a href={reply.gmail} target="_blank" rel="noopener noreferrer" className={smallButton}>
                      <Reply size={12} aria-hidden /> Reply in Gmail
                    </a>
                    <a href={reply.mailto} className={smallButton}>
                      Mail app
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`Delete ${m.name}’s message?`)) return;
                        await store.remove(m.id);
                        setMessages((prev) => prev?.filter((x) => x.id !== m.id) ?? null);
                      }}
                      className={`${smallButton} text-[#c0362c]`}
                    >
                      <Trash2 size={12} aria-hidden /> Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
