'use client';

import { useClock } from '@/hooks/useClock';
import { bookingServiceName, canEmbedBooking } from '@/lib/booking';
import { monthGrid } from '@/lib/maps';
import type { CalendarApp } from '@/lib/types';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Calendar: this month at a glance, plus the owner's booking page (Cal.com, Calendly…). */
export function CalendarView({ app }: { app: CalendarApp }) {
  const c = app.content;
  const now = useClock();
  const today = now ?? new Date(2026, 0, 1);
  const days = monthGrid(today.getFullYear(), today.getMonth());
  const monthName = today.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="@container">
    <div className="flex min-h-[480px] flex-col bg-white text-[#1d1d1f] @2xl:flex-row">
      <div className="flex flex-none flex-col gap-4 border-b border-black/10 p-5 @2xl:w-[260px] @2xl:border-b-0 @2xl:border-r">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[#ff3b30]">{now ? today.toLocaleString('en-US', { weekday: 'long' }) : ' '}</div>
          <div className="text-5xl font-light tabular-nums">{now ? today.getDate() : ''}</div>
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold">{now ? monthName : ''}</div>
          <div className="grid grid-cols-7 gap-y-1 text-center text-[11px] tabular-nums">
            {WEEKDAYS.map((d, i) => (
              <span key={i} className="text-[#8e8e93]">
                {d}
              </span>
            ))}
            {days.map((d, i) => (
              <span key={i} className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full ${now && d === today.getDate() ? 'bg-[#ff3b30] font-semibold text-white' : ''}`}>
                {d ?? ''}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h2 className="m-0 text-lg font-semibold">{c.heading}</h2>
          {c.note && <p className="m-0 mt-1 text-sm text-[#6e6e73]">{c.note}</p>}
        </div>
        <a
          href={c.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto rounded-full bg-[#ff3b30] px-4 py-2 text-center text-sm font-semibold text-white hover:brightness-105"
        >
          Book a time ↗
        </a>
      </div>
      {c.embed && canEmbedBooking(c.bookingUrl) ? (
        <iframe title="Booking" src={c.bookingUrl} className="min-h-[420px] flex-1 border-0" loading="lazy" />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <span aria-hidden className="keep-colors text-4xl">
            🗓️
          </span>
          <p className="m-0 max-w-[260px] text-sm text-[#6e6e73]">
            Pick a time that works for you{bookingServiceName(c.bookingUrl) ? ` on ${bookingServiceName(c.bookingUrl)}` : ''} — it opens in a new tab.
          </p>
        </div>
      )}
    </div>
    </div>
  );
}
