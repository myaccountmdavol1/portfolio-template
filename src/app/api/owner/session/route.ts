import { json, notAvailable, sameSiteOnly, secureCookies } from '@/lib/auth/http';
import { sessionMatches, signInOwner, usableSetupCode, vercelStore, visitorKeyFor } from '@/lib/auth/owner';
import { clearedSessionCookie, readCookie, SESSION_COOKIE, sessionCookie } from '@/lib/auth/session';
import { getMedia } from '@/lib/media';

// The owner's sign-in on Vercel-backend sites (Firebase sites sign in with Google instead).

export async function GET(request: Request) {
  const store = vercelStore();
  if (!store) return notAvailable();
  const record = await store.owner.get();
  const owner = sessionMatches(record, readCookie(request, SESSION_COOKIE));
  const setupCode = process.env.SETUP_CODE;
  return json(200, {
    configured: Boolean(usableSetupCode(setupCode)),
    // Set, but under MIN_SETUP_CODE_LENGTH: /admin says to make it longer rather than to add one.
    setupCodeTooShort: Boolean(setupCode) && !usableSetupCode(setupCode),
    claimed: Boolean(record),
    owner,
    // Until the setup wizard is finished, /admin sends the owner there after claiming or signing in.
    setupDone: owner && Boolean(record?.setupDoneAt),
    media: getMedia()?.kind ?? null,
  });
}

export async function POST(request: Request) {
  const store = vercelStore();
  if (!store) return notAvailable();
  const refused = sameSiteOnly(request);
  if (refused) return refused;
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === 'string' ? body.password : '';
  const result = await signInOwner(store, { password, visitorKey: visitorKeyFor(request) });
  return result.ok ? json(200, { ok: true }, sessionCookie(result.token, secureCookies())) : json(result.status, { error: result.error });
}

export async function DELETE(request: Request) {
  if (!vercelStore()) return notAvailable();
  const refused = sameSiteOnly(request);
  if (refused) return refused;
  return json(200, { ok: true }, clearedSessionCookie(secureCookies()));
}
