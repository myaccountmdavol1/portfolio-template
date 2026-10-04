import { revalidateTag } from 'next/cache';
import { OWNER_EMAIL } from '@/lib/editor/owner';
import { PUBLISHED_TAG } from '@/lib/getSiteData';

// Checks the sign-in token with Firebase Auth's REST API rather than firebase-admin/auth, whose
// dependencies (jose via jwks-rsa) fail to load on Vercel's runtime and took the whole site down.
async function ownerFromToken(idToken: string): Promise<boolean> {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!key) return false;
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) return false;
  const body = (await res.json()) as { users?: { email?: string; emailVerified?: boolean }[] };
  const user = body.users?.[0];
  return Boolean(OWNER_EMAIL && user?.emailVerified && user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase());
}

/** Called by the editor right after Publish, so visitors see the new site immediately. Owner only. */
export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return Response.json({ error: 'Sign in first' }, { status: 401 });
  if (!(await ownerFromToken(token))) return Response.json({ error: 'Not allowed' }, { status: 403 });
  // expire: 0 — the next visit reads the fresh site rather than being served the old one while it refreshes.
  revalidateTag(PUBLISHED_TAG, { expire: 0 });
  return Response.json({ ok: true });
}
