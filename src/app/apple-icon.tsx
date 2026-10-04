import { ImageResponse } from 'next/og';
import { getPublishedSite } from '@/lib/getSiteData';
import { iconInitials, loadHeadlineFont, SiteIconArt } from '@/lib/siteIcon';

// The iPhone/iPad home-screen icon. iOS rounds the corners itself, so the art is square here.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
export const revalidate = 300;

export default async function AppleIcon() {
  const { site } = await getPublishedSite();
  const font = site.iconUrl ? null : await loadHeadlineFont(iconInitials(site));
  return new ImageResponse(<SiteIconArt site={site} px={180} rounded={false} />, {
    ...size,
    fonts: font ? [{ name: 'Instrument Serif', data: font, style: 'normal', weight: 400 }] : undefined,
  });
}
