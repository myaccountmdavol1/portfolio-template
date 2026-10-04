import { afterEach, describe, expect, it, vi } from 'vitest';

async function load(email: string) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_OWNER_EMAIL', email);
  return import('./owner');
}

const user = (email: string, emailVerified = true) => ({ email, emailVerified });

afterEach(() => vi.unstubAllEnvs());

describe('isOwnerUser', () => {
  it('matches the configured owner case-insensitively', async () => {
    const { isOwnerUser } = await load('Owner@Example.test');
    expect(isOwnerUser(user('owner@example.test'))).toBe(true);
  });

  it('rejects unverified emails and other accounts', async () => {
    const { isOwnerUser } = await load('owner@example.test');
    expect(isOwnerUser(user('owner@example.test', false))).toBe(false);
    expect(isOwnerUser(user('someone@example.test'))).toBe(false);
    expect(isOwnerUser(null)).toBe(false);
  });

  it('has no owner when the env var is unset (no built-in fallback)', async () => {
    const { isOwnerUser, OWNER_EMAIL } = await load('');
    expect(OWNER_EMAIL).toBe('');
    expect(isOwnerUser(user(''))).toBe(false);
    expect(isOwnerUser(user('someone@gmail.com'))).toBe(false);
  });
});
