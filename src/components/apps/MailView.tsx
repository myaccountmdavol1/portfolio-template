'use client';

import { Send } from 'lucide-react';
import { useState } from 'react';
import { useSite } from '@/components/SiteContext';
import { composeLinks, CONTACT_LIMITS, isEmail } from '@/lib/contact';
import { rememberVisitorName } from '@/lib/gameEvents';
import type { MailApp } from '@/lib/types';

type SendState = { kind: 'idle' | 'sending' | 'sent' } | { kind: 'error'; error: string };

/**
 * A Mail compose window addressed to the owner. Send stores the message in the owner's inbox (works for
 * everyone); Gmail / Outlook / Mail-app links are there for people who'd rather use their own email.
 */
export function MailView({ app }: { app: MailApp }) {
  const site = useSite();
  const to = (app.content.to || site?.data.site.email || '').trim();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(app.content.subject);
  const [body, setBody] = useState('');
  const [state, setState] = useState<SendState>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);

  async function send() {
    setState({ kind: 'sending' });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: app.id, name, email, subject, message: body }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setState({ kind: 'error', error: json.error ?? 'Couldn’t send — try one of the email links below.' });
      else {
        setState({ kind: 'sent' });
        rememberVisitorName(name);
      }
    } catch {
      setState({ kind: 'error', error: 'Couldn’t send — check your connection, or use an email link below.' });
    }
  }

  const row = 'flex items-center gap-2 border-b border-black/10 px-4 py-2 text-[13px]';
  const label = 'w-16 flex-none text-[#8e8e93]';
  const links = isEmail(to) ? composeLinks(to, subject, body) : null;

  if (state.kind === 'sent') {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 bg-white p-8 text-center text-[#1d1d1f]">
        <span aria-hidden className="keep-colors text-4xl">
          ✉️
        </span>
        <p role="status" className="m-0 text-lg font-semibold">
          Message sent!
        </p>
        <p className="m-0 text-sm text-[#6e6e73]">Thanks, {name.split(' ')[0]} — I’ll reply to {email}.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
      className="flex min-h-[420px] flex-col bg-white text-[#1d1d1f]"
    >
      <div className="flex flex-none items-center justify-between gap-2 border-b border-black/10 px-4 py-2">
        <span className="min-w-0 text-[13px] text-[#6e6e73]">{app.content.intro}</span>
        <button
          type="submit"
          disabled={state.kind === 'sending'}
          className="flex flex-none cursor-pointer items-center gap-1.5 rounded-md bg-[#0a84ff] px-3 py-1 text-[13px] font-semibold text-white hover:bg-[#0071e3] disabled:opacity-50"
        >
          <Send size={13} aria-hidden /> {state.kind === 'sending' ? 'Sending…' : 'Send'}
        </button>
      </div>
      {to && (
        <div className={row}>
          <span className={label}>To:</span>
          <span className="min-w-0 flex-1 truncate">
            <span className="rounded-full bg-[#0a84ff]/10 px-2 py-0.5 text-[#0a84ff]">{to}</span>
          </span>
          <button
            type="button"
            onClick={() =>
              void navigator.clipboard?.writeText(to).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              })
            }
            className="flex-none cursor-pointer text-xs text-[#0a84ff] hover:underline"
          >
            {copied ? 'Copied!' : 'Copy address'}
          </button>
        </div>
      )}
      <label className={row}>
        <span className={label}>From:</span>
        <input aria-label="Your name" required maxLength={CONTACT_LIMITS.name} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" />
      </label>
      <label className={row}>
        <span className={label}>Reply to:</span>
        <input aria-label="Your email" required type="email" maxLength={CONTACT_LIMITS.email} placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" />
      </label>
      <label className={row}>
        <span className={label}>Subject:</span>
        <input aria-label="Subject" maxLength={CONTACT_LIMITS.subject} value={subject} onChange={(e) => setSubject(e.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" />
      </label>
      <textarea
        aria-label="Message"
        required
        maxLength={CONTACT_LIMITS.message}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your message…"
        className="min-h-[180px] flex-1 resize-none bg-transparent p-4 text-[14px] leading-relaxed outline-none"
      />
      {state.kind === 'error' && (
        <p role="alert" className="m-0 px-4 pb-2 text-xs text-[#b3261e]">
          {state.error}
        </p>
      )}
      {links && (
        <p className="m-0 flex flex-none flex-wrap items-center gap-x-3 gap-y-1 border-t border-black/5 px-4 py-2 text-[11px] text-[#8e8e93]">
          Or use your own email:
          <a href={links.gmail} target="_blank" rel="noopener noreferrer" className="text-[#0a84ff] hover:underline">
            Gmail
          </a>
          <a href={links.outlook} target="_blank" rel="noopener noreferrer" className="text-[#0a84ff] hover:underline">
            Outlook
          </a>
          <a href={links.mailto} className="text-[#0a84ff] hover:underline">
            Mail app
          </a>
        </p>
      )}
    </form>
  );
}
