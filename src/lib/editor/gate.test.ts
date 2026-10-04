import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { editorModeFor, startsInEditMode } from './gate';

// Each test needs OWNER_EMAIL to be set. Import it after stubbing the env var.
let isOwnerUser: typeof import('./owner').isOwnerUser;
let OWNER_EMAIL: typeof import('./owner').OWNER_EMAIL;

beforeAll(async () => {
  vi.stubEnv('NEXT_PUBLIC_OWNER_EMAIL', 'owner@example.test');
  const owner = await import('./owner');
  isOwnerUser = owner.isOwnerUser;
  OWNER_EMAIL = owner.OWNER_EMAIL;
});

afterEach(() => vi.unstubAllEnvs());

describe('editorModeFor', () => {
  it('is null for ordinary visitors', () => {
    expect(editorModeFor('', null, true)).toBeNull();
    expect(editorModeFor('?utm=x', null, false)).toBeNull();
  });

  it('loads the Firebase editor for ?edit or the owner flag', () => {
    expect(editorModeFor('?edit=1', null, true)).toBe('firebase');
    expect(editorModeFor('', '1', true)).toBe('firebase');
  });

  it('allows the local editor only outside production', () => {
    expect(editorModeFor('?editor=local', null, false)).toBe('local');
    expect(editorModeFor('?editor=local', null, true)).toBeNull();
  });
});

describe('startsInEditMode', () => {
  it('is true only when the URL asks for editing', () => {
    expect(startsInEditMode('?edit=1')).toBe(true);
    expect(startsInEditMode('?editor=local')).toBe(true);
    expect(startsInEditMode('')).toBe(false);
  });
});

describe('isOwnerUser', () => {
  it('requires the owner email, verified, case-insensitively', () => {
    expect(isOwnerUser(null)).toBe(false);
    expect(isOwnerUser({ email: OWNER_EMAIL.toUpperCase(), emailVerified: true })).toBe(true);
    expect(isOwnerUser({ email: OWNER_EMAIL, emailVerified: false })).toBe(false);
    expect(isOwnerUser({ email: 'someone@example.com', emailVerified: true })).toBe(false);
  });
});
