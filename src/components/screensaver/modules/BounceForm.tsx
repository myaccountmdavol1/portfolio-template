'use client';

import { TextField } from '@/components/editor/fields';
import { MAX_BOUNCE_TEXT, type BounceSettings } from '@/lib/screensavers/bounce';
import type { SaverFormProps } from './formProps';

export function BounceForm({ settings, onChange }: SaverFormProps<BounceSettings>) {
  return (
    <TextField
      label="Text"
      value={settings.text}
      onChange={(text) => onChange({ text: text.slice(0, MAX_BOUNCE_TEXT) })}
      hint={`Up to ${MAX_BOUNCE_TEXT} characters. Hitting a corner exactly unlocks the secret “Corner shot” achievement.`}
    />
  );
}
