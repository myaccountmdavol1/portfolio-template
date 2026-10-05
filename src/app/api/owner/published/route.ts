import { json, ownerOnly } from '@/lib/auth/http';

/**
 * The published site as stored, for the editor. Visitors get it without add-ons that aren't connected (a Messages
 * app without a Claude key), so the editor can't start a draft, or discard back, from the page's copy.
 */
export async function GET(request: Request) {
  const auth = await ownerOnly(request);
  if (auth instanceof Response) return auth;
  return json(200, { published: await auth.store.site.read('published') });
}
