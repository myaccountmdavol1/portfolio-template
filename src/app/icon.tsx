import { ImageResponse } from 'next/og';
import { getPublishedSite } from '@/lib/getSiteData';
import { iconInitials, loadHeadlineFont, SiteIconArt } from '@/lib/siteIcon';

// The browser-tab icon, drawn from your published name and accent colour (or your uploaded icon).
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';
export const revalidate = 300; // pick up newly published changes within a few minutes

export default async function Icon() {
  const { site } = await getPublishedSite();
  const font = site.iconUrl ? null : await loadHeadlineFont(iconInitials(site));
  return new ImageResponse(<SiteIconArt site={site} px={32} rounded />, {
    ...size,
    fonts: font ? [{ name: 'Instrument Serif', data: font, style: 'normal', weight: 400 }] : undefined,
  });
}
