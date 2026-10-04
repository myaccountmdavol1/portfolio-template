'use client';

import { Toggle } from '@/components/editor/fields';
import type { DriftSettings } from '@/lib/screensavers/drift';
import { sitePasses } from '@/lib/screensavers/module';
import type { SaverFormProps } from './formProps';

export function DriftForm({ data, settings, onChange }: SaverFormProps<DriftSettings>) {
  const passes = sitePasses(data)
    .map((p) => p.pass)
    .filter((p) => p.imageUrl?.trim());
  const picked = settings.badgeIds ?? [];
  if (passes.length === 0) return <p className="m-0 text-[11px] text-[#6b675f]">Badges need a picture to drift. Add one in your Wallet app.</p>;
  return (
    <>
      <Toggle label="Every badge with a picture" checked={settings.badgeIds === null} onChange={(all) => onChange({ badgeIds: all ? null : passes.map((p) => p.id) }, true)} />
      {settings.badgeIds !== null &&
        passes.map((p) => (
          <Toggle
            key={p.id}
            label={p.title}
            checked={picked.includes(p.id)}
            onChange={(on) => onChange({ badgeIds: on ? [...picked, p.id] : picked.filter((id) => id !== p.id) }, true)}
          />
        ))}
    </>
  );
}
