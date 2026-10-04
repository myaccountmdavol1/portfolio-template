'use client';

import { Video } from 'lucide-react';
import { useState } from 'react';
import { FaceTimeCall } from '@/components/FaceTimeCall';
import { useSite } from '@/components/SiteContext';
import { initials } from '@/lib/format';
import { trackEvent } from '@/lib/gameEvents';
import type { FaceTimeApp } from '@/lib/types';

/** FaceTime: the owner's contact card with a call button that plays their intro video. */
export function FaceTimeView({ app }: { app: FaceTimeApp }) {
  const site = useSite();
  const [calling, setCalling] = useState(false);
  const owner = site?.data.site;
  const name = owner?.incomingCall.callerName || owner?.ownerName || app.title;
  const photo = owner?.incomingCall.imageUrl;
  const videoUrl = app.content.videoUrl || owner?.incomingCall.videoUrl || '';

  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#2c2c2e] to-[#1c1c1e] p-8 text-white keep-colors">
      <span className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#a4a9b3] to-[#6e737c] text-4xl font-semibold">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- the owner's uploaded photo
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          initials(name)
        )}
      </span>
      <div className="text-center">
        <div className="text-2xl font-semibold">{name}</div>
        <div className="mt-1 text-sm text-white/60">{app.content.subtitle}</div>
      </div>
      {videoUrl ? (
        <button
          type="button"
          onClick={() => {
            setCalling(true);
            trackEvent({ type: 'answerCall' }); // calling via FaceTime also earns “Pick up!”
          }}
          className="flex cursor-pointer items-center gap-2 rounded-full bg-[#34c759] px-6 py-3 text-base font-semibold hover:brightness-110"
        >
          <Video size={20} aria-hidden /> FaceTime
        </button>
      ) : (
        <p className="m-0 text-sm text-white/60">No video yet.</p>
      )}
      {calling && videoUrl && <FaceTimeCall callerName={name} videoUrl={videoUrl} variant={site?.variant ?? 'desktop'} onEnd={() => setCalling(false)} />}
    </div>
  );
}
