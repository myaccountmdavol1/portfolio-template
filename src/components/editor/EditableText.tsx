'use client';

import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';

interface EditableTextProps {
  value: string;
  /** Accessible name, e.g. "Headline first line". */
  label: string;
  onCommit: (next: string) => void;
  /** Called after every blur, committed or not (e.g. to leave rename mode). */
  onDone?: () => void;
  /** Allow committing an empty string (the caller decides what that means, e.g. delete a note item). */
  allowEmpty?: boolean;
  autoFocus?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Inline text editing in place. Enter or clicking away saves; Esc cancels.
 * The text is written into the DOM by effect (not as React children) so React never fights the caret.
 */
export function EditableText({ value, label, onCommit, onDone, allowEmpty = false, autoFocus = false, className, style }: EditableTextProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el) el.textContent = value;
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!autoFocus || !el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [autoFocus]);

  return (
    <span
      ref={ref}
      role="textbox"
      aria-label={label}
      tabIndex={0}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck={false}
      className={`cursor-text rounded-sm outline-none hover:outline-dashed hover:outline-1 hover:outline-black/30 focus:outline-2 focus:outline-solid focus:outline-[#0a84ff] ${className ?? ''}`}
      style={style}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          e.currentTarget.textContent = value;
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => {
        const next = (e.currentTarget.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (next !== value && (next || allowEmpty)) onCommit(next);
        else e.currentTarget.textContent = value;
        onDone?.();
      }}
    />
  );
}
