'use client';

import { useEffect, useState } from 'react';
import { searchPlaces, type Place } from '@/lib/weather';
import type { ClockApp } from '@/lib/types';
import { inputClass, Section, SelectField, Toggle } from '../fields';
import { useContentEditor } from './useContentEditor';

export function ClockForm({ app }: { app: ClockApp }) {
  const { set, patch } = useContentEditor(app);
  const c = app.content;
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);

  // Debounced city lookup (Open-Meteo geocoding, no key needed).
  useEffect(() => {
    if (query.trim().length < 2) return;
    let cancelled = false;
    const id = window.setTimeout(() => {
      void searchPlaces(query).then((found) => !cancelled && setPlaces(found));
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [query]);

  const shown = query.trim().length >= 2 ? places : [];
  return (
    <Section title="Clock & weather">
      <div className="text-[13px]">
        <span className="font-medium">{c.city}</span> <span className="text-[#6b675f]">· {c.timeZone}</span>
      </div>
      <div>
        <label htmlFor={`${app.id}-city`} className="mb-1 block text-xs font-medium text-[#3d3a35]">
          Change city
        </label>
        <input id={`${app.id}-city`} type="search" value={query} placeholder="Search for a city" onChange={(e) => setQuery(e.target.value)} className={inputClass} />
        {shown.length > 0 && (
          <ul role="listbox" aria-label="Cities" className="m-0 mt-1 list-none rounded-md border border-black/10 bg-white p-1">
            {shown.map((p) => (
              <li key={`${p.latitude},${p.longitude}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    patch({ city: p.name, timeZone: p.timeZone, latitude: p.latitude, longitude: p.longitude });
                    setQuery('');
                    setPlaces([]);
                  }}
                  className="w-full cursor-pointer rounded px-2 py-1 text-left text-[13px] hover:bg-[#0a84ff] hover:text-white"
                >
                  {p.name} <span className="opacity-60">{p.region}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Toggle label="Show weather" checked={c.showWeather} onChange={(v) => set('showWeather', v, true)} />
      <SelectField
        label="Units"
        value={c.units}
        options={[
          { value: 'fahrenheit', label: '°F' },
          { value: 'celsius', label: '°C' },
        ]}
        onChange={(v) => set('units', v, true)}
      />
    </Section>
  );
}
