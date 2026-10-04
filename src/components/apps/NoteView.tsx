'use client';

import { useState } from 'react';
import type { NoteApp, NoteContent } from '@/lib/types';

export const NOTE_YELLOW = 'oklch(0.94 0.08 95)';
export const NOTE_INK = '#2b2618';

export function NoteChecklist({ items }: { items: NoteContent['items'] }) {
  const [done, setDone] = useState(() => items.map((item) => item.done));
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {items.map((item, i) => {
        const checked = done[i] ?? false;
        return (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-2 text-[13px] leading-snug">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => setDone((prev) => prev.map((v, j) => (j === i ? !v : v)))}
                className="mt-0.5 h-[13px] w-[13px] flex-none accent-[#2b2618]"
              />
              <span style={{ textDecoration: checked ? 'line-through' : 'none', opacity: checked ? 0.7 : 1 }}>{item.text}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export function NoteView({ app }: { app: NoteApp }) {
  return (
    <div className="min-h-full p-5" style={{ background: NOTE_YELLOW, color: NOTE_INK }}>
      <h2 className="m-0 mb-2.5 font-serif text-[26px] font-normal">{app.content.title}</h2>
      <NoteChecklist items={app.content.items} />
    </div>
  );
}
