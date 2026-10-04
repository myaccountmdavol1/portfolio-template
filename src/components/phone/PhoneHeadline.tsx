import { resolveHeadline } from '@/lib/headline';
import type { SiteSettings } from '@/lib/types';

/** The desktop headline, scaled for the phone and drawn on the wallpaper behind the icons. */
export function PhoneHeadline({ site, ink, inkShadow }: { site: SiteSettings; ink: string; inkShadow?: string }) {
  const look = resolveHeadline(site.headline.style, ink, inkShadow);
  const place = look.justify === 'flex-start' ? { top: '30%' } : look.justify === 'center' ? { top: '42%' } : { bottom: '6%' };
  return (
    <div
      data-testid="phone-headline"
      aria-hidden
      className="pointer-events-none absolute inset-x-0 flex flex-col items-center px-4 text-center"
      style={{ ...place, ...look.text }}
    >
      <div className={`leading-none opacity-75 ${look.italicSmallLine ? 'italic' : ''}`} style={{ fontSize: 26 * look.scale }}>
        {site.headline.line1}
      </div>
      <div className="leading-[.95] tracking-[-.03em]" style={{ fontSize: 76 * look.scale }}>
        {site.headline.line2}
      </div>
      {look.showName && (
        <div className="mt-2 flex items-center gap-2.5 font-sans text-[11px] font-medium uppercase tracking-[.22em]">
          <span className="h-px w-6 bg-current opacity-50" />
          {site.ownerName}
          <span className="h-px w-6 bg-current opacity-50" />
        </div>
      )}
    </div>
  );
}
