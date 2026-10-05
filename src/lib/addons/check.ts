import Anthropic from '@anthropic-ai/sdk';

// Server-only. Each key is tried once, live, before it is saved: a key that doesn't work is never stored.

export type CheckResult = { ok: true } | { ok: false; reason: 'rejected' | 'unreachable' };

type Env = Record<string, string | undefined>;

export interface CheckDeps {
  fetch?: typeof fetch;
  env?: Env;
}

const TIMEOUT_MS = 10_000;
const OK: CheckResult = { ok: true };
const REJECTED: CheckResult = { ok: false, reason: 'rejected' };
const UNREACHABLE: CheckResult = { ok: false, reason: 'unreachable' };

/**
 * The e2e server (playwright.config.ts, port 3102) sets ADDONS_FAKE_CHECK=1 so the journey needs no real keys or
 * network. It never applies to a production build (`next build`/`next start`, and every Vercel deployment, run with
 * NODE_ENV=production), so a deployed site always checks for real.
 */
export function fakeChecksAllowed(env: Env = process.env): boolean {
  return env.ADDONS_FAKE_CHECK === '1' && env.NODE_ENV !== 'production';
}

// Read fetch at call time, so tests (and vi.stubGlobal) can swap it.
const liveFetch: typeof fetch = (input, init) => globalThis.fetch(input, init);

/** One cheap call (list one model). 401/403 = the key is wrong; anything else that fails = Anthropic unreachable. */
export async function checkAnthropicKey(key: string, deps: CheckDeps = {}): Promise<CheckResult> {
  if (fakeChecksAllowed(deps.env)) return key.startsWith('sk-ant-') ? OK : REJECTED;
  try {
    // authToken: null so a stray ANTHROPIC_AUTH_TOKEN in the environment can't stand in for the key being checked.
    const client = new Anthropic({ apiKey: key, authToken: null, fetch: deps.fetch ?? liveFetch, maxRetries: 0, timeout: TIMEOUT_MS });
    await client.models.list({ limit: 1 });
    return OK;
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return REJECTED;
    return UNREACHABLE;
  }
}

/** Spotify's client-credentials token request: 400/401 = wrong ID or secret. */
export async function checkSpotifyCredentials(clientId: string, clientSecret: string, deps: CheckDeps = {}): Promise<CheckResult> {
  if (fakeChecksAllowed(deps.env)) return clientSecret.startsWith('bad') ? REJECTED : OK;
  try {
    const res = await (deps.fetch ?? liveFetch)('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return OK;
    return res.status === 400 || res.status === 401 ? REJECTED : UNREACHABLE;
  } catch {
    return UNREACHABLE;
  }
}
