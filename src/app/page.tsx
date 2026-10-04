import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Portfolio } from '@/components/Portfolio';
import { isSetupPending } from '@/lib/auth/owner';
import { deepLinkParams, linkPreview, readDeepLink, resolveDeepLink, withDeepLink } from '@/lib/deepLink';
import { guessIsPhone } from '@/lib/device';
import { getPublishedSite } from '@/lib/getSiteData';
import { resolveBackend } from '@/lib/store';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/** A deep link (/?open=…&item=…) gets its own title, description, and preview picture; anything else keeps the site's. */
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ['open', 'item']) {
    const value = params[key];
    const first = Array.isArray(value) ? value[0] : value;
    if (first) query.set(key, first);
  }
  const { open, item } = readDeepLink(query.toString());
  const data = await getPublishedSite();
  const target = resolveDeepLink(data, open, item);
  const preview = target && linkPreview(data, target);
  const link = target && deepLinkParams(data, target);
  if (!preview || !link) return {};
  const title = `${preview.title} · ${data.site.seo.title}`;
  const description = preview.description;
  const image = `/api/og${withDeepLink('', link)}`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function Home() {
  const [data, requestHeaders, setupPending] = await Promise.all([getPublishedSite(), headers(), isSetupPending()]);
  const initialIsPhone = guessIsPhone(requestHeaders.get('user-agent'), requestHeaders.get('sec-ch-ua-mobile'));
  return (
    <Portfolio
      data={data}
      initialIsPhone={initialIsPhone}
      ownerBackend={resolveBackend(process.env) === 'vercel' ? 'vercel' : 'firebase'}
      setupPending={setupPending}
    />
  );
}
