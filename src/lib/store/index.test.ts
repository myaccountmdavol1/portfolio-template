import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveBackend } from './index';

const firebaseEnv = { FIREBASE_PROJECT_ID: 'p', FIREBASE_CLIENT_EMAIL: 'c@example.test', FIREBASE_PRIVATE_KEY: 'k' };

describe('resolveBackend', () => {
  it('has no backend with no settings', () => {
    expect(resolveBackend({})).toBeNull();
  });
  it('uses Firebase when its settings (or the emulator) are present', () => {
    expect(resolveBackend(firebaseEnv)).toBe('firebase');
    expect(resolveBackend({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' })).toBe('firebase');
  });
  it('needs all three Firebase service-account settings', () => {
    expect(resolveBackend({ FIREBASE_PROJECT_ID: 'p' })).toBeNull();
  });
  it('uses Vercel storage when a Postgres URL or PGlite folder is present', () => {
    expect(resolveBackend({ DATABASE_URL: 'postgres://x' })).toBe('vercel');
    expect(resolveBackend({ POSTGRES_URL: 'postgres://x' })).toBe('vercel');
    expect(resolveBackend({ PGLITE_DIR: '/tmp/db' })).toBe('vercel');
  });
  it('prefers Firebase when both are present (the owner site keeps Firebase)', () => {
    expect(resolveBackend({ ...firebaseEnv, DATABASE_URL: 'postgres://x' })).toBe('firebase');
  });
  it('lets PORTFOLIO_BACKEND decide, and ignores unknown values', () => {
    expect(resolveBackend({ ...firebaseEnv, PORTFOLIO_BACKEND: 'vercel' })).toBe('vercel');
    expect(resolveBackend({ DATABASE_URL: 'postgres://x', PORTFOLIO_BACKEND: 'firebase' })).toBe('firebase');
    expect(resolveBackend({ ...firebaseEnv, PORTFOLIO_BACKEND: 'mongo' })).toBe('firebase');
  });
  it('treats empty strings as unset (Playwright blanks secrets this way)', () => {
    expect(resolveBackend({ FIREBASE_PROJECT_ID: '', FIREBASE_CLIENT_EMAIL: '', FIREBASE_PRIVATE_KEY: '', FIRESTORE_EMULATOR_HOST: '' })).toBeNull();
  });
});

describe('getStore', () => {
  afterEach(() => vi.unstubAllEnvs());

  async function load(env: Record<string, string>) {
    vi.resetModules();
    for (const k of ['PORTFOLIO_BACKEND', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'FIRESTORE_EMULATOR_HOST', 'DATABASE_URL', 'POSTGRES_URL', 'PGLITE_DIR']) {
      vi.stubEnv(k, env[k] ?? '');
    }
    return import('./index');
  }

  it('returns null with no backend', async () => {
    const { getStore } = await load({});
    expect(getStore()).toBeNull();
  });

  it('returns the memoised Postgres store for the Vercel backend', async () => {
    const { getStore } = await load({ DATABASE_URL: 'postgres://user:pass@db.example.test/app' });
    const store = getStore();
    expect(store?.kind).toBe('vercel');
    expect(store?.editor).toBeDefined();
    expect(getStore()).toBe(store);
  });

  it('returns null when the Vercel backend is forced but has no database', async () => {
    const { getStore } = await load({ PORTFOLIO_BACKEND: 'vercel' });
    expect(getStore()).toBeNull();
  });

  it('returns null when Firebase is forced but not configured', async () => {
    const { getStore } = await load({ PORTFOLIO_BACKEND: 'firebase' });
    expect(getStore()).toBeNull();
  });

  it('uses PGlite when PGLITE_DIR is set (nothing is opened until a query)', async () => {
    const { getStore } = await load({ PGLITE_DIR: '/tmp/portfolio-never-opened' });
    expect(getStore()?.kind).toBe('vercel');
  });

  it('accepts POSTGRES_URL as well as DATABASE_URL', async () => {
    const { getStore } = await load({ POSTGRES_URL: 'postgres://user:pass@db.example.test/app' });
    expect(getStore()?.kind).toBe('vercel');
  });
});
