'use client';

import { ArrowUp } from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useSite } from '@/components/SiteContext';
import { createEventReader, type ChatEvent, type ShowEvent } from '@/lib/chat/events';
import { resolveDeepLink } from '@/lib/deepLink';
import { initials } from '@/lib/format';
import { trackEvent } from '@/lib/gameEvents';
import type { MessagesApp } from '@/lib/types';

interface Bubble {
  role: 'user' | 'assistant';
  content: string;
  /** Something the reply opened (or offers to open). */
  show?: ShowEvent;
}

const MAX_CHARS = 600;

/** iMessage-style “Ask me anything”: replies stream from /api/chat, written by AI from the published portfolio. */
export function MessagesView({ app }: { app: MessagesApp }) {
  const c = app.content;
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  // One id per chat window, so the owner reads each conversation as a thread.
  const [conversationId] = useState(() => (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`));
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const site = useSite();
  /** Opens what a reply pointed at, through the same path as a deep link. */
  const openShown = (show: ShowEvent) => {
    if (!site) return;
    const target = resolveDeepLink(site.data, show.open, show.item);
    if (target) site.openTarget(target);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [bubbles]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text: string) {
    const question = text.trim().slice(0, MAX_CHARS);
    if (!question || busy) return;
    const history = [...bubbles, { role: 'user' as const, content: question }];
    setBubbles([...history, { role: 'assistant', content: '' }]);
    setDraft('');
    setBusy(true);
    trackEvent({ type: 'chat' });
    const controller = new AbortController();
    abortRef.current = controller;
    const setReply = (content: string, show?: ShowEvent) =>
      setBubbles((prev) => [...prev.slice(0, -1), { role: 'assistant', content, show }]);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: app.id, conversationId, messages: history.map(({ role, content }) => ({ role, content })) }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        setReply(err?.error ?? 'Sorry — I couldn’t answer just now. Try again in a moment?');
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const events = createEventReader();
      let reply = '';
      let shown: ShowEvent | undefined;
      const apply = (batch: ChatEvent[]) => {
        for (const event of batch) {
          if (event.type === 'text') reply += event.text;
          else if (!shown) {
            shown = event;
            // On a desktop the window opens beside the chat; on a phone it would cover it, so there's only the chip.
            if (site?.variant === 'desktop') openShown(event);
          }
        }
        setReply(reply, shown);
      };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        apply(events.push(decoder.decode(value, { stream: true })));
      }
      apply(events.end());
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setReply('Sorry — I couldn’t answer just now. Try again in a moment?');
    } finally {
      setBusy(false);
    }
  }

  const waiting = busy && bubbles.at(-1)?.content === '';
  return (
    <div className="flex h-[min(560px,70dvh)] flex-col bg-white text-[#1d1d1f]">
      <div className="flex flex-none flex-col items-center gap-1 border-b border-black/10 bg-[#f6f6f6]/90 py-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[#a4a9b3] to-[#868b94] text-sm font-semibold text-white">
          {initials(c.contactName) || '•'}
        </span>
        <span className="text-xs font-medium">{c.contactName}</span>
      </div>

      <div ref={scrollRef} role="log" aria-label="Conversation" aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-3 text-[15px] leading-snug">
        <p className="m-0 mb-1 text-center text-[11px] text-[#8e8e93]">Replies are written by AI from {c.contactName}’s portfolio. Chats are saved so {c.contactName} can read them.</p>
        <div className="max-w-[78%] self-start rounded-[18px] bg-[#e9e9eb] px-3 py-2">{c.greeting}</div>
        {bubbles.map((b, i) =>
          b.role === 'user' ? (
            <div key={i} data-role="user" className="max-w-[78%] self-end whitespace-pre-wrap rounded-[18px] bg-[#0a84ff] px-3 py-2 text-white">
              {b.content}
            </div>
          ) : b.content || b.show ? (
            <Fragment key={i}>
              {b.content && (
                <div data-role="assistant" className="max-w-[78%] self-start whitespace-pre-wrap rounded-[18px] bg-[#e9e9eb] px-3 py-2">
                  {b.content}
                </div>
              )}
              {b.show && (
                <button
                  type="button"
                  onClick={() => openShown(b.show!)}
                  className="max-w-[78%] cursor-pointer self-start truncate rounded-full border border-[#0a84ff]/40 px-3 py-1 text-[13px] font-medium text-[#0a84ff] hover:bg-[#0a84ff]/10"
                >
                  {b.show.label} →
                </button>
              )}
            </Fragment>
          ) : null,
        )}
        {waiting && (
          <div aria-label="Typing" className="flex gap-1 self-start rounded-[18px] bg-[#e9e9eb] px-3.5 py-3">
            {[0, 150, 300].map((d) => (
              <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-[#8e8e93] motion-reduce:animate-none" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        )}
      </div>

      {bubbles.length === 0 && c.suggestions.length > 0 && (
        <div className="flex flex-none gap-1.5 overflow-x-auto px-3 pb-2">
          {c.suggestions.map((s) => (
            <button key={s} type="button" onClick={() => void send(s)} className="flex-none cursor-pointer rounded-full border border-[#0a84ff]/40 px-3 py-1.5 text-[13px] text-[#0a84ff] hover:bg-[#0a84ff]/10">
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
        className="flex flex-none items-center gap-2 border-t border-black/10 px-3 py-2"
      >
        <input
          aria-label="Message"
          value={draft}
          maxLength={MAX_CHARS}
          placeholder="iMessage"
          onChange={(e) => setDraft(e.target.value)}
          className="min-w-0 flex-1 rounded-full border border-black/15 px-3.5 py-1.5 text-[15px] outline-none focus:border-[#0a84ff]"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={busy || !draft.trim()}
          className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-[#0a84ff] text-white disabled:cursor-default disabled:opacity-35"
        >
          <ArrowUp size={18} aria-hidden />
        </button>
      </form>
    </div>
  );
}
