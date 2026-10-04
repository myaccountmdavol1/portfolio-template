'use client';

import { useClock } from '@/hooks/useClock';
import { useWeather } from '@/hooks/useWeather';
import { describeWeather, formatZonedDay, formatZonedTime } from '@/lib/weather';
import type { ClockApp } from '@/lib/types';

/** Local time (and weather) where the owner is. `size` picks the widget or the full window layout. */
export function ClockFace({ app, size }: { app: ClockApp; size: 'widget' | 'window' }) {
  const c = app.content;
  const now = useClock();
  const weather = useWeather(c.latitude, c.longitude, c.units, c.showWeather);
  const sky = weather ? describeWeather(weather.code, weather.isDay) : null;
  const unit = c.units === 'celsius' ? '°C' : '°F';
  const dark = weather ? !weather.isDay : false;
  const big = size === 'window';

  return (
    <div
      className={`flex h-full flex-col justify-between text-white ${big ? 'min-h-[280px] p-8' : 'p-4'}`}
      style={{ background: dark ? 'linear-gradient(160deg,#1f2a4a,#0e1426)' : 'linear-gradient(160deg,#56a8f5,#2f6fd6)' }}
    >
      <div>
        <div className={`font-semibold ${big ? 'text-2xl' : 'text-[15px]'}`}>{c.city}</div>
        <div className={`opacity-80 ${big ? 'text-base' : 'text-[11px]'}`}>{now ? formatZonedDay(now, c.timeZone) : ' '}</div>
      </div>
      <div className={`font-light tabular-nums leading-none ${big ? 'text-8xl' : 'text-[40px]'}`}>
        {now ? formatZonedTime(now, c.timeZone, false).replace(/ (AM|PM)$/, '') : '–:––'}
        <span className={big ? 'ml-2 text-2xl' : 'ml-1 text-sm'}>{now ? (formatZonedTime(now, c.timeZone, false).match(/AM|PM/)?.[0] ?? '') : ''}</span>
      </div>
      {c.showWeather && (
        <div className={`flex items-center gap-2 ${big ? 'text-xl' : 'text-[13px]'}`}>
          {sky && weather ? (
            <>
              <span aria-hidden>{sky.emoji}</span>
              <span className="font-semibold">
                {weather.temperature}
                {unit}
              </span>
              <span className="opacity-80">{sky.label}</span>
            </>
          ) : (
            <span className="opacity-70">Loading weather…</span>
          )}
        </div>
      )}
    </div>
  );
}

export function ClockView({ app }: { app: ClockApp }) {
  return <ClockFace app={app} size="window" />;
}
