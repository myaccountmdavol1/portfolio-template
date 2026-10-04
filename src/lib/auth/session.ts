import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// The owner's sign-in on Vercel-backend sites: an HttpOnly cookie holding an expiry and its HMAC.
// The key lives in the owner record, so choosing a new password signs out every other browser.

export const SESSION_COOKIE = 'portfolio_owner';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const newSessionSecret = () => randomBytes(32).toString('hex');

const mac = (secret: string, expires: number) => createHmac('sha256', secret).update(`owner:${expires}`).digest('hex');

export function signSession(secret: string, now = new Date()): string {
  const expires = now.getTime() + SESSION_TTL_MS;
  return `${expires}.${mac(secret, expires)}`;
}

export function verifySession(token: string | null | undefined, secret: string, now = new Date()): boolean {
  const match = token ? /^(\d{10,16})\.([a-f0-9]{64})$/.exec(token) : null;
  if (!match) return false;
  const expires = Number(match[1]);
  if (expires <= now.getTime()) return false;
  const given = Buffer.from(match[2], 'hex');
  const expected = Buffer.from(mac(secret, expires), 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function readCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return null;
      }
    }
  }
  return null;
}

const attributes = (maxAgeSeconds: number, secure: boolean) => `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`;

export function sessionCookie(token: string, secure: boolean): string {
  return `${SESSION_COOKIE}=${token}; ${attributes(SESSION_TTL_MS / 1000, secure)}`;
}

export function clearedSessionCookie(secure: boolean): string {
  return `${SESSION_COOKIE}=; ${attributes(0, secure)}`;
}
