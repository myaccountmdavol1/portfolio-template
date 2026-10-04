'use client';

import { useState } from 'react';
import { osmEmbedUrl, osmLink, PLACE_EMOJI } from '@/lib/maps';
import type { MapsApp } from '@/lib/types';

/** Maps: the places in the owner's story, with a live map of the one selected. */
export function MapsView({ app }: { app: MapsApp }) {
  const places = app.content.places;
  const [selected, setSelected] = useState(0);
  const place = places[Math.min(selected, places.length - 1)];
  if (!place) return <p className="m-0 bg-white p-10 text-center text-sm text-[#6e6e73]">No places yet.</p>;

  return (
    <div className="@container flex flex-col">
    <div className="flex min-h-[440px] flex-1 flex-col bg-white text-[#1d1d1f] @2xl:flex-row">
      <div className="flex flex-none flex-col border-b border-black/10 @2xl:w-[280px] @2xl:border-b-0 @2xl:border-r">
        <h2 className="m-0 px-4 pb-2 pt-4 text-lg font-semibold">{app.content.heading}</h2>
        <ol className="m-0 flex list-none flex-col p-2">
          {places.map((p, i) => (
            <li key={`${p.name}-${i}`}>
              <button
                type="button"
                aria-current={i === selected}
                onClick={() => setSelected(i)}
                className="flex w-full cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-black/5 aria-[current=true]:bg-[#0a84ff] aria-[current=true]:text-white"
              >
                <span aria-hidden className="text-lg leading-6">
                  {PLACE_EMOJI[p.kind] ?? '📍'}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold">{p.name}</span>
                  <span className="text-xs opacity-75">{[p.years, p.detail].filter(Boolean).join(' · ')}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="relative min-h-[320px] flex-1">
        <iframe key={`${place.latitude},${place.longitude}`} title={`Map of ${place.name}`} src={osmEmbedUrl(place.latitude, place.longitude)} className="absolute inset-0 h-full w-full border-0" loading="lazy" />
        <a
          href={osmLink(place.latitude, place.longitude)}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#0a84ff] shadow"
        >
          Open in Maps ↗
        </a>
      </div>
    </div>
    </div>
  );
}
