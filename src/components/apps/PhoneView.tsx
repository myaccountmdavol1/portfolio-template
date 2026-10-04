'use client';

import { Copy, MessageCircle, Phone } from 'lucide-react';
import { useState } from 'react';
import { telHref } from '@/lib/brands';
import type { PhoneApp } from '@/lib/types';

/** Phone: a contact card for the owner's office number. Call / Message use tel: and sms: links. */
export function PhoneView({ app }: { app: PhoneApp }) {
  const c = app.content;
  const tel = telHref(c.number);
  const [copied, setCopied] = useState(false);
  const button = 'flex flex-col items-center gap-1.5 rounded-xl bg-[#f2f2f7] px-4 py-3 text-xs font-medium text-[#0a84ff] hover:bg-[#e5e5ea]';
  return (
    <div className="flex min-h-[320px] flex-col items-center gap-5 bg-white p-8 text-center text-[#1d1d1f]">
      <span aria-hidden className="keep-colors flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-[#5ac85a] to-[#28a745] text-white">
        <Phone size={36} />
      </span>
      <div>
        <div className="text-sm font-medium text-[#6e6e73]">{c.label}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{c.number}</div>
        {c.hours && <div className="mt-1 text-sm text-[#6e6e73]">{c.hours}</div>}
      </div>
      {tel ? (
        <div className="flex gap-2">
          <a href={tel} className={button}>
            <Phone size={20} aria-hidden /> Call
          </a>
          {c.allowText && (
            <a href={tel.replace('tel:', 'sms:')} className={button}>
              <MessageCircle size={20} aria-hidden /> Message
            </a>
          )}
          <button
            type="button"
            onClick={() =>
              void navigator.clipboard?.writeText(c.number).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              })
            }
            className={`${button} cursor-pointer`}
          >
            <Copy size={20} aria-hidden /> {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      ) : (
        <p className="m-0 text-sm text-[#6e6e73]">No number set yet.</p>
      )}
      {c.note && <p className="m-0 max-w-[300px] text-sm text-[#6e6e73]">{c.note}</p>}
    </div>
  );
}
