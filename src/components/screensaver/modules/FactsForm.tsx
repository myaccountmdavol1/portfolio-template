'use client';

import { ListEditor, TextField } from '@/components/editor/fields';
import type { FactsSettings, SaverFact } from '@/lib/screensavers/facts';
import type { SaverFormProps } from './formProps';

export function FactsForm({ settings, onChange }: SaverFormProps<FactsSettings>) {
  return (
    <ListEditor<SaverFact>
      label="Facts"
      items={settings.facts}
      onChange={(facts, structural) => onChange({ facts }, structural)}
      create={() => ({ label: 'Fun fact', fact: 'Something people should know about you', detail: '' })}
      itemTitle={(f) => f.fact}
      addLabel="Add fact"
      render={(f, update) => (
        <>
          <TextField label="Small heading" value={f.label} onChange={(label) => update({ ...f, label })} />
          <TextField label="Fact" value={f.fact} onChange={(fact) => update({ ...f, fact })} />
          <TextField label="Detail" value={f.detail} onChange={(detail) => update({ ...f, detail })} />
        </>
      )}
    />
  );
}
