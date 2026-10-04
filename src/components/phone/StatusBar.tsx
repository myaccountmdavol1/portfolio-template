'use client';

import { BatteryFull, Signal, Wifi } from 'lucide-react';
import { useClock } from '@/hooks/useClock';
import { formatPhoneTime } from '@/lib/format';

export function StatusBar({ clock24, ink, inkShadow, onControlCenter }: { clock24: boolean; ink: string; inkShadow?: string; onControlCenter: (button: HTMLElement) => void }) {
  const now = useClock();
  return (
    <div
      data-testid="status-bar"
      className="flex flex-none items-center justify-between px-7 pb-1.5 text-[15px] font-semibold tabular-nums"
      style={{
        color: ink,
        textShadow: inkShadow,
        filter: inkShadow ? `drop-shadow(${inkShadow.split(',')[0]})` : undefined,
        paddingTop: 'max(12px, env(safe-area-inset-top))',
      }}
    >
      <span className="h-5 min-w-[44px] leading-5">{now ? formatPhoneTime(now, clock24) : ''}</span>
      {/* Like iOS, the top-right corner opens Control Center. */}
      <button type="button" aria-label="Control Center" onClick={(e) => onControlCenter(e.currentTarget)} className="-m-2 flex cursor-pointer items-center gap-1.5 p-2">
        <Signal size={16} strokeWidth={2.5} aria-hidden />
        <Wifi size={16} strokeWidth={2.5} aria-hidden />
        <BatteryFull size={22} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
