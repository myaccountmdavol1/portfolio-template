'use client';

import { useState } from 'react';
import { catalogIconUrl, CATALOG_CATEGORIES, filterIcons, type CatalogCategory } from '@/lib/iconCatalog';
import type { IconSpec } from '@/lib/types';
import { Modal, modalButton } from './Modal';
import { useUpload } from './useUpload';

interface IconPickerProps {
  current: IconSpec | null;
  onPick: (icon: IconSpec) => void;
  onClose: () => void;
}

export function IconPicker({ current, onPick, onClose }: IconPickerProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CatalogCategory | 'all'>('all');
  const icons = filterIcons(query, category);
  const uploader = useUpload('images', (url) => onPick({ kind: 'image', url }));

  return (
    <Modal title="Choose an icon" onClose={onClose} width={640}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            aria-label="Search icons"
            placeholder="Search icons"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 min-w-0 flex-1 rounded-md border border-black/15 bg-white px-2.5 text-[13px] outline-none focus:border-[#0a84ff]"
          />
          <label className={modalButton}>
            {uploader.state === 'uploading' ? 'Uploading…' : 'Upload image…'}
            <input
              type="file"
              accept="image/*"
              aria-label="Upload icon image"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void uploader.upload(file);
              }}
            />
          </label>
        </div>
        {uploader.state === 'error' && (
          <p role="alert" className="m-0 text-xs text-[#b3261e]">
            Upload failed.{' '}
            <button type="button" onClick={uploader.retry} className="cursor-pointer underline">
              Retry
            </button>
          </p>
        )}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Icon categories">
          {CATALOG_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className="cursor-pointer rounded-full border border-black/10 px-2.5 py-1 text-xs aria-pressed:border-[#0a84ff] aria-pressed:bg-[#0a84ff] aria-pressed:text-white"
            >
              {c.label}
            </button>
          ))}
        </div>
        {icons.length === 0 ? (
          <p className="m-0 py-8 text-center text-sm text-[#6b675f]">No icons match “{query}”.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-1">
            {icons.map((icon) => {
              const selected = current?.kind === 'catalog' && current.slug === icon.slug;
              return (
                <button
                  key={icon.slug}
                  type="button"
                  aria-label={icon.label}
                  aria-pressed={selected}
                  onClick={() => onPick({ kind: 'catalog', slug: icon.slug })}
                  className="flex cursor-pointer flex-col items-center gap-1 rounded-lg p-1.5 hover:bg-black/5 aria-pressed:bg-[#0a84ff]/15"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- small static catalog PNGs */}
                  <img src={catalogIconUrl(icon.slug)} alt="" width={48} height={48} loading="lazy" className="h-12 w-12 object-contain" />
                  <span className="w-full truncate text-center text-[10px] text-[#6b675f]">{icon.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
