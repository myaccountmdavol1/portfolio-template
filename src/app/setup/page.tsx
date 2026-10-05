import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { SetupWizard } from '@/components/setup/SetupWizard';
import { sessionMatches, vercelStore } from '@/lib/auth/owner';
import { SESSION_COOKIE } from '@/lib/auth/session';
import { getPublishedSite } from '@/lib/getSiteData';
import { getMedia } from '@/lib/media';
import { resolveBackend } from '@/lib/store';

export const metadata: Metadata = { title: 'Set up your site', robots: { index: false, follow: false } };

export default async function SetupPage() {
  // Decided per request, not at build: a database connected after the first deploy is picked up.
  await connection();
  // Only sites on the Vercel backend have the wizard (Firebase sites are set up by hand).
  if (resolveBackend(process.env) !== 'vercel') notFound();
  const store = vercelStore();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!store || !sessionMatches(await store.owner.get(), token)) redirect('/admin');
  return <SetupWizard published={await getPublishedSite()} media={getMedia()?.kind ?? null} />;
}
