'use client';

import { Check, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { achievementStatuses } from '@/lib/achievements';
import { formatDuration } from '@/lib/finale';
import type { HallEntry } from '@/lib/hallOfFame/entries';
import { useEditor } from '../EditorContext';
import type { GameCenterApp } from '@/lib/types';
import { startFinale } from '@/lib/gameEvents';
import { Section, smallButton, TextField, Toggle, UploadField } from '../fields';
import { useContentEditor } from './useContentEditor';

export function GameCenterForm({ app }: { app: GameCenterApp }) {
  const { set } = useContentEditor(app);
  const editor = useEditor();
  const statuses = editor ? achievementStatuses(editor.data) : [];
  const disabled = app.content.disabledAchievements ?? [];
  const toggleAchievement = (id: string, on: boolean) =>
    set('disabledAchievements', on ? disabled.filter((d) => d !== id) : [...disabled, id], true);
  const finale = app.content.finale ?? {};
  const setFinale = (patch: Partial<typeof finale>, structural = false) => set('finale', { ...finale, ...patch }, structural);
  return (
    <>
    <Section title="Game Center">
      <TextField label="Tagline" value={app.content.tagline} onChange={(v) => set('tagline', v)} />
      <p className="m-0 text-[11px] text-[#6b675f]">
        While this app is visible, visitors earn achievements as they explore and see a banner for each one. Progress is kept in their own browser.
      </p>
      <p className="m-0 text-[11px] text-[#6b675f]">
        Untick any you don’t want. Greyed-out ones can’t be earned on your site yet, so they’re left out automatically.
      </p>
      <ul aria-label="Achievements" className="m-0 flex list-none flex-col gap-1.5 p-0 text-xs">
        {statuses.map(({ achievement: a, available, reason, enabled }) => (
          <li key={a.id}>
            <label className={`flex items-start gap-2 ${available ? 'cursor-pointer' : 'opacity-50'}`}>
              <input
                type="checkbox"
                aria-label={a.title}
                disabled={!available}
                checked={available && enabled}
                onChange={(e) => toggleAchievement(a.id, e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 accent-[#0a84ff]"
              />
              <span>
                {a.emoji} <strong>{a.title}</strong> — {a.description}
                {a.secret && <span className="block text-[11px] text-[#6b675f]">Secret bonus{a.hint ? ` (${a.hint})` : ''} — doesn’t count toward Platinum</span>}
                {!available && <span className="block text-[11px] text-[#6b675f]">Unavailable: {reason}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </Section>
    <Section title="Hall of Fame">
      <p className="m-0 text-[11px] leading-snug text-[#6b675f]">
        Visitors who reach Platinum can sign it, with their time. Each name waits for your approval before it appears in Game Center.
      </p>
      <Toggle label="Let Platinum visitors sign the Hall of Fame" checked={app.content.hallOfFame !== false} onChange={(on) => set('hallOfFame', on, true)} />
      {app.content.hallOfFame !== false && <HallModeration />}
    </Section>
    <Section title="The Finale">
      <p className="m-0 text-[11px] leading-snug text-[#6b675f]">
        When a visitor unlocks every achievement: the screen glitches, gravity takes over, their desktop icons become a game of Breakout, then a Platinum trophy, end credits, and your reward. Afterwards their site turns gold with a “Top Secret” folder.
      </p>
      <Toggle label="Play the finale" checked={finale.enabled !== false} onChange={(enabled) => setFinale({ enabled }, true)} />
      <TextField label="Reward message" multiline value={finale.rewardMessage ?? ''} placeholder="Thanks for exploring every corner…" onChange={(rewardMessage) => setFinale({ rewardMessage })} />
      <TextField label="Reward link (optional)" type="url" value={finale.rewardLink ?? ''} placeholder="https://…" onChange={(rewardLink) => setFinale({ rewardLink })} hint="e.g. a booking page, a freebie, or a secret project" />
      <TextField label="Link button text" value={finale.rewardLinkLabel ?? ''} placeholder="Your secret link ↗" onChange={(rewardLinkLabel) => setFinale({ rewardLinkLabel })} />
      <Toggle label="Play music during the credits" checked={finale.music !== false} onChange={(music) => setFinale({ music }, true)} />
      {finale.music !== false && (
        <>
          <UploadField label="Finale song (optional)" folder="audio" accept="audio/*" value={finale.songUrl ?? ''} onChange={(songUrl) => setFinale({ songUrl: songUrl || undefined }, true)} />
          <p className="m-0 -mt-1 text-[11px] text-[#6b675f]">
            MP3 or M4A, up to 25MB. Leave empty for the built-in tune. Use a song you have the rights to share (your own, or royalty-free).
          </p>
        </>
      )}
      <UploadField label="Thank-you video (optional)" folder="videos" accept="video/*" value={finale.videoUrl ?? ''} onChange={(videoUrl) => setFinale({ videoUrl: videoUrl || undefined }, true)} />
      <button type="button" onClick={() => startFinale('full')} className={`${smallButton} self-start`}>
        ▶ Preview the finale
      </button>
    </Section>
    </>
  );
}

function HallModeration() {
  const store = useEditor()?.hallOfFame ?? null;
  const [entries, setEntries] = useState<HallEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    store.list().then(
      (list) => {
        if (cancelled) return;
        setEntries(list);
        setFailed(false);
      },
      (err: unknown) => {
        console.error('Could not load the Hall of Fame', err);
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [store, reload]);

  if (!store) return <p className="m-0 text-xs text-[#6b675f]">Names are collected on your live site (with Firebase connected), not in this local preview.</p>;
  const act = async (fn: () => Promise<void>) => {
    await fn();
    setReload((n) => n + 1);
  };
  const pending = entries?.filter((e) => e.status === 'pending').length ?? 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">{entries ? `${entries.length} signed · ${pending} waiting` : 'Loading…'}</span>
        <button type="button" onClick={() => setReload((n) => n + 1)} className={`${smallButton} ml-auto`}>
          <RefreshCw size={12} aria-hidden /> Refresh
        </button>
      </div>
      {failed && (
        <p role="alert" className="m-0 text-xs text-[#b3261e]">
          Couldn’t load the names. Try Refresh.
        </p>
      )}
      <ul aria-label="Hall of Fame entries" className="m-0 flex list-none flex-col gap-1.5 p-0">
        {entries?.map((e) => (
          <li key={e.id} className="flex flex-col gap-1 rounded-lg border border-black/10 bg-white p-2 text-xs">
            <span>
              <strong>{e.name}</strong>
              {e.finishedInMs ? ` · in ${formatDuration(e.finishedInMs)}` : ''}
              {e.status === 'pending' && <span className="ml-1.5 rounded bg-[#ff9f0a]/20 px-1 text-[10px] font-semibold text-[#8a5300]">Waiting</span>}
            </span>
            {e.note && <span className="text-[#6b675f]">{e.note}</span>}
            <span className="flex gap-1.5">
              {e.status === 'pending' && (
                <button type="button" onClick={() => void act(() => store.approve(e.id))} className={`${smallButton} text-[#1f7a35]`}>
                  <Check size={12} aria-hidden /> Approve
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Remove ${e.name} from the Hall of Fame? This can’t be undone.`)) void act(() => store.remove(e.id));
                }}
                className={`${smallButton} text-[#c0362c]`}
              >
                <Trash2 size={12} aria-hidden /> Remove
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
