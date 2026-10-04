import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import { Dancing_Script, Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import type { ReactNode } from 'react';
import { getPublishedSite } from '@/lib/getSiteData';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
});
// The "Hello" screen saver's handwriting. Not preloaded: the browser fetches it only when Hello draws.
const handwriting = Dancing_Script({ variable: '--font-handwriting', subsets: ['latin'], weight: '600', preload: false });

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getPublishedSite();
  // Absolute links for share images: the production domain on Vercel, localhost in dev.
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return {
    metadataBase: new URL(host ? `https://${host}` : 'http://localhost:3000'),
    title: site.seo.title,
    description: site.seo.description,
    openGraph: { title: site.seo.title, description: site.seo.description, type: 'website', images: ['/api/og'] },
    twitter: { card: 'summary_large_image', title: site.seo.title, description: site.seo.description, images: ['/api/og'] },
  };
}

// viewportFit 'cover' lets the phone layout draw under the notch; we pad with env(safe-area-inset-*).
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${handwriting.variable}`}>
      <body>
        {children}
        {/* Privacy-friendly visitor counts (no cookies); switch on under Analytics in the Vercel dashboard. */}
        <Analytics />
      </body>
    </html>
  );
}
