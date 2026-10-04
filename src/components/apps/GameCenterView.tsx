'use client';

import { useSyncExternalStore } from 'react';
import { HallOfFameList, HallOfFameSign } from '@/components/hallOfFame/HallOfFame';
import { useSite } from '@/components/SiteContext';
import { ACHIEVEMENTS, activeAchievements, EMPTY_PROGRESS, secretAchievements } from '@/lib/achievements';
import { readProgress, startFinale, subscribeProgress } from '@/lib/gameEvents';
import type { GameCenterApp } from '@/lib/types';

export function GameCenterView({ app }: { app: GameCenterApp }) {
  const progress = useSyncExternalStore(subscribeProgress, readProgress, () => EMPTY_PROGRESS);
  const data = useSite()?.data;
  const list = data ? activeAchievements(data) : ACHIEVEMENTS.filter((a) => !a.secret);
  const secrets = data ? secretAchievements(data) : [];
  const hall = app.content.hallOfFame !== false;
  const platinum = list.length > 0 && list.every((a) => progress.unlocked.includes(a.id));
  const total = Math.max(1, list.length);
  const done = list.filter((a) => progress.unlocked.includes(a.id)).length;
  return (
    <div className="flex flex-col gap-4 bg-gradient-to-b from-[#1c1c2e] to-[#2a1f3d] p-5 text-white keep-colors">
      <div>
        <h2 className="m-0 text-2xl font-bold">Achievements</h2>
        <p className="m-0 mt-1 text-sm text-white/70">{app.content.tagline}</p>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-white/70">
          <span>
            {done} of {list.length} unlocked
          </span>
          <span>{Math.round((done / total) * 100)}%</span>
        </div>
        <div aria-hidden className="h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-gradient-to-r from-[#ff375f] via-[#ff9f0a] to-[#30d158]" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>
      {list.length > 0 && done === list.length && app.content.finale?.enabled !== false && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-gradient-to-r from-[#ffd60a]/25 to-[#ff9f0a]/25 p-3">
          <span className="mr-auto text-sm font-semibold">🏆 Platinum — you found everything!</span>
          <button type="button" onClick={() => startFinale('reward')} className="cursor-pointer rounded-full bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30">
            View your reward
          </button>
          <button type="button" onClick={() => startFinale('full')} className="cursor-pointer rounded-full bg-[#ffd60a] px-3 py-1 text-xs font-semibold text-black">
            Replay the Finale
          </button>
        </div>
      )}
      <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
        {list.map((a) => {
          const unlocked = progress.unlocked.includes(a.id);
          return (
            <li key={a.id} data-unlocked={unlocked} className={`flex items-center gap-3 rounded-xl p-3 ${unlocked ? 'bg-white/15' : 'bg-white/5 opacity-60'}`}>
              <span aria-hidden className={`flex h-11 w-11 flex-none items-center justify-center rounded-full text-2xl ${unlocked ? 'bg-gradient-to-br from-[#ffd60a] to-[#ff9f0a]' : 'bg-white/10 grayscale'}`}>
                {unlocked ? a.emoji : '🔒'}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold">{a.title}</span>
                <span className="text-xs text-white/70">{a.description}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {platinum && hall && <HallOfFameSign dark />}
      {hall && <HallOfFameList />}
      {secrets.length > 0 && (
        <section aria-label="Secret achievements" className="flex flex-col gap-2">
          <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-white/50">Secret · a bonus, not needed for Platinum</h3>
          <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
            {secrets.map((a) => {
              const found = progress.unlocked.includes(a.id);
              return (
                <li key={a.id} data-unlocked={found} className={`flex items-center gap-3 rounded-xl border border-dashed p-3 ${found ? 'border-[#ffd60a]/60 bg-white/15' : 'border-white/20 bg-white/5 opacity-60'}`}>
                  <span aria-hidden className={`flex h-11 w-11 flex-none items-center justify-center rounded-full text-2xl ${found ? 'bg-gradient-to-br from-[#bf5af2] to-[#5e5ce6]' : 'bg-white/10'}`}>
                    {found ? a.emoji : '❓'}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-semibold">{found ? a.title : '???'}</span>
                    <span className="text-xs text-white/70">{found ? a.description : 'Somewhere off the beaten path…'}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
