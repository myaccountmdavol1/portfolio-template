import { preconnect } from 'react-dom';
import { siteFontsHref } from '@/lib/fonts';
import type { SiteSettings } from '@/lib/types';

/** The Google Fonts the owner picked in Style. React moves the link into <head> and loads it once; nothing for built-in fonts. */
export function SiteFonts({ site }: { site: SiteSettings }) {
  const href = siteFontsHref(site);
  if (href) preconnect('https://fonts.gstatic.com', { crossOrigin: '' });
  return href ? <link rel="stylesheet" href={href} precedence="default" /> : null;
}
