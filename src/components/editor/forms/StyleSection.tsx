'use client';

import { updateSite } from '@/lib/editor/mutations';
import { resolveSiteFonts } from '@/lib/fonts';
import type { SiteStyle } from '@/lib/types';
import { useEditor } from '../EditorContext';
import { FontPicker } from '../FontPicker';
import { IconPackPicker } from '../IconPackPicker';
import { Section } from '../fields';

/** Site settings → Style: the headline and body fonts and the icon pack. Each pick is its own undo step and saves like any edit. */
export function StyleSection() {
  const editor = useEditor();
  if (!editor) return null;
  const { heading, body } = resolveSiteFonts(editor.data.site);
  // Reads the latest style inside apply, so quick successive picks never overwrite each other.
  const setStyle = (patch: Partial<SiteStyle>) => editor.apply((d) => updateSite(d, { style: { ...d.site.style, ...patch } }));
  return (
    <Section title="Style">
      <FontPicker label="Headline font" value={heading.id} onChange={(headingFont) => setStyle({ headingFont })} />
      <FontPicker label="Body font" value={body.id} onChange={(bodyFont) => setStyle({ bodyFont })} />
      <p className="m-0 text-[11px] text-[#6b675f]">The body font is used for menus, labels and the text inside windows.</p>
      <IconPackPicker value={editor.data.site.style?.iconPack} onChange={(iconPack) => setStyle({ iconPack })} />
    </Section>
  );
}
