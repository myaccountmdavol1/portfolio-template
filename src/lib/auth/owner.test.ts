import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureSchema } from '../store/postgres/schema';
import { pgliteSql } from '../store/postgres/sql';
import { postgresStore } from '../store/postgres/store';
import { claimOwner, isOwnerRequest, isSetupPending, MIN_SETUP_CODE_LENGTH, SETUP_CODE_AS_PASSWORD, setupCodeMatches, signInOwner, usableSetupCode, type OwnerStore } from './owner';
import { SESSION_COOKIE } from './session';

const sql = pgliteSql();
const store = postgresStore(sql) as OwnerStore;
const CODE = 'test-setup-code';
const withCookie = (token: string) => new Request('http://localhost/', { headers: { cookie: `${SESSION_COOKIE}=${token}` } });
let visitor = 0;
const nextVisitor = () => `visitor-${++visitor}`;

beforeEach(async () => {
  await ensureSchema(sql);
  await sql.query('truncate documents, versions, records, counters');
});

describe('setup code', () => {
  it('matches exactly, and never matches when unset', () => {
    expect(setupCodeMatches(CODE, CODE)).toBe(true);
    expect(setupCodeMatches('test-setup-cod', CODE)).toBe(false);
    expect(setupCodeMatches(CODE, undefined)).toBe(false);
    expect(setupCodeMatches('', '')).toBe(false);
  });
});

describe('setup code strength', () => {
  it('counts a code under the minimum as not configured', async () => {
    expect(MIN_SETUP_CODE_LENGTH).toBe(12);
    expect(usableSetupCode(undefined)).toBeUndefined();
    expect(usableSetupCode('a'.repeat(11))).toBeUndefined();
    expect(usableSetupCode('a'.repeat(12))).toBe('a'.repeat(12));
    const short = 'a'.repeat(11);
    const r = await claimOwner(store, { setupCode: short, password: 'long enough', visitorKey: nextVisitor() }, short);
    expect(r).toMatchObject({ ok: false, status: 503 });
    expect(r.ok === false && r.error).toContain('at least 12 characters');
    const ok = 'a'.repeat(12);
    expect(await claimOwner(store, { setupCode: ok, password: 'long enough', visitorKey: nextVisitor() }, ok)).toMatchObject({ ok: true });
  });
});

describe('claiming the site', () => {
  it('needs SETUP_CODE configured', async () => {
    const r = await claimOwner(store, { setupCode: CODE, password: 'long enough', visitorKey: nextVisitor() }, undefined);
    expect(r).toMatchObject({ ok: false, status: 503 });
  });

  it('rejects a short password, and a wrong code', async () => {
    expect(await claimOwner(store, { setupCode: CODE, password: 'short', visitorKey: nextVisitor() }, CODE)).toMatchObject({ ok: false, status: 400 });
    expect(await claimOwner(store, { setupCode: 'nope', password: 'long enough', visitorKey: nextVisitor() }, CODE)).toMatchObject({
      ok: false,
      status: 403,
      error: 'That setup code isn’t right.',
    });
    await expect(store.owner.get()).resolves.toBeNull();
  });

  it('stores the owner and returns a session that works; a reset signs other browsers out', async () => {
    const first = await claimOwner(store, { setupCode: CODE, password: 'first password', visitorKey: nextVisitor() }, CODE);
    if (!first.ok) throw new Error(first.error);
    await expect(isOwnerRequest(store, withCookie(first.token))).resolves.toBe(true);

    const reset = await claimOwner(store, { setupCode: CODE, password: 'second password', visitorKey: nextVisitor() }, CODE);
    if (!reset.ok) throw new Error(reset.error);
    await expect(isOwnerRequest(store, withCookie(first.token))).resolves.toBe(false);
    await expect(isOwnerRequest(store, withCookie(reset.token))).resolves.toBe(true);
  });
});

describe('signing in', () => {
  it('needs a claimed site, then the right password', async () => {
    expect(await signInOwner(store, { password: 'anything', visitorKey: nextVisitor() })).toMatchObject({ ok: false, status: 403 });
    await claimOwner(store, { setupCode: CODE, password: 'the password', visitorKey: nextVisitor() }, CODE);
    expect(await signInOwner(store, { password: 'wrong one!', visitorKey: nextVisitor() })).toMatchObject({
      ok: false,
      status: 401,
      error: 'That password isn’t right.',
    });
    const ok = await signInOwner(store, { password: 'the password', visitorKey: nextVisitor() });
    if (!ok.ok) throw new Error(ok.error);
    await expect(isOwnerRequest(store, withCookie(ok.token))).resolves.toBe(true);
  });

  it('says so when the setup code is typed as the password', async () => {
    await claimOwner(store, { setupCode: CODE, password: 'the password', visitorKey: nextVisitor() }, CODE);
    expect(SETUP_CODE_AS_PASSWORD).toBe('That’s your setup code, not your password. Click “Forgot password?” to use it.');
    expect(await signInOwner(store, { password: CODE, visitorKey: nextVisitor() }, CODE)).toEqual({
      ok: false,
      status: 401,
      error: SETUP_CODE_AS_PASSWORD,
    });
  });

  it('gives no hint when that password is right, or when the setup code is too short to use', async () => {
    await claimOwner(store, { setupCode: CODE, password: CODE, visitorKey: nextVisitor() }, CODE);
    expect(await signInOwner(store, { password: CODE, visitorKey: nextVisitor() }, CODE)).toMatchObject({ ok: true });

    const short = 'a'.repeat(MIN_SETUP_CODE_LENGTH - 1);
    expect(await signInOwner(store, { password: short, visitorKey: nextVisitor() }, short)).toEqual({
      ok: false,
      status: 401,
      error: 'That password isn’t right.',
    });
  });

  it('allows 10 attempts an hour per visitor', async () => {
    await claimOwner(store, { setupCode: CODE, password: 'the password', visitorKey: nextVisitor() }, CODE);
    const key = nextVisitor();
    for (let i = 0; i < 10; i++) expect((await signInOwner(store, { password: 'wrong one!', visitorKey: key })).ok).toBe(false);
    expect(await signInOwner(store, { password: 'the password', visitorKey: key })).toMatchObject({ ok: false, status: 429 });
  });

  it('a request without the cookie is not the owner', async () => {
    await claimOwner(store, { setupCode: CODE, password: 'the password', visitorKey: nextVisitor() }, CODE);
    await expect(isOwnerRequest(store, new Request('http://localhost/'))).resolves.toBe(false);
  });
});

describe('brute force protection on claim', () => {
  it("setup code can't be brute-forced: 10 wrong codes blocks the right one", async () => {
    const key = nextVisitor();
    for (let i = 0; i < 10; i++) {
      expect(await claimOwner(store, { setupCode: 'wrong-code', password: 'long enough', visitorKey: key }, CODE)).toMatchObject({
        ok: false,
        status: 403,
      });
    }
    expect(await claimOwner(store, { setupCode: CODE, password: 'long enough', visitorKey: key }, CODE)).toMatchObject({
      ok: false,
      status: 429,
    });
    await expect(store.owner.get()).resolves.toBeNull();
  });
});

describe('isSetupPending', () => {
  it('is true on a Vercel-backend site until someone claims it', async () => {
    await expect(isSetupPending(() => store)).resolves.toBe(true);
    await claimOwner(store, { setupCode: CODE, password: 'the password', visitorKey: nextVisitor() }, CODE);
    await expect(isSetupPending(() => store)).resolves.toBe(false);
  });

  it('stops querying once the site is claimed, but keeps checking while it is not', async () => {
    const fresh = postgresStore(sql) as OwnerStore;
    const get = vi.spyOn(fresh.owner, 'get');
    await expect(isSetupPending(() => fresh)).resolves.toBe(true);
    await expect(isSetupPending(() => fresh)).resolves.toBe(true);
    expect(get).toHaveBeenCalledTimes(2);
    await claimOwner(fresh, { setupCode: CODE, password: 'the password', visitorKey: nextVisitor() }, CODE);
    get.mockClear();
    await expect(isSetupPending(() => fresh)).resolves.toBe(false);
    expect(get).toHaveBeenCalledTimes(1);
    await expect(isSetupPending(() => fresh)).resolves.toBe(false);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('is false on sites without the Vercel backend, and when the check fails', async () => {
    await expect(isSetupPending(() => null)).resolves.toBe(false);
    await expect(
      isSetupPending(() => {
        throw new Error('database unreachable');
      }),
    ).resolves.toBe(false);
    const broken = { ...store, owner: { ...store.owner, get: () => Promise.reject(new Error('timeout')) } } as OwnerStore;
    await expect(isSetupPending(() => broken)).resolves.toBe(false);
  });
});
