import { createHash, timingSafeEqual } from 'node:crypto';
import { takeChatQuota } from '../chat/limits';
import { getStore } from '../store';
import type { EditorStore, OwnerRecord, ServerStore } from '../store/types';
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from './password';
import { newSessionSecret, readCookie, SESSION_COOKIE, signSession, verifySession } from './session';

export type OwnerStore = ServerStore & { owner: NonNullable<ServerStore['owner']>; editor: EditorStore };
export type AuthResult = { ok: true; token: string } | { ok: false; status: 400 | 401 | 403 | 429 | 503; error: string };

const ATTEMPT_LIMITS = { perVisitorPerHour: 10, perSitePerDay: 100 };

/** The store, when this site signs its owner in with a password (the Vercel backend). */
export function vercelStore(): OwnerStore | null {
  const store = getStore();
  return store?.kind === 'vercel' && store.owner && store.editor ? (store as OwnerStore) : null;
}

/** Hashed, so no raw IP addresses are stored. */
export function visitorKeyFor(request: Request): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return createHash('sha256').update(`portfolio-owner:${ip}`).digest('hex').slice(0, 24);
}

export const MIN_SETUP_CODE_LENGTH = 12;

/** The setup code, or undefined when it is missing or too short to protect the site (then it counts as not configured). */
export function usableSetupCode(code: string | undefined): string | undefined {
  return code && code.length >= MIN_SETUP_CODE_LENGTH ? code : undefined;
}

const digest = (s: string) => createHash('sha256').update(s).digest();

export function setupCodeMatches(given: string, expected: string | undefined): boolean {
  if (!expected) return false;
  return timingSafeEqual(digest(given), digest(expected));
}

async function allowAttempt(store: OwnerStore, visitorKey: string, now: Date): Promise<boolean> {
  const quota = await takeChatQuota(store.counters, visitorKey, ATTEMPT_LIMITS, now, 'owner').catch(() => ({ ok: false as const }));
  return quota.ok;
}

/** First claim and password reset: both need SETUP_CODE. A new session secret signs out every other browser. */
export async function claimOwner(
  store: OwnerStore,
  input: { setupCode: string; password: string; visitorKey: string },
  expectedCode: string | undefined = process.env.SETUP_CODE,
  now = new Date(),
): Promise<AuthResult> {
  const code = usableSetupCode(expectedCode);
  if (!code) {
    return {
      ok: false,
      status: 503,
      error: `This site needs a setup code of at least ${MIN_SETUP_CODE_LENGTH} characters. Add SETUP_CODE in your Vercel project’s settings (generate one, e.g. with a password manager), then redeploy.`,
    };
  }
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, status: 400, error: `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (!(await allowAttempt(store, input.visitorKey, now))) return { ok: false, status: 429, error: 'Too many tries. Wait an hour and try again.' };
  if (!setupCodeMatches(input.setupCode, code)) return { ok: false, status: 403, error: 'That setup code isn’t right.' };
  const { passwordHash, salt } = await hashPassword(input.password);
  const sessionSecret = newSessionSecret();
  // A password reset is a claim too: it keeps the setup wizard finished.
  const setupDoneAt = (await store.owner.get())?.setupDoneAt;
  await store.owner.set({ passwordHash, salt, sessionSecret, updatedAt: now.toISOString(), ...(setupDoneAt ? { setupDoneAt } : {}) });
  return { ok: true, token: signSession(sessionSecret, now) };
}

/** When the setup code is typed into the password box: point at "Forgot password?" instead. */
export const SETUP_CODE_AS_PASSWORD = 'That’s your setup code, not your password. Click “Forgot password?” to use it.';

export async function signInOwner(
  store: OwnerStore,
  input: { password: string; visitorKey: string },
  expectedCode: string | undefined = process.env.SETUP_CODE,
  now = new Date(),
): Promise<AuthResult> {
  const owner = await store.owner.get();
  if (!owner) return { ok: false, status: 403, error: 'This site hasn’t been claimed yet.' };
  if (!(await allowAttempt(store, input.visitorKey, now))) return { ok: false, status: 429, error: 'Too many tries. Wait an hour and try again.' };
  if (!(await verifyPassword(input.password, owner.passwordHash, owner.salt))) {
    // Constant-time, and only against a usable code, so a too-short SETUP_CODE never produces the hint.
    const error = setupCodeMatches(input.password, usableSetupCode(expectedCode)) ? SETUP_CODE_AS_PASSWORD : 'That password isn’t right.';
    return { ok: false, status: 401, error };
  }
  return { ok: true, token: signSession(owner.sessionSecret, now) };
}

/** True when `token` (the session cookie) is live and signed with this owner's secret. */
export function sessionMatches(owner: OwnerRecord | null, token: string | null | undefined, now = new Date()): boolean {
  return Boolean(owner && verifySession(token, owner.sessionSecret, now));
}

export async function isOwnerRequest(store: OwnerStore, request: Request, now = new Date()): Promise<boolean> {
  return sessionMatches(await store.owner.get(), readCookie(request, SESSION_COOKIE), now);
}

/**
 * Whether this request may connect a Spotify account (/api/spotify/login and /callback). On Vercel-backend sites only
 * the signed-in owner may: once keys are saved in Add-ons, a visitor could otherwise connect their own account first.
 * Firebase sites (no vercelStore) keep the old rule: the first account connected is kept and any other is refused.
 */
export async function mayConnectSpotify(request: Request, storeFor: () => OwnerStore | null = vercelStore): Promise<boolean> {
  const store = storeFor();
  return store ? isOwnerRequest(store, request) : true;
}

/** The setup wizard was finished (after a successful publish): /admin stops sending the owner to /setup. */
export async function markSetupDone(store: OwnerStore, now = new Date()): Promise<void> {
  const owner = await store.owner.get();
  if (owner) await store.owner.set({ ...owner, setupDoneAt: now.toISOString() });
}

/** Stores already seen claimed. Claiming is one-way, so the home page never needs to ask them again. */
const claimedStores = new WeakSet<OwnerStore>();

/**
 * True on a Vercel-backend site nobody has claimed yet: the home page then shows "Claim your site".
 * Firebase sites have no vercelStore(), so this is false there and costs no query. Never throws: a failed
 * check hides the pill rather than breaking the home page. Once a store is seen claimed that is remembered (no
 * more queries); an unclaimed one is checked on every call so the pill goes right after claiming.
 */
export async function isSetupPending(storeFor: () => OwnerStore | null = vercelStore): Promise<boolean> {
  try {
    const store = storeFor();
    if (!store) return false;
    if (claimedStores.has(store)) return false;
    if (await store.owner.get()) {
      claimedStores.add(store);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Could not check whether the site has been claimed', err);
    return false;
  }
}
