import { json, notAvailable, secureCookies } from '@/lib/auth/http';
import { claimOwner, vercelStore, visitorKeyFor } from '@/lib/auth/owner';
import { sessionCookie } from '@/lib/auth/session';

/** Claims a new site, or resets the password, with the SETUP_CODE chosen at deploy time. */
export async function POST(request: Request) {
  const store = vercelStore();
  if (!store) return notAvailable();
  const body = (await request.json().catch(() => null)) as { setupCode?: unknown; password?: unknown } | null;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const result = await claimOwner(store, { setupCode: str(body?.setupCode), password: str(body?.password), visitorKey: visitorKeyFor(request) });
  return result.ok ? json(200, { ok: true }, sessionCookie(result.token, secureCookies())) : json(result.status, { error: result.error });
}
