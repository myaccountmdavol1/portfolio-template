'use client';

import { useId, useState } from 'react';
import { richTextToText, sameRichText, textToRichText } from '@/lib/editor/richText';
import type { RichText } from '@/lib/types';
import { inputClass } from '../fields';

/**
 * Keeps the raw text locally (so blank lines survive while typing) and only resyncs when the saved
 * value changes from outside, e.g. undo.
 */
export function RichTextField({ label, value, onChange }: { label: string; value: RichText; onChange: (v: RichText) => void }) {
  const id = useId();
  const [text, setText] = useState(() => richTextToText(value));
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    if (!sameRichText(textToRichText(text), value)) setText(richTextToText(value));
  }
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-[#3d3a35]">
        {label}
      </label>
      <textarea
        id={id}
        rows={7}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(textToRichText(e.target.value));
        }}
        className={`${inputClass} resize-y leading-relaxed`}
      />
      <p className="m-0 mt-1 text-[11px] text-[#6b675f]">Leave a blank line between paragraphs. Start a line with “## ” for a heading.</p>
    </div>
  );
}
