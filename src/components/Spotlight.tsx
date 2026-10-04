'use client';

import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppIcon } from '@/components/AppIcon';
import { trackEvent } from '@/lib/gameEvents';
import { buildSearchIndex, searchSite } from '@/lib/spotlight';
import type { SiteData } from '@/lib/types';

interface SpotlightProps {
  data: SiteData;
  variant: 'desktop' | 'phone';
  onOpen: (appId: string) => void;
  onClose: () => void;
}

/** macOS-style Spotlight: type to search every app's content, arrows to move, Enter to open. */
export function Spotlight({ data, variant, onOpen, onClose }: SpotlightProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const index = useMemo(() => buildSearchIndex(data), [data]);
  const results = useMemo(() => searchSite(index, query), [index, query]);
  const appsById = useMemo(() => new Map(data.apps.map((a) => [a.id, a])), [data.apps]);
  const selected = Math.min(active, Math.max(0, results.length - 1));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const open = (appId: string) => {
    trackEvent({ type: 'spotlight' });
    onClose();
    onOpen(appId);
  };

  const isPhone = variant === 'phone';
  return (
    <div
      className={`fixed inset-0 z-[9600] flex justify-center ${isPhone ? 'bg-black/30 px-3 pt-[max(16px,env(safe-area-inset-top))] backdrop-blur-md' : 'pt-[18vh]'}`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label="Spotlight Search"
        className="flex h-fit w-[min(640px,100%)] flex-col overflow-hidden rounded-2xl border border-white/40 bg-[#f6f5f2]/85 text-[#1d1c1a] shadow-[0_30px_80px_rgba(0,0,0,.35)] backdrop-blur-2xl"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <Search size={22} aria-hidden className="flex-none opacity-50" />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-label="Spotlight Search"
            aria-expanded={results.length > 0}
            aria-controls="spotlight-results"
            aria-activedescendant={results[selected] ? `spotlight-${results[selected].appId}` : undefined}
            placeholder="Spotlight Search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((selected + 1) % Math.max(1, results.length));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((selected - 1 + results.length) % Math.max(1, results.length));
              } else if (e.key === 'Enter' && results[selected]) {
                open(results[selected].appId);
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-[22px] font-light outline-none placeholder:text-[#1d1c1a]/40 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
        {query.trim() && (
          <ul id="spotlight-results" role="listbox" aria-label="Results" className="m-0 max-h-[50vh] list-none overflow-y-auto border-t border-black/10 p-1.5">
            {results.length === 0 && <li className="px-3 py-4 text-sm text-[#6b675f]">No results for “{query.trim()}”</li>}
            {results.map((r, i) => {
              const app = appsById.get(r.appId);
              return (
                <li
                  key={r.appId}
                  id={`spotlight-${r.appId}`}
                  role="option"
                  aria-selected={i === selected}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => open(r.appId)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 aria-selected:bg-[#0a84ff] aria-selected:text-white"
                >
                  {app && <AppIcon icon={app.icon} size={32} variant="tile" />}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{r.title}</span>
                    <span className="truncate text-xs opacity-65">{r.snippet || r.subtitle}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/** ⌘K / Ctrl+K anywhere, or "/" when not typing, opens Spotlight. */
export function useSpotlightShortcut(open: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, enabled]);
}
