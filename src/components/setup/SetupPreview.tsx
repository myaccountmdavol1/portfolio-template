import { SiteFonts } from '@/components/SiteFonts';
import { fontStack, resolveSiteFonts } from '@/lib/fonts';
import { catalogIconUrl } from '@/lib/iconCatalog';
import type { SiteSettings } from '@/lib/types';
import { wallpaperStyle } from '@/lib/wallpaper';

const SAMPLE_ICONS = ['finder', 'mail', 'photos', 'music'] as const;

/** A small picture of the desktop with the wizard's answers: the wallpaper, the headline in the chosen fonts, a few icons in the chosen pack. */
export function SetupPreview({ site }: { site: SiteSettings }) {
  const wp = wallpaperStyle(site.wallpaper, false, 1080);
  const { heading, body } = resolveSiteFonts(site);
  return (
    <figure
      aria-label="Preview of your desktop"
      data-testid="setup-preview"
      data-wallpaper={site.wallpaper.kind === 'preset' ? site.wallpaper.preset : 'image'}
      className="relative m-0 aspect-[16/10] w-full overflow-hidden rounded-xl border border-black/10"
      style={{ background: wp.background, color: wp.ink, fontFamily: fontStack(body) }}
    >
      <SiteFonts site={site} />
      <div className="flex h-5 items-center px-2.5 text-[10px] font-medium" style={{ background: wp.menuBg }}>
        {`${site.ownerName}\u2019s Portfolio`}
      </div>
      <div
        data-testid="setup-preview-headline"
        className="absolute inset-x-0 top-[22%] px-3 text-center"
        style={{ fontFamily: fontStack(heading), textShadow: wp.inkShadow }}
      >
        <div className="text-[clamp(11px,2.6vw,16px)] leading-none opacity-75">{site.headline.line1}</div>
        <div className="text-[clamp(30px,8vw,52px)] leading-[.95] tracking-[-.03em]">{site.headline.line2}</div>
      </div>
      <div className="absolute inset-x-0 bottom-2.5 flex justify-center">
        <div className="flex gap-1.5 rounded-xl bg-white/30 p-1.5 backdrop-blur">
          {SAMPLE_ICONS.map((slug) => (
            // eslint-disable-next-line @next/next/no-img-element -- tiny static samples
            <img key={slug} src={catalogIconUrl(slug, site.style?.iconPack)} alt="" width={28} height={28} className="h-7 w-7" />
          ))}
        </div>
      </div>
    </figure>
  );
}
