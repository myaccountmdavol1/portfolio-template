'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { playFinaleTune } from './finaleAudio';

/** Movie-style rolling credits with a gentle tune (mutable). */
export function Credits({ lines, onDone, songUrl, music = true }: { lines: string[]; onDone: () => void; songUrl?: string; music?: boolean }) {
  const [muted, setMuted] = useState(!music);
  const stop = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // The owner's song if they uploaded one, otherwise the built-in tune.
  useEffect(() => {
    if (muted) return;
    if (songUrl) {
      const audio = audioRef.current;
      if (!audio) return;
      audio.volume = 0.7;
      // Browsers can block sound without a recent click; fall back to muted with a “Play music” button.
      void audio.play().catch(() => setMuted(true));
      return () => audio.pause();
    }
    stop.current = playFinaleTune();
    return () => {
      stop.current?.();
      stop.current = null;
    };
  }, [muted, songUrl]);

  const seconds = Math.max(14, lines.length * 1.3);
  return (
    <div data-testid="finale-credits" className="fixed inset-0 z-[9955] overflow-hidden bg-gradient-to-b from-black via-[#0b0b14] to-black text-white">
      {songUrl && <audio ref={audioRef} src={songUrl} loop preload="auto" data-testid="finale-song" />}
      <div className="credits-roll absolute inset-x-0 top-full flex flex-col items-center gap-2 px-6 text-center" style={{ animationDuration: `${seconds}s` }} onAnimationEnd={onDone}>
        {lines.map((line, i) => {
          const heading = line === 'Starring' || line === 'Special thanks' || line === 'A portfolio by';
          return (
            <p key={i} className={`m-0 ${heading ? 'mt-6 text-xs uppercase tracking-[.3em] text-white/50' : line ? 'font-serif text-3xl' : 'h-6'}`}>
              {line}
            </p>
          );
        })}
      </div>
      <div className="fixed bottom-6 right-6 flex gap-2">
        <button type="button" aria-label={muted ? 'Play music' : 'Mute music'} onClick={() => setMuted((m) => !m)} className="cursor-pointer rounded-full bg-white/15 p-2 hover:bg-white/25">
          {muted ? <VolumeX size={16} aria-hidden /> : <Volume2 size={16} aria-hidden />}
        </button>
        <button type="button" onClick={onDone} className="cursor-pointer rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25">
          Skip ›
        </button>
      </div>
    </div>
  );
}
