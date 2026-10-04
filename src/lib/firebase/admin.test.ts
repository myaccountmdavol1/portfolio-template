import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isFirebaseConfigured } from './admin';

const KEYS = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'FIRESTORE_EMULATOR_HOST'] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('isFirebaseConfigured', () => {
  it('is false with no env vars set', () => {
    expect(isFirebaseConfigured()).toBe(false);
  });

  it('is false when only some service-account env vars are set', () => {
    process.env.FIREBASE_PROJECT_ID = 'demo';
    process.env.FIREBASE_CLIENT_EMAIL = 'demo@example.com';
    expect(isFirebaseConfigured()).toBe(false);
  });

  it('is true once all three service-account env vars are set', () => {
    process.env.FIREBASE_PROJECT_ID = 'demo';
    process.env.FIREBASE_CLIENT_EMAIL = 'demo@example.com';
    process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n';
    expect(isFirebaseConfigured()).toBe(true);
  });

  it('is true whenever FIRESTORE_EMULATOR_HOST is set, even without service-account creds', () => {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    expect(isFirebaseConfigured()).toBe(true);
  });
});
