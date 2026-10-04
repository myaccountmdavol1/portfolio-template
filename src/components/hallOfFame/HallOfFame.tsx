'use client';

import { useEffect, useState } from 'react';
import { formatDuration } from '@/lib/finale';
import { readProgress, rememberVisitorName, visitorName } from '@/lib/gameEvents';
import { fetchHallOfFame, signHallOfFame } from '@/lib/hallOfFame/client';
import { MAX_NAME, MAX_NOTE, type PublicHallEntry } from '@/lib/hallOfFame/entries';

const SIGNED_KEY = 'portfolio:hallSigned';

function alreadySigned(): boolean {
  try {
    return window.localStorage.getItem(SIGNED_KEY) === '1';
  } catch {
    return false;
  }
}

/** “Sign the Hall of Fame” for a visitor who reached Platinum. Names wait for the owner's approval. */
export function HallOfFameSign({ dark = false }: { dark?: boolean }) {
  const [name, setName] = useState(() => (typeof window === 'undefined' ? '' : (visitorName() ?? '')));
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>(() => (typeof window !== 'undefined' && alreadySigned() ? 'done' : 'idle'));
  const [error, setError] = useState('');

  async function sign() {
    setState('sending');
    const { startedAt, finishedAt } = readProgress();
    const result = await signHallOfFame({ name, note, finishedInMs: startedAt && finishedAt ? finishedAt - startedAt : undefined });
    if (result.ok) {
      rememberVisitorName(name);
      try {
        window.localStorage.setItem(SIGNED_KEY, '1');
      } catch {
        // ignore
      }
      setState('done');
    } else {
      setError(result.error);
      setState('error');
    }
  }

  const box = dark ? 'bg-white/10 text-white' : 'bg-[#f1efea] text-[#1d1c1a]';
  const input = `min-w-0 flex-1 rounded-md border px-2 py-1.5 text-sm outline-none focus:border-[#0a84ff] ${dark ? 'border-white/20 bg-black/30 text-white placeholder:text-white/40' : 'border-black/15 bg-white'}`;

  if (state === 'done') {
    return (
      <p role="status" className={`m-0 rounded-2xl p-4 text-center text-sm ${box}`}>
        🏛️ You’re in! Your name shows in the Hall of Fame once it’s approved.
      </p>
    );
  }
  return (
    <form
      aria-label="Sign the Hall of Fame"
      onSubmit={(e) => {
        e.preventDefault();
        void sign();
      }}
      className={`flex flex-col gap-2 rounded-2xl p-4 ${box}`}
    >
      <p className="m-0 text-sm font-semibold">🏛️ Sign the Hall of Fame</p>
      <div className="flex flex-wrap gap-2">
        <input aria-label="Your name" required value={name} maxLength={MAX_NAME} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={input} />
        <input aria-label="A short note (optional)" value={note} maxLength={MAX_NOTE} onChange={(e) => setNote(e.target.value)} placeholder="A short note (optional)" className={`${input} basis-full`} />
      </div>
      <button type="submit" disabled={state === 'sending' || !name.trim()} className="cursor-pointer self-start rounded-full bg-[#ffd60a] px-4 py-1.5 text-sm font-semibold text-black disabled:opacity-40">
        {state === 'sending' ? 'Signing…' : 'Sign'}
      </button>
      {state === 'error' && (
        <p role="alert" className="m-0 text-xs text-[#ff6961]">
          {error}
        </p>
      )}
    </form>
  );
}

/** The approved names, shown in Game Center. */
export function HallOfFameList() {
  const [entries, setEntries] = useState<PublicHallEntry[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchHallOfFame().then((list) => {
      if (!cancelled) setEntries(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-label="Hall of Fame" className="flex flex-col gap-2">
      <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-white/50">🏛️ Hall of Fame · everyone who found it all</h3>
      {entries === null ? (
        <p className="m-0 text-xs text-white/50">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="m-0 text-xs text-white/60">No one yet — reach Platinum to be the first!</p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2">
              <span aria-hidden className="text-lg">
                🏆
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-semibold">{e.name}</span>
                {e.note && <span className="truncate text-xs text-white/70">{e.note}</span>}
              </span>
              {e.finishedInMs && <span className="flex-none text-xs tabular-nums text-white/60">in {formatDuration(e.finishedInMs)}</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
