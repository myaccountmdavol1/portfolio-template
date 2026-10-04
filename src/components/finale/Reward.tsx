'use client';

import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { HallOfFameSign } from '@/components/hallOfFame/HallOfFame';
import { formatDuration } from '@/lib/finale';
import { readProgress, visitorName } from '@/lib/gameEvents';
import type { GameCenterContent } from '@/lib/types';

type FinaleSettings = NonNullable<GameCenterContent['finale']>;

/** Draws and downloads a “Certificate of Exploration”. */
function downloadCertificate(name: string, owner: string) {
  const c = document.createElement('canvas');
  c.width = 1600;
  c.height = 1100;
  const ctx = c.getContext('2d');
  if (!ctx) return;
  const gold = ctx.createLinearGradient(0, 0, 1600, 1100);
  gold.addColorStop(0, '#b8860b');
  gold.addColorStop(0.5, '#ffd60a');
  gold.addColorStop(1, '#b8860b');
  ctx.fillStyle = '#fbfaf7';
  ctx.fillRect(0, 0, 1600, 1100);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 28;
  ctx.strokeRect(40, 40, 1520, 1020);
  ctx.lineWidth = 3;
  ctx.strokeRect(80, 80, 1440, 940);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1d1c1a';
  ctx.font = '120px serif';
  ctx.fillText('🏆', 800, 250);
  ctx.font = 'italic 44px Georgia, serif';
  ctx.fillText('Certificate of Exploration', 800, 350);
  ctx.font = '28px Georgia, serif';
  ctx.fillStyle = '#6b675f';
  ctx.fillText('proudly awarded to', 800, 440);
  ctx.fillStyle = '#1d1c1a';
  ctx.font = '96px Georgia, serif';
  ctx.fillText(name || 'A Curious Explorer', 800, 570);
  ctx.fillStyle = '#6b675f';
  ctx.font = '30px Georgia, serif';
  ctx.fillText(`for discovering every corner of ${owner}’s portfolio`, 800, 660);
  const p = readProgress();
  const took = p.startedAt && p.finishedAt ? ` · completed in ${formatDuration(p.finishedAt - p.startedAt)}` : '';
  ctx.font = '26px Georgia, serif';
  ctx.fillText(`${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}${took}`, 800, 760);
  ctx.fillStyle = gold;
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillText('PLATINUM · ALL ACHIEVEMENTS UNLOCKED', 800, 900);
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = 'certificate-of-exploration.png';
  a.click();
}

/** The prize at the end: the owner's message, optional link and video, and the certificate. */
export function Reward({ owner, settings, hallOfFame, onClose }: { owner: string; settings: FinaleSettings; hallOfFame: boolean; onClose: () => void }) {
  const [name, setName] = useState(() => visitorName() ?? '');
  return (
    <div className="fixed inset-0 z-[9960] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div role="dialog" aria-label="Top Secret" className="relative flex max-h-[90dvh] w-[min(520px,100%)] flex-col gap-4 overflow-y-auto rounded-3xl bg-[#fbfaf7] p-6 text-[#1d1c1a] shadow-[0_40px_100px_rgba(0,0,0,.5)]">
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-4 top-4 cursor-pointer rounded-full p-1 hover:bg-black/5">
          <X size={18} aria-hidden />
        </button>
        <div className="text-center">
          <div aria-hidden className="text-5xl">
            🏆
          </div>
          <h2 className="m-0 mt-2 font-serif text-3xl font-normal">You found everything.</h2>
          <p className="m-0 mt-1 text-xs font-semibold uppercase tracking-[.2em] text-[#b8860b]">Platinum · all achievements</p>
        </div>
        <p className="m-0 whitespace-pre-wrap text-center text-[15px] leading-relaxed">
          {settings.rewardMessage?.trim() || `Thanks for exploring every corner of my portfolio — you’re officially one of the curious ones. I’d love to hear from you!`}
        </p>
        {settings.videoUrl && <video src={settings.videoUrl} controls playsInline className="w-full rounded-xl bg-black" />}
        {settings.rewardLink && (
          <a href={settings.rewardLink} target="_blank" rel="noopener noreferrer" className="self-center rounded-full bg-[#0a84ff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0071e3]">
            {settings.rewardLinkLabel?.trim() || 'Your secret link ↗'}
          </a>
        )}
        <div className="flex flex-col gap-2 rounded-2xl bg-[#f1efea] p-4">
          <label htmlFor="cert-name" className="text-xs font-medium">
            Your name for the certificate
          </label>
          <div className="flex gap-2">
            <input id="cert-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="min-w-0 flex-1 rounded-md border border-black/15 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#0a84ff]" />
            <button type="button" onClick={() => downloadCertificate(name.trim(), owner)} className="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#1d1c1a] px-3 py-1.5 text-sm font-semibold text-white">
              <Download size={14} aria-hidden /> Certificate
            </button>
          </div>
        </div>
        {hallOfFame && <HallOfFameSign />}
      </div>
    </div>
  );
}
