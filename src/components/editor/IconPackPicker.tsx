'use client';

import { useEffect, useState } from 'react';
import { catalogIconUrl, orderedPacks, parseIconPackManifest, type IconPackManifest } from '@/lib/iconCatalog';

const SAMPLES = ['finder', 'mail', 'photos', 'music'] as const;

/** The packs this deploy serves (/icons/packs.json, written by npm run icons:install), each with four sample icons. */
export function IconPackPicker({ value, onChange }: { value: string | undefined; onChange: (id: string) => void }) {
  const [manifest, setManifest] = useState<IconPackManifest | null | 'unavailable'>(null);
  useEffect(() => {
    let live = true;
    fetch('/icons/packs.json')
      .then((res) => (res.ok ? (res.json() as Promise<unknown>) : null))
      .then((json) => {
        if (live) setManifest(parseIconPackManifest(json) ?? 'unavailable');
      })
      .catch(() => {
        if (live) setManifest('unavailable');
      });
    return () => {
      live = false;
    };
  }, []);
  if (manifest === 'unavailable') return <p className="m-0 text-[11px] text-[#6b675f]">Icon packs aren&rsquo;t available right now.</p>;
  if (!manifest) return <p className="m-0 text-[11px] text-[#6b675f]">Loading icon packs…</p>;
  const served = orderedPacks(manifest.packs);
  // A saved pack this deploy does not serve is drawn in the default pack, so show that one as chosen.
  const current = served.some((p) => p.id === value) ? value : manifest.default;
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-[#3d3a35]">Icon pack</span>
      <div role="radiogroup" aria-label="Icon pack" className="flex flex-col gap-1">
        {served.map((pack) => (
          <button
            key={pack.id}
            type="button"
            role="radio"
            aria-checked={current === pack.id}
            onClick={() => onChange(pack.id)}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-black/10 bg-white px-2 py-1.5 text-left text-[13px] hover:bg-black/5 aria-checked:border-[#0a84ff] aria-checked:ring-1 aria-checked:ring-[#0a84ff]"
          >
            <span>{pack.label}</span>
            <span aria-hidden className="flex gap-1">
              {SAMPLES.map((slug) => (
                // eslint-disable-next-line @next/next/no-img-element -- tiny static samples
                <img key={slug} src={catalogIconUrl(slug, pack.id)} alt="" width={22} height={22} loading="lazy" className="h-[22px] w-[22px]" />
              ))}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
