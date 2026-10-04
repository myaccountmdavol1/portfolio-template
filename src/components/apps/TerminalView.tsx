'use client';

import { useEffect, useRef, useState } from 'react';
import { useSite } from '@/components/SiteContext';
import { trackEvent } from '@/lib/gameEvents';
import { runTerminalCommand } from '@/lib/terminal';
import type { TerminalApp } from '@/lib/types';

const PROMPT = 'visitor@portfolio ~ %';

/** A pretend zsh that explores the portfolio: ls, open, cat, contact… plus a few easter eggs. */
export function TerminalView({ app }: { app: TerminalApp }) {
  const site = useSite();
  const [lines, setLines] = useState<{ text: string; kind: 'out' | 'in' }[]>(() =>
    app.content.welcome.split('\n').map((text) => ({ text, kind: 'out' as const })),
  );
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [lines]);

  function run() {
    const command = input;
    setInput('');
    setCursor(null);
    if (command.trim()) setHistory((h) => [...h, command]);
    if (!site) return;
    const result = runTerminalCommand(command, site.data, app.content);
    if (/^sudo\b/i.test(command.trim())) trackEvent({ type: 'sudo' });
    if (result.clear) {
      setLines([]);
      return;
    }
    setLines((prev) => [...prev, { text: `${PROMPT} ${command}`, kind: 'in' }, ...result.lines.map((text) => ({ text, kind: 'out' as const }))]);
    if (result.openAppId) window.setTimeout(() => site.openApp(result.openAppId!), 250);
  }

  return (
    <div
      className="h-[min(420px,60dvh)] cursor-text overflow-y-auto bg-[#1e1e1e] p-3 font-mono text-[13px] leading-relaxed text-[#e5e5e5] keep-colors"
      onClick={() => inputRef.current?.focus()}
    >
      <div role="log" aria-label="Terminal output" aria-live="polite">
        {lines.map((l, i) => (
          <div key={i} className={`whitespace-pre-wrap break-words ${l.kind === 'in' ? 'text-[#9ad0ff]' : ''}`}>
            {l.text || ' '}
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="flex gap-2"
      >
        <label htmlFor={`${app.id}-cmd`} className="flex-none text-[#8be28b]">
          {PROMPT}
        </label>
        <input
          id={`${app.id}-cmd`}
          ref={inputRef}
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Command"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' && history.length > 0) {
              e.preventDefault();
              const next = cursor === null ? history.length - 1 : Math.max(0, cursor - 1);
              setCursor(next);
              setInput(history[next]);
            } else if (e.key === 'ArrowDown' && cursor !== null) {
              e.preventDefault();
              const next = cursor + 1;
              if (next >= history.length) {
                setCursor(null);
                setInput('');
              } else {
                setCursor(next);
                setInput(history[next]);
              }
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-[#e5e5e5] caret-[#e5e5e5] outline-none"
        />
      </form>
      <div ref={endRef} />
    </div>
  );
}
