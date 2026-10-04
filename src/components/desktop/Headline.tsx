'use client';

import { EditableText } from '@/components/editor/EditableText';
import { useEditor } from '@/components/editor/EditorContext';
import { updateSite } from '@/lib/editor/mutations';
import { DOCK_RESERVED_H, MENU_BAR_H } from '@/lib/geometry';
import { resolveHeadline } from '@/lib/headline';
import type { SiteSettings } from '@/lib/types';

export function Headline({ site, ink, inkShadow }: { site: SiteSettings; ink: string; inkShadow?: string }) {
  const editor = useEditor();
  if (!site.headline.show) return null;

  // In Edit mode each line is editable in place; the container stays click-through so the wallpaper is still clickable.
  const text = (value: string, label: string, save: (next: string) => Partial<SiteSettings>) =>
    editor ? (
      <EditableText
        label={label}
        value={value}
        className="pointer-events-auto"
        onCommit={(next) => editor.apply((d) => updateSite(d, save(next)))}
      />
    ) : (
      value
    );

  const look = resolveHeadline(site.headline.style, ink, inkShadow);
  const size = (min: number, vw: number, max: number) => `clamp(${min * look.scale}px, ${vw * look.scale}vw, ${max * look.scale}px)`;

  return (
    <div
      data-testid="headline"
      className="pointer-events-none absolute inset-x-0 z-[5] flex flex-col items-center py-[5vh] text-center"
      style={{ top: MENU_BAR_H, bottom: DOCK_RESERVED_H, justifyContent: look.justify, ...look.text }}
    >
      <div className={`leading-none opacity-75 ${look.italicSmallLine ? 'italic' : ''}`} style={{ fontSize: size(28, 4, 56) }}>
        {text(site.headline.line1, 'Headline first line', (line1) => ({ headline: { ...site.headline, line1 } }))}
      </div>
      <h1 className="m-0 font-normal leading-[.9] tracking-[-.03em]" style={{ fontSize: size(88, 15, 240), fontFamily: 'inherit' }}>
        {text(site.headline.line2, 'Headline', (line2) => ({ headline: { ...site.headline, line2 } }))}
      </h1>
      {look.showName && (
        <div className="mt-[clamp(10px,1.6vw,22px)] flex items-center gap-3.5 font-sans font-medium uppercase tracking-[.22em]" style={{ fontSize: size(13, 1.3, 17) }}>
          <span aria-hidden className="h-px w-9 bg-current opacity-50" />
          {text(site.ownerName, 'Your name', (ownerName) => ({ ownerName }))}
          <span aria-hidden className="h-px w-9 bg-current opacity-50" />
        </div>
      )}
    </div>
  );
}
