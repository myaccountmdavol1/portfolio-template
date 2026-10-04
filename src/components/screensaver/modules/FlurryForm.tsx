'use client';

import { ColorField, ListEditor } from '@/components/editor/fields';
import type { FlurrySettings } from '@/lib/screensavers/flurry';
import type { SaverFormProps } from './formProps';

export function FlurryForm({ settings, onChange }: SaverFormProps<FlurrySettings>) {
  return (
    <ListEditor<string>
      label="Colours"
      items={settings.colors}
      onChange={(colors, structural) => onChange({ colors }, structural)}
      create={() => '#ffffff'}
      itemTitle={(c) => c}
      addLabel="Add colour"
      render={(c, update) => <ColorField label="Colour" value={c} onChange={update} />}
    />
  );
}
