'use client';

import { measureImageTone } from '@/lib/tone';
import type { SiteSettings } from '@/lib/types';
import { isPattern, PATTERN_SWATCHES, patternColor, WALLPAPER_CATALOG, WALLPAPER_GROUPS, wallpaperThumb } from '@/lib/wallpaper';
import { Modal, modalButton } from './Modal';
import { useUpload } from './useUpload';

type Wallpaper = SiteSettings['wallpaper'];
type PresetWallpaper = Extract<Wallpaper, { kind: 'preset' }>;

interface WallpaperPickerProps {
  current: Wallpaper;
  /** `keepOpen`: patterns and their colours keep the picker open, so a colour can be picked next. */
  onPick: (wallpaper: Wallpaper, keepOpen?: boolean) => void;
  onClose: () => void;
}

export function WallpaperPicker({ current, onPick, onClose }: WallpaperPickerProps) {
  // Measure the photo's brightness from the local file, so text on it is readable (white on dark, dark on light).
  const uploader = useUpload('images', async (imageUrl, file) => onPick({ kind: 'image', imageUrl, tone: await measureImageTone(file) }));
  const preset = current.kind === 'preset' ? current : null;
  return (
    <Modal title="Wallpaper" onClose={onClose} width={560}>
      <div className="flex flex-col gap-4">
        {WALLPAPER_GROUPS.map((group) => {
          const presets = WALLPAPER_CATALOG.filter((p) => p.group === group.id);
          if (presets.length === 0) return null;
          return (
            <section key={group.id} aria-label={group.label}>
              <h3 className="m-0 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#6b675f]">{group.label}</h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {presets.map(({ id, label }) => {
                  const selected = preset?.preset === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-label={label}
                      aria-pressed={selected}
                      // Picking the selected pattern again keeps its colour.
                      onClick={() => onPick(selected && preset ? preset : { kind: 'preset', preset: id }, isPattern(id))}
                      className="flex cursor-pointer flex-col gap-1.5 rounded-lg p-1 text-xs aria-pressed:outline aria-pressed:outline-2 aria-pressed:outline-[#0a84ff]"
                    >
                      <span className="block aspect-[4/3] w-full rounded-md border border-black/10" style={{ background: wallpaperThumb(id, selected ? preset?.color : undefined) }} />
                      {label}
                    </button>
                  );
                })}
              </div>
              {group.id === 'patterns' && preset && isPattern(preset.preset) && <PatternColours current={preset} onPick={onPick} />}
            </section>
          );
        })}
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

/** Eight swatches and a custom colour for the selected pattern. */
function PatternColours({ current, onPick }: { current: PresetWallpaper; onPick: WallpaperPickerProps['onPick'] }) {
  const active = patternColor(current.preset, current.color);
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2">
      <div role="radiogroup" aria-label="Pattern colour" className="flex flex-wrap gap-1.5">
        {PATTERN_SWATCHES.map((swatch) => (
          <button
            key={swatch.color}
            type="button"
            role="radio"
            aria-label={swatch.label}
            aria-checked={active === swatch.color}
            onClick={() => onPick({ ...current, color: swatch.color }, true)}
            className="h-6 w-6 cursor-pointer rounded-full border border-black/15 aria-checked:outline aria-checked:outline-2 aria-checked:outline-offset-2 aria-checked:outline-[#0a84ff]"
            style={{ background: swatch.color }}
          />
        ))}
      </div>
      <input
        type="color"
        aria-label="Custom pattern colour"
        value={active}
        onChange={(e) => onPick({ ...current, color: e.target.value }, true)}
        className="h-6 w-8 cursor-pointer rounded border border-black/15 bg-white"
      />
    </div>
  );
}
