import { describe, expect, it } from 'vitest';
import { clearedSessionCookie, readCookie, sessionCookie, SESSION_TTL_MS, signSession, verifySession } from './session';

const now = new Date('2026-10-03T12:00:00Z');

describe('session tokens', () => {
  it('verify with the same secret until they expire', () => {
    const token = signSession('secret-a', now);
    expect(verifySession(token, 'secret-a', now)).toBe(true);
    expect(verifySession(token, 'secret-a', new Date(now.getTime() + SESSION_TTL_MS - 1))).toBe(true);
    expect(verifySession(token, 'secret-a', new Date(now.getTime() + SESSION_TTL_MS))).toBe(false);
  });

  it('fail with another secret, a changed expiry, or junk', () => {
    const token = signSession('secret-a', now);
    expect(verifySession(token, 'secret-b', now)).toBe(false);
    const [expires, mac] = token.split('.');
    expect(verifySession(`${Number(expires) + 1000}.${mac}`, 'secret-a', now)).toBe(false);
    for (const junk of [null, undefined, '', 'abc', `${expires}.zz`, `${expires}.${mac}x`]) expect(verifySession(junk, 'secret-a', now)).toBe(false);
  });
});

describe('cookies', () => {
  it('reads one cookie from the header', () => {
    const request = new Request('http://localhost/', { headers: { cookie: 'a=1; portfolio_owner=abc.def; b=2' } });
    expect(readCookie(request, 'portfolio_owner')).toBe('abc.def');
    expect(readCookie(request, 'missing')).toBeNull();
  });

  it('handles malformed URI-encoded cookie values gracefully', () => {
    const request = new Request('http://localhost/', { headers: { cookie: 'portfolio_owner=%zz' } });
    expect(readCookie(request, 'portfolio_owner')).toBeNull();
  });

  it('sets and clears the session cookie with safe attributes', () => {
    expect(sessionCookie('t', true)).toBe('portfolio_owner=t; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure');
    expect(sessionCookie('t', false)).toBe('portfolio_owner=t; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000');
    expect(clearedSessionCookie(false)).toBe('portfolio_owner=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  });
});
