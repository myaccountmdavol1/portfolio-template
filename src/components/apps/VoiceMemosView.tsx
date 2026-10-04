'use client';

import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { VoiceMemosApp } from '@/lib/types';

const time = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '–:––');

/** Voice Memos: a list of short recordings, one playing at a time. */
export function VoiceMemosView({ app }: { app: VoiceMemosApp }) {
  const memos = app.content.memos.filter((m) => m.url);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [progress, setProgress] = useState({ at: 0, duration: 0 });

  useEffect(() => () => audioRef.current?.pause(), []);

  function toggle(i: number) {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing === i) {
      audio.pause();
      setPlaying(null);
      return;
    }
    audio.src = memos[i].url;
    void audio.play().then(() => setPlaying(i)).catch(() => setPlaying(null));
  }

  return (
    <div className="flex min-h-[260px] flex-col bg-white text-[#1d1d1f]">
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setProgress({ at: e.currentTarget.currentTime, duration: e.currentTarget.duration })}
        onEnded={() => setPlaying(null)}
        className="hidden"
      />
      <h2 className="m-0 px-4 pb-1 pt-4 text-2xl font-bold">All Recordings</h2>
      {memos.length === 0 && <p className="m-0 p-6 text-center text-sm text-[#6e6e73]">No recordings yet.</p>}
      <ul className="m-0 list-none p-0">
        {memos.map((m, i) => (
          <li key={m.url + i} className="border-b border-black/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={playing === i ? `Pause ${m.title}` : `Play ${m.title}`}
                onClick={() => toggle(i)}
                className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full bg-[#ff3b30] text-white"
              >
                {playing === i ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden className="ml-0.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold">{m.title}</div>
                <div className="text-xs text-[#8e8e93]">{m.recordedOn}</div>
              </div>
              {playing === i && (
                <span className="text-xs tabular-nums text-[#8e8e93]">
                  {time(progress.at)} / {time(progress.duration)}
                </span>
              )}
            </div>
            {playing === i && (
              <div aria-hidden className="mt-2 h-1 overflow-hidden rounded-full bg-black/10">
                <div className="h-full bg-[#ff3b30]" style={{ width: `${progress.duration ? (progress.at / progress.duration) * 100 : 0}%` }} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
