import { json, notAvailable, secureCookies } from '@/lib/auth/http';
import { isOwnerRequest, signInOwner, usableSetupCode, vercelStore, visitorKeyFor } from '@/lib/auth/owner';
import { clearedSessionCookie, sessionCookie } from '@/lib/auth/session';
import { getMedia } from '@/lib/media';

// The owner's sign-in on Vercel-backend sites (Firebase sites sign in with Google instead).

export async function GET(request: Request) {
  const store = vercelStore();
  if (!store) return notAvailable();
  const claimed = Boolean(await store.owner.get());
  const setupCode = process.env.SETUP_CODE;
  return json(200, {
    configured: Boolean(usableSetupCode(setupCode)),
    // Set, but under MIN_SETUP_CODE_LENGTH: /admin says to make it longer rather than to add one.
    setupCodeTooShort: Boolean(setupCode) && !usableSetupCode(setupCode),
    claimed,
    owner: claimed && (await isOwnerRequest(store, request)),
    media: getMedia()?.kind ?? null,
  });
}

export async function POST(request: Request) {
  const store = vercelStore();
  if (!store) return notAvailable();
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === 'string' ? body.password : '';
  const result = await signInOwner(store, { password, visitorKey: visitorKeyFor(request) });
  return result.ok ? json(200, { ok: true }, sessionCookie(result.token, secureCookies())) : json(result.status, { error: result.error });
}

export async function DELETE() {
  if (!vercelStore()) return notAvailable();
  return json(200, { ok: true }, clearedSessionCookie(secureCookies()));
}
