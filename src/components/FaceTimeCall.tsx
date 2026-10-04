'use client';

import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '@/hooks/useDialogFocus';

interface FaceTimeCallProps {
  callerName: string;
  videoUrl: string;
  variant: 'desktop' | 'phone';
  /** Called when the visitor hangs up or the video finishes. */
  onEnd: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** A FaceTime-style call that plays the owner's intro video. Answering was a click, so sound can autoplay. */
export function FaceTimeCall({ callerName, videoUrl, variant, onEnd }: FaceTimeCallProps) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  // Read the video's real shape once it loads, so vertical (phone) videos get a portrait window.
  const [portrait, setPortrait] = useState(false);
  useDialogFocus(ref);

  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    // If the browser still blocks sound, fall back to muted playback rather than a frozen frame.
    const video = videoRef.current;
    video?.play().catch(() => {
      video.muted = true;
      setMuted(true);
      void video.play().catch(() => {});
    });
  }, []);

  const isPhone = variant === 'phone';
  // Rendered at the top of the page (a portal), so an app window it's opened from can't clip or shrink it.
  return createPortal(
    <div className={`fixed inset-0 z-[9700] flex items-center justify-center ${isPhone ? 'bg-black' : 'bg-black/55 backdrop-blur-sm'}`}>
      <div
        ref={ref}
        role="dialog"
        aria-label={`FaceTime with ${callerName}`}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onEnd();
          }
        }}
        data-orientation={portrait ? 'portrait' : 'landscape'}
        className={`relative overflow-hidden bg-black text-white outline-none ${
          isPhone
            ? 'h-full w-full'
            : portrait
              ? 'aspect-[9/16] h-[min(86dvh,900px)] max-w-[calc(100%-48px)] rounded-[28px] shadow-[0_40px_100px_rgba(0,0,0,.5)]'
              : 'aspect-video w-[min(960px,calc(100%-48px))] rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,.5)]'
        }`}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          autoPlay
          muted={muted}
          onEnded={onEnd}
          onLoadedMetadata={(e) => setPortrait(e.currentTarget.videoHeight > e.currentTarget.videoWidth)}
          // On a phone screen a sideways video is shown whole (letterboxed) rather than cropped to a sliver.
          // When the video must be cropped, keep the top of the frame (where faces usually are).
          className={`absolute inset-0 h-full w-full ${isPhone && !portrait ? 'object-contain' : 'object-cover object-[50%_20%]'}`}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-4 pt-[max(16px,env(safe-area-inset-top))]">
          <div className="text-lg font-semibold">{callerName}</div>
          <div className="text-sm tabular-nums text-white/75">
            FaceTime · {Math.floor(seconds / 60)}:{pad(seconds % 60)}
          </div>
        </div>
        {/* Self-view tile: a placeholder — never the visitor's real camera. */}
        <div aria-hidden className="absolute bottom-24 right-4 flex h-28 w-20 items-center justify-center rounded-xl border border-white/20 bg-gradient-to-br from-[#3a3a3c] to-[#1c1c1e] text-sm font-medium text-white/60 sm:h-36 sm:w-28">
          You
        </div>
        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-5 bg-gradient-to-t from-black/60 to-transparent p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            aria-label={muted ? 'Unmute' : 'Mute'}
            onClick={() => setMuted((m) => !m)}
            className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30"
          >
            {muted ? <MicOff size={22} aria-hidden /> : <Mic size={22} aria-hidden />}
          </button>
          <button
            type="button"
            aria-label="End call"
            onClick={onEnd}
            className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[#ff3b30] hover:brightness-110"
          >
            <PhoneOff size={22} aria-hidden />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
