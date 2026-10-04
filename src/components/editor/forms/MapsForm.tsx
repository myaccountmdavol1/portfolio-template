'use client';

import { useEffect, useState } from 'react';
import { searchPlaces, type Place } from '@/lib/weather';
import type { MapsApp, MapsContent, PlaceKind } from '@/lib/types';
import { inputClass, ListEditor, Section, SelectField, TextField } from '../fields';
import { useContentEditor } from './useContentEditor';

type MapPlace = MapsContent['places'][number];

const KINDS: { value: PlaceKind; label: string }[] = [
  { value: 'home', label: '🏠 Home' },
  { value: 'school', label: '🎓 School' },
  { value: 'work', label: '💼 Work' },
  { value: 'travel', label: '✈️ Travel' },
  { value: 'other', label: '📍 Other' },
];

function LocationSearch({ onPick }: { onPick: (p: Place) => void }) {
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Place[]>([]);
  useEffect(() => {
    if (query.trim().length < 2) return;
    let cancelled = false;
    const id = window.setTimeout(() => void searchPlaces(query).then((r) => !cancelled && setFound(r)), 300);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [query]);
  const shown = query.trim().length >= 2 ? found : [];
  return (
    <div>
      <input type="search" aria-label="Find the location" placeholder="Find the location (city)" value={query} onChange={(e) => setQuery(e.target.value)} className={inputClass} />
      {shown.length > 0 && (
        <ul className="m-0 mt-1 list-none rounded-md border border-black/10 bg-white p-1">
          {shown.map((p) => (
            <li key={`${p.latitude},${p.longitude}`}>
              <button
                type="button"
                onClick={() => {
                  onPick(p);
                  setQuery('');
                  setFound([]);
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
  );
}

export function MapsForm({ app }: { app: MapsApp }) {
  const { set } = useContentEditor(app);
  return (
    <Section title="Maps">
      <TextField label="Heading" value={app.content.heading} onChange={(v) => set('heading', v)} />
      <ListEditor<MapPlace>
        label="Places"
        items={app.content.places}
        onChange={(items, s) => set('places', items, s)}
        create={() => ({ name: 'New place', detail: '', years: '', kind: 'other', latitude: 40.71, longitude: -74.01 })}
        itemTitle={(p) => p.name}
        addLabel="Add place"
        render={(p, update) => (
          <>
            <LocationSearch onPick={(found) => update({ ...p, name: p.name === 'New place' ? found.name : p.name, latitude: found.latitude, longitude: found.longitude })} />
            <p className="m-0 text-[11px] text-[#6b675f]">
              📍 {p.latitude.toFixed(3)}, {p.longitude.toFixed(3)}
            </p>
            <TextField label="Name" value={p.name} onChange={(name) => update({ ...p, name })} />
            <SelectField label="Kind" value={p.kind} options={KINDS} onChange={(kind) => update({ ...p, kind })} />
            <TextField label="Years" value={p.years} placeholder="2020–2024" onChange={(years) => update({ ...p, years })} />
            <TextField label="What happened there" value={p.detail} onChange={(detail) => update({ ...p, detail })} />
          </>
        )}
      />
    </Section>
  );
}
