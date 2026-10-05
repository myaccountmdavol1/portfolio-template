import type { CSSProperties } from 'react';
import { fontById, fontStack, googleFontsHref, resolveSiteFonts, type SiteFont } from '@/lib/fonts';
import { catalogIconUrl } from '@/lib/iconCatalog';
import type { StarterKit } from '@/lib/starterKits';
import type { SiteData } from '@/lib/types';
import { wallpaperStyle, wallpaperThumb } from '@/lib/wallpaper';

interface FrameProps {
  id: string;
  name: string;
  description: string;
  checked: boolean;
  onPick: () => void;
  /** Shown under the description while this card is picked. */
  warning?: string;
  heading: SiteFont;
  body: SiteFont;
  /** The mini desktop: its background, text colours and icon URLs. */
  background: string;
  ink: CSSProperties['color'];
  inkShadow?: string;
  icons: string[];
  wallpaper: string;
}

/** One choice on the "What best describes you?" step: a mini desktop, then a name and a description. A radio. */
function OptionCard({ id, name, description, checked, onPick, warning, heading, body, background, ink, inkShadow, icons, wallpaper }: FrameProps) {
  const fonts = googleFontsHref([heading, body]);
  const warned = checked && warning;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-label={name}
      aria-describedby={warned ? `kit-${id}-about kit-${id}-warning` : `kit-${id}-about`}
      data-kit={id}
      onClick={onPick}
      className="flex cursor-pointer flex-col gap-1.5 rounded-xl border border-black/10 bg-white p-2 text-left hover:bg-black/[.03] aria-checked:outline aria-checked:outline-2 aria-checked:outline-[#0a84ff]"
    >
      {/* React moves this into <head> and loads it once. */}
      {fonts && <link rel="stylesheet" href={fonts} precedence="default" />}
      <span
        aria-hidden
        data-testid="kit-preview"
        data-wallpaper={wallpaper}
        className="relative block aspect-[16/9] w-full overflow-hidden rounded-lg border border-black/10"
        style={{ background }}
      >
        <span className="absolute inset-x-0 top-[22%] truncate px-2 text-center text-[20px] leading-none" style={{ fontFamily: fontStack(heading), color: ink, textShadow: inkShadow }}>
          {name}
        </span>
        <span className="absolute inset-x-0 bottom-1.5 flex justify-center gap-1">
          {icons.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element -- tiny static samples
            <img key={src} src={src} alt="" width={20} height={20} className="h-5 w-5" />
          ))}
        </span>
      </span>
      <span className="px-0.5 text-sm font-medium text-[#1d1c1a]" style={{ fontFamily: fontStack(body) }}>
        {name}
      </span>
      <span id={`kit-${id}-about`} className="px-0.5 text-xs leading-snug text-[#6b675f]">
        {description}
      </span>
      {warned && (
        <span id={`kit-${id}-warning`} data-testid="kit-warning" className="px-0.5 text-xs font-medium leading-snug text-[#b3261e]">
          {warning}
        </span>
      )}
    </button>
  );
}

/** A starter kit, drawn in its own look. */
export function KitCard({ kit, checked, onPick, warning }: { kit: StarterKit; checked: boolean; onPick: () => void; warning?: string }) {
  const { ink, inkShadow } = wallpaperStyle(kit.look.wallpaper, false, 640);
  return (
    <OptionCard
      id={kit.id}
      name={kit.name}
      description={kit.description}
      checked={checked}
      onPick={onPick}
      warning={warning}
      heading={fontById(kit.look.headingFont)!}
      body={fontById(kit.look.bodyFont)!}
      background={wallpaperThumb(kit.look.wallpaper.preset)}
      ink={ink}
      inkShadow={inkShadow}
      icons={kit.preview.icons.map((slug) => catalogIconUrl(slug, kit.look.iconPack))}
      wallpaper={kit.look.wallpaper.preset}
    />
  );
}

/** "Keep my current site" on a re-run: the owner's own site, drawn in its look with its first few icons. */
export function CurrentSiteCard({ site, name, checked, onPick }: { site: SiteData; name: string; checked: boolean; onPick: () => void }) {
  const wp = wallpaperStyle(site.site.wallpaper, false, 640);
  const { heading, body } = resolveSiteFonts(site.site);
  // Its first few distinct catalog icons, in its own pack.
  const icons = [...new Set(site.apps.flatMap((a) => (a.visible && a.icon.kind === 'catalog' ? [catalogIconUrl(a.icon.slug, site.site.style?.iconPack)] : [])))].slice(0, 4);
  return (
    <OptionCard
      id="current"
      name={name}
      description="Your apps and their content stay as they are. Only your answers here change."
      checked={checked}
      onPick={onPick}
      heading={heading}
      body={body}
      background={wp.background}
      ink={wp.ink}
      inkShadow={wp.inkShadow}
      icons={icons}
      wallpaper={site.site.wallpaper.kind === 'preset' ? site.site.wallpaper.preset : 'image'}
    />
  );
}
