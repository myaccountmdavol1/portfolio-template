import type { SiteData } from '../types';
import { isOwnerRequest, vercelStore, type OwnerStore } from './owner';

/** JSON for the owner routes: never cached; optionally sets a cookie. */
export function json(status: number, body: unknown, cookie?: string): Response {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (cookie) headers.append('Set-Cookie', cookie);
  return Response.json(body, { status, headers });
}

export const secureCookies = () => process.env.NODE_ENV === 'production';

export const notAvailable = () => json(404, { error: 'Not available on this site.' });

/** The host the browser asked for. Vercel passes it as x-forwarded-host; `next dev` as host. */
function requestHost(request: Request): string {
  return request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host') || new URL(request.url).host;
}

/**
 * True when the browser says another site sent this request: an Origin with a different host, or
 * Sec-Fetch-Site: cross-site. Requests with neither header (curl, server-to-server callbacks such as Vercel
 * Blob's, which carry their own signature) are not cross-site. A page on another site can't set these headers.
 */
export function isCrossSite(request: Request): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return true;
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== requestHost(request);
  } catch {
    return true; // "null" (sandboxed frames, privacy redirects) or junk
  }
}

const READS = ['GET', 'HEAD', 'OPTIONS'];

/** A 403 for an owner write (POST, PUT, DELETE…) sent from another site; null when it may go ahead. Reads always may. */
export function sameSiteOnly(request: Request): Response | null {
  if (READS.includes(request.method.toUpperCase())) return null;
  return isCrossSite(request) ? json(403, { error: 'This request came from another site.' }) : null;
}

/** The store when the request comes from the signed-in owner on this site; otherwise the response to send (404, 403 or 401). */
export async function ownerOnly(request: Request): Promise<{ store: OwnerStore } | Response> {
  const store = vercelStore();
  if (!store) return notAvailable();
  const refused = sameSiteOnly(request);
  if (refused) return refused;
  if (!(await isOwnerRequest(store, request))) return json(401, { error: 'Sign in again.' });
  return { store };
}

/** Enough of a shape check to refuse junk before it reaches the database. */
export function isSiteData(value: unknown): value is SiteData {
  const v = value as Partial<SiteData> | null;
  return Boolean(v && typeof v === 'object' && v.site && typeof v.site === 'object' && Array.isArray(v.apps) && v.layout && typeof v.layout === 'object');
}
