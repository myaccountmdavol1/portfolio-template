import { revalidateTag } from 'next/cache';
import { isSiteData, json, ownerOnly } from '@/lib/auth/http';
import { PUBLISHED_TAG } from '@/lib/getSiteData';

export async function POST(request: Request) {
  const auth = await ownerOnly(request);
  if (auth instanceof Response) return auth;
  const body = (await request.json().catch(() => null)) as { data?: unknown } | null;
  if (!isSiteData(body?.data)) return json(400, { error: 'Invalid site' });
  const id = await auth.store.editor.publish(body.data);
  // expire: 0 — the next visit reads the fresh site rather than being served the old one while it refreshes.
  revalidateTag(PUBLISHED_TAG, { expire: 0 });
  return json(200, { id });
}
