'use client';

import { SelectField } from '@/components/editor/fields';
import { memoriesAlbums, type MemoriesSettings } from '@/lib/screensavers/memories';
import type { SaverFormProps } from './formProps';

export function MemoriesForm({ data, settings, onChange }: SaverFormProps<MemoriesSettings>) {
  const albums = memoriesAlbums(data);
  const options = [{ value: '', label: 'First album with photos' }, ...albums.map((name) => ({ value: name, label: name }))];
  if (settings.album && !albums.includes(settings.album)) options.push({ value: settings.album, label: `${settings.album} (gone — showing the first album)` });
  return <SelectField label="Album" value={settings.album ?? ''} options={options} onChange={(album) => onChange({ album: album || null }, true)} />;
}
