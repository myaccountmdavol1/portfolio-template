import { readFile } from 'node:fs/promises';
import { iconPngPaths } from './iconFile';
import { ImageResponse } from 'next/og';
import { ogHeadingFamily } from '@/lib/fonts';
import { linkPreview, type ResolvedLink } from '@/lib/deepLink';
import { lighten, loadHeadlineFont } from '@/lib/siteIcon';
import type { IconSpec, SiteData } from '@/lib/types';

// The pictures shown when someone pastes a link (iMessage, LinkedIn, Slack, email…). Served by /api/og.

export const OG_SIZE = { width: 1200, height: 630 };
// Link unfurlers cache these themselves; five minutes at the edge picks up new publishes quickly.
const headers = { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400' };

/** Catalog icons as data URLs (the image renderer reads PNGs, not WebP), drawn in the site's icon pack. */
async function iconSrc(icon: IconSpec, pack: string | undefined): Promise<string | null> {
  if (icon.kind === 'image') return /^https:\/\//.test(icon.url) ? icon.url : null;
  if (icon.kind !== 'catalog') return null;
  for (const path of iconPngPaths(icon.slug, pack)) {
    try {
      return `data:image/png;base64,${(await readFile(path)).toString('base64')}`;
    } catch {
      // not in this pack; try the next
    }
  }
  return null;
}

const MAX_ART_BYTES = 4 * 1024 * 1024;

/** A picture from the owner's content as a data URL, or null if it can't be fetched or the renderer can't read it. */
async function artSrc(url: string | undefined, origin: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(new URL(url, origin), { signal: AbortSignal.timeout(4000) });
    const type = (res.headers.get('content-type') ?? '').split(';')[0];
    if (!res.ok || !/^image\/(png|jpeg|gif)$/.test(type)) return null;
    // Very large pictures are skipped (the icon stands in) so the card stays quick to draw.
    if (Number(res.headers.get('content-length') ?? 0) > MAX_ART_BYTES) return null;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > MAX_ART_BYTES) return null;
    return `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
  } catch {
    return null;
  }
}

/** Up to `max` characters, ending on a whole word with an ellipsis when shortened. */
function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max + 1);
  const space = head.lastIndexOf(' ');
  const cut = (space > 0 ? head.slice(0, space) : text.slice(0, max)).replace(/[\s,.;:!?\-–—]+$/, '');
  return `${cut}…`;
}

/** The whole site: a little macOS desktop with the owner's name, headline, and app icons — or their own uploaded image. */
export async function siteCard({ site, apps }: SiteData): Promise<ImageResponse> {
  if (site.seo.ogImageUrl) {
    return new ImageResponse(
      // eslint-disable-next-line @next/next/no-img-element -- rendered to a PNG, not the page
      <img src={site.seo.ogImageUrl} alt="" width={OG_SIZE.width} height={OG_SIZE.height} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />,
      { ...OG_SIZE, headers },
    );
  }

  const name = site.ownerName;
  const headline = site.headline.show ? site.headline.line2 || name : name;
  const kicker = site.headline.show ? site.headline.line1 : 'Portfolio';
  const icons = (await Promise.all(apps.filter((a) => a.visible).map((a) => iconSrc(a.icon, site.style?.iconPack)))).filter((s): s is string => !!s).slice(0, 8);
  const family = ogHeadingFamily(site);
  const font = await loadHeadlineFont(`${kicker}${headline}${name}’s Portfolio`, family);
  const glow = lighten(site.accent, 0.1);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: `radial-gradient(circle at 25% 15%, ${glow} 0%, #15151b 55%, #0c0c10 100%)`,
          color: 'white',
          fontFamily: 'system-ui',
        }}
      >
        {/* Menu bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 56, padding: '0 32px', background: 'rgba(255,255,255,.08)', fontSize: 24 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: site.accent }} />
          <div style={{ display: 'flex', fontWeight: 700 }}>{`${name}’s Portfolio`}</div>
        </div>
        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', padding: '0 80px' }}>
          <div style={{ display: 'flex', fontSize: 34, opacity: 0.75 }}>{kicker}</div>
          <div style={{ display: 'flex', fontSize: headline.length > 22 ? 92 : 120, lineHeight: 1.02, fontFamily: font ? family : 'system-ui', marginTop: 8 }}>{headline}</div>
        </div>
        {/* Dock */}
        {icons.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
            <div style={{ display: 'flex', gap: 14, padding: '14px 18px', borderRadius: 30, background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.25)' }}>
              {icons.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- rendered to a PNG, not the page
                <img key={i} src={src} alt="" width={76} height={76} style={{ borderRadius: 17 }} />
              ))}
            </div>
          </div>
        )}
      </div>
    ),
    { ...OG_SIZE, headers, fonts: font ? [{ name: family, data: font, style: 'normal', weight: 400 }] : undefined },
  );
}

/** One app, badge, or photo: its picture on the left, its title and details on the right. */
export async function itemCard(data: SiteData, target: ResolvedLink, origin: string): Promise<ImageResponse> {
  const { site, apps } = data;
  const app = apps.find((a) => a.id === target.appId);
  const preview = linkPreview(data, target);
  if (!app || !preview) return siteCard(data);
  const art = (await artSrc(preview.imageUrl, origin)) ?? (await iconSrc(app.icon, site.style?.iconPack));
  const name = site.ownerName;
  const description = preview.description ? shorten(preview.description, 120) : '';
  // Every string drawn on the card goes into the font subset, so no letter falls back to another face.
  const heading = ogHeadingFamily(site);
  const font = await loadHeadlineFont(`${app.title}${app.title.toUpperCase()}${preview.title}${description}${name}’s Portfolio`, heading);
  const family = font ? heading : 'system-ui';
  const glow = lighten(site.accent, 0.1);
  const isPhoto = app.type === 'photos' && !!target.itemKey;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 56,
          padding: '0 72px',
          background: `radial-gradient(circle at 20% 20%, ${glow} 0%, #15151b 55%, #0c0c10 100%)`,
          color: 'white',
          fontFamily: 'system-ui',
        }}
      >
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element -- rendered to a PNG, not the page
          <img src={art} alt="" width={380} height={380} style={{ flex: 'none', borderRadius: isPhoto ? 24 : 48, objectFit: isPhoto ? 'cover' : 'contain' }} />
        ) : (
          <div style={{ display: 'flex', flex: 'none', width: 380, height: 380, borderRadius: 48, background: site.accent }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', fontSize: 26, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.65, fontFamily: family }}>{app.title}</div>
          <div style={{ display: 'flex', fontSize: preview.title.length > 28 ? 64 : 84, lineHeight: 1.05, marginTop: 12, fontFamily: family }}>
            {preview.title}
          </div>
          {description && <div style={{ display: 'flex', fontSize: 30, lineHeight: 1.3, marginTop: 20, opacity: 0.8, fontFamily: family }}>{description}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 40, fontSize: 24, fontFamily: family }}>
            <div style={{ width: 16, height: 16, borderRadius: 8, background: site.accent }} />
            {`${name}’s Portfolio`}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, headers, fonts: font ? [{ name: heading, data: font, style: 'normal', weight: 400 }] : undefined },
  );
}
