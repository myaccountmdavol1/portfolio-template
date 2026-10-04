'use client';

import { RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { ChatLog } from '@/lib/chat/log';
import { useEditor } from '../EditorContext';
import { Section, smallButton } from '../fields';

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Read what visitors asked the Messages app (and what the AI answered). */
export function ChatLogs({ appId }: { appId: string }) {
  const editor = useEditor();
  const store = editor?.chatLogs ?? null;
  const [logs, setLogs] = useState<ChatLog[] | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!store) return;
    setError(false);
    try {
      setLogs((await store.list()).filter((l) => l.appId === appId));
    } catch (err) {
      console.error('Could not load conversations', err);
      setError(true);
    }
  }, [store, appId]);

  // First load (state is only set in the promise callbacks, after the effect).
  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    store.list().then(
      (all) => !cancelled && setLogs(all.filter((l) => l.appId === appId)),
      (err: unknown) => {
        console.error('Could not load conversations', err);
        if (!cancelled) setError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [store, appId]);

  if (!store) {
    return (
      <Section title="Conversations">
        <p className="m-0 text-xs text-[#6b675f]">Conversations are saved on your live site (with Firebase connected), not in this local preview.</p>
      </Section>
    );
  }

  return (
    <Section title={`Conversations${logs ? ` (${logs.length})` : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#6b675f]">Newest first</span>
        <button type="button" onClick={() => void load()} className={smallButton}>
          <RefreshCw size={12} aria-hidden /> Refresh
        </button>
      </div>
      {error && (
        <p role="alert" className="m-0 text-xs text-[#b3261e]">
          Couldn’t load conversations.{' '}
          <button type="button" onClick={() => void load()} className="cursor-pointer underline">
            Retry
          </button>
        </p>
      )}
      {logs === null && !error && <p className="m-0 text-xs text-[#6b675f]">Loading…</p>}
      {logs?.length === 0 && <p className="m-0 text-xs text-[#6b675f]">No one has sent a message yet.</p>}
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {logs?.map((log) => {
          const first = log.turns.find((t) => t.role === 'user')?.content ?? '';
          const expanded = open === log.id;
          return (
            <li key={log.id} className="rounded-md border border-black/10 bg-white">
              <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : log.id)} className="flex w-full cursor-pointer flex-col items-start gap-0.5 px-2.5 py-2 text-left">
                <span className="w-full truncate text-[13px] font-medium">{first}</span>
                <span className="text-[11px] text-[#6b675f]">
                  {when(log.updatedAt)} · {log.messageCount} message{log.messageCount === 1 ? '' : 's'}
                </span>
              </button>
              {expanded && (
                <div className="flex flex-col gap-1 border-t border-black/5 p-2 text-[12px] leading-snug">
                  {log.turns.map((t, i) => (
                    <div key={i} className={`max-w-[85%] rounded-2xl px-2.5 py-1.5 ${t.role === 'user' ? 'self-end bg-[#0a84ff] text-white' : 'self-start bg-[#e9e9eb]'}`}>
                      {t.content}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm('Delete this conversation? This can’t be undone.')) return;
                      await store.remove(log.id);
                      setLogs((prev) => prev?.filter((l) => l.id !== log.id) ?? null);
                    }}
                    className={`${smallButton} mt-1 self-start text-[#c0362c]`}
                  >
                    <Trash2 size={12} aria-hidden /> Delete
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
