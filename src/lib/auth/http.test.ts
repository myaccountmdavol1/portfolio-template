import { describe, expect, it } from 'vitest';
import { isCrossSite, sameSiteOnly } from './http';

const req = (headers: Record<string, string>, method = 'POST', url = 'http://localhost:3102/api/owner/draft') => new Request(url, { method, headers });

describe('isCrossSite', () => {
  it('allows the site’s own origin', () => {
    expect(isCrossSite(req({ origin: 'http://localhost:3102' }))).toBe(false);
    // Behind a proxy (Vercel), the browser’s host arrives as x-forwarded-host.
    expect(isCrossSite(req({ origin: 'https://www.example.com', 'x-forwarded-host': 'www.example.com' }, 'POST', 'http://internal:3000/api/owner/draft'))).toBe(false);
  });

  it('refuses another origin, another port and a "null" origin', () => {
    expect(isCrossSite(req({ origin: 'https://evil.example' }))).toBe(true);
    expect(isCrossSite(req({ origin: 'http://localhost:3000' }))).toBe(true);
    expect(isCrossSite(req({ origin: 'null' }))).toBe(true);
  });

  it('allows requests with neither header (server-to-server callbacks, curl)', () => {
    expect(isCrossSite(req({}))).toBe(false);
  });

  it('trusts Sec-Fetch-Site', () => {
    expect(isCrossSite(req({ 'sec-fetch-site': 'cross-site' }))).toBe(true);
    expect(isCrossSite(req({ 'sec-fetch-site': 'same-origin' }))).toBe(false);
    expect(isCrossSite(req({ 'sec-fetch-site': 'cross-site', origin: 'http://localhost:3102' }))).toBe(true);
  });
});

describe('sameSiteOnly', () => {
  it('answers 403 for a write from another site', async () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      const res = sameSiteOnly(req({ origin: 'https://evil.example' }, method));
      expect(res?.status, method).toBe(403);
      expect(await res?.json()).toEqual({ error: 'This request came from another site.' });
    }
  });

  it('lets reads and same-site writes through', () => {
    expect(sameSiteOnly(req({ origin: 'https://evil.example' }, 'GET'))).toBeNull();
    expect(sameSiteOnly(req({ origin: 'http://localhost:3102' }, 'DELETE'))).toBeNull();
    expect(sameSiteOnly(req({}, 'PUT'))).toBeNull();
  });
});
