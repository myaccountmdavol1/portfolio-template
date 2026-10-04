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

/** The store when the request comes from the signed-in owner; otherwise the response to send (404 or 401). */
export async function ownerOnly(request: Request): Promise<{ store: OwnerStore } | Response> {
  const store = vercelStore();
  if (!store) return notAvailable();
  if (!(await isOwnerRequest(store, request))) return json(401, { error: 'Sign in again.' });
  return { store };
}

/** Enough of a shape check to refuse junk before it reaches the database. */
export function isSiteData(value: unknown): value is SiteData {
  const v = value as Partial<SiteData> | null;
  return Boolean(v && typeof v === 'object' && v.site && typeof v.site === 'object' && Array.isArray(v.apps) && v.layout && typeof v.layout === 'object');
}
