'use client';

import { measureImageTone } from '@/lib/tone';
import { WALLPAPER_PRESETS } from '@/lib/wallpaper';
import type { SiteSettings, WallpaperPreset } from '@/lib/types';
import { Modal, modalButton } from './Modal';
import { useUpload } from './useUpload';

const PRESET_LABELS: Record<WallpaperPreset, string> = { sky: 'Sky', paper: 'Paper', grid: 'Grid', dusk: 'Dusk' };

interface WallpaperPickerProps {
  current: SiteSettings['wallpaper'];
  onPick: (wallpaper: SiteSettings['wallpaper']) => void;
  onClose: () => void;
}

export function WallpaperPicker({ current, onPick, onClose }: WallpaperPickerProps) {
  // Measure the photo's brightness from the local file, so text on it is readable (white on dark, dark on light).
  const uploader = useUpload('images', async (imageUrl, file) => onPick({ kind: 'image', imageUrl, tone: await measureImageTone(file) }));
  return (
    <Modal title="Wallpaper" onClose={onClose} width={520}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(WALLPAPER_PRESETS) as WallpaperPreset[]).map((preset) => (
          <button
            key={preset}
            type="button"
            aria-label={PRESET_LABELS[preset]}
            aria-pressed={current.kind === 'preset' && current.preset === preset}
            onClick={() => onPick({ kind: 'preset', preset })}
            className="flex cursor-pointer flex-col gap-1.5 rounded-lg p-1 text-xs aria-pressed:outline aria-pressed:outline-2 aria-pressed:outline-[#0a84ff]"
          >
            <span className="block aspect-[4/3] w-full rounded-md border border-black/10" style={{ background: WALLPAPER_PRESETS[preset].background }} />
            {PRESET_LABELS[preset]}
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <label className={modalButton}>
          {uploader.state === 'uploading' ? 'Uploading…' : 'Use your own image…'}
          <input
            type="file"
            accept="image/*"
            aria-label="Upload wallpaper image"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void uploader.upload(file);
            }}
          />
        </label>
        {current.kind === 'image' && <span className="text-xs text-[#6b675f]">Using a custom image</span>}
      </div>
      {current.kind === 'image' && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="text-[#6b675f]">Text on this wallpaper:</span>
          <div role="radiogroup" aria-label="Text colour on the wallpaper" className="flex overflow-hidden rounded-md border border-black/15">
            {(
              [
                ['dark', 'Light text'],
                ['light', 'Dark text'],
              ] as const
            ).map(([tone, label]) => (
              <button
                key={tone}
                type="button"
                role="radio"
                aria-checked={(current.tone ?? 'dark') === tone}
                onClick={() => onPick({ ...current, tone })}
                className="cursor-pointer px-2.5 py-1 aria-checked:bg-[#0a84ff] aria-checked:text-white"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {uploader.state === 'error' && (
        <p role="alert" className="m-0 mt-3 text-xs text-[#b3261e]">
          Upload failed.{' '}
          <button type="button" onClick={uploader.retry} className="cursor-pointer underline">
            Retry
          </button>
        </p>
      )}
    </Modal>
  );
}
