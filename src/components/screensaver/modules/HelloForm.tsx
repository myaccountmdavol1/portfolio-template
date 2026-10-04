'use client';

import { StringListEditor, TextField } from '@/components/editor/fields';
import type { HelloSettings } from '@/lib/screensavers/hello';
import type { SaverFormProps } from './formProps';

export function HelloForm({ settings, onChange }: SaverFormProps<HelloSettings>) {
  return (
    <>
      <StringListEditor label="Words" items={settings.words} onChange={(words, structural) => onChange({ ...settings, words }, structural)} />
      <TextField label="Last line" value={settings.finalLine} onChange={(finalLine) => onChange({ ...settings, finalLine })} hint="Written last, e.g. “I’m Sam.” Leave it empty to skip it." />
    </>
  );
}
