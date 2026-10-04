import type { Metadata } from 'next';
import { connection } from 'next/server';
import { AdminPasswordSignIn } from '@/components/editor/AdminPasswordSignIn';
import { AdminSignIn } from '@/components/editor/AdminSignIn';
import { resolveBackend } from '@/lib/store';

export const metadata: Metadata = { title: 'Editor', robots: { index: false, follow: false } };

export default async function AdminPage() {
  // Decided per request, not at build: a database connected after the first deploy is picked up.
  await connection();
  // Sites on the Vercel backend sign in with a password; Firebase sites with Google.
  return resolveBackend(process.env) === 'vercel' ? <AdminPasswordSignIn /> : <AdminSignIn />;
}
