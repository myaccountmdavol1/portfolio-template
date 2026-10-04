import { initials } from './format';
import type { SiteSettings } from './types';

// Shared by app/icon.tsx and app/apple-icon.tsx: the favicon is drawn from the site's own settings.

/** A lighter tint of a hex colour, for the top of the icon's gradient. */
export function lighten(hex: string, amount = 0.35): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#8fc0ec';
  const n = parseInt(m[1], 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function iconInitials(site: Pick<SiteSettings, 'ownerName'>): string {
  return initials(site.ownerName) || '•';
}

/** A Google Fonts family (the headline font; Instrument Serif by default) for just these letters; null if Google Fonts is unreachable. */
export async function loadHeadlineFont(text: string, family = 'Instrument Serif'): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** The icon: a macOS-style rounded tile with the owner's initials — or their uploaded icon. */
export function SiteIconArt({ site, px, rounded }: { site: SiteSettings; px: number; rounded: boolean }) {
  const radius = rounded ? Math.round(px * 0.225) : 0;
  if (site.iconUrl) {
    return (
      <div style={{ width: px, height: px, display: 'flex', borderRadius: radius, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to a PNG by ImageResponse */}
        <img src={site.iconUrl} width={px} height={px} style={{ objectFit: 'cover' }} alt="" />
      </div>
    );
  }
  const accent = /^#[0-9a-f]{6}$/i.test(site.accent) ? site.accent : '#6f9bd1';
  const text = iconInitials(site);
  return (
    <div
      style={{
        width: px,
        height: px,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius,
        background: `linear-gradient(180deg, ${lighten(accent, 0.18)} 0%, ${accent} 100%)`,
        color: 'white',
        fontFamily: 'Instrument Serif',
        // Bigger letters on the tiny tab icon, where thin serifs otherwise fade.
        fontSize: Math.round(px * (text.length > 1 ? (px <= 32 ? 0.66 : 0.56) : 0.74)),
        letterSpacing: `-${Math.max(1, Math.round(px * 0.03))}px`,
        lineHeight: 1,
        paddingBottom: Math.round(px * 0.04),
        textShadow: `0 ${Math.max(1, Math.round(px * 0.02))}px ${Math.round(px * 0.05)}px rgba(0,0,0,.18)`,
      }}
    >
      {text}
    </div>
  );
}
