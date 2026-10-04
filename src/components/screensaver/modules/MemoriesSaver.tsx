'use client';

import { memoriesPhotos, type MemoriesSettings } from '@/lib/screensavers/memories';
import type { SaverProps } from '../saverProps';
import { useStepCount } from '../useLoop';

const PHOTO_MS = 6000;

/** The owner's photos, cross-fading with a slow zoom and pan, each with its caption. */
export function MemoriesSaver({ data, settings, reduced }: SaverProps<MemoriesSettings>) {
  const photos = memoriesPhotos(data, settings);
  const step = useStepCount(photos.length, () => PHOTO_MS, !reduced);
  const count = photos.length;
  if (count === 0) return null;
  const at = (s: number) => photos[s % count]; // steps are never negative
  const shown = at(step);
  // Only the outgoing, current and next photos are on the page (the next one loads while hidden). Each is keyed on
  // its step, not its photo, so a photo that comes round again (two photos: every other step) gets a fresh element
  // and its zoom starts over instead of sitting at the end of the last pass.
  const moving = !reduced && count > 1;
  const steps = moving ? [step - 1, step, step + 1].filter((s) => s >= 0) : [step];
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {steps.map((s) => (
        // eslint-disable-next-line @next/next/no-img-element -- the owner's uploaded photos, any host
        <img
          key={s}
          src={at(s).url}
          alt=""
          className="saver-photo"
          data-on={s === step || undefined}
          data-was={s === step - 1 || undefined}
          data-dir={(s % count) % 2 ? 'right' : 'left'}
        />
      ))}
      {shown.caption.trim() && (
        <p key={step} className="saver-fact absolute inset-x-0 bottom-0 m-0 bg-gradient-to-t from-black/65 to-transparent px-[4vw] pb-[5vh] pt-16 text-[clamp(16px,2vw,28px)] font-semibold">
          {shown.caption}
        </p>
      )}
    </div>
  );
}
