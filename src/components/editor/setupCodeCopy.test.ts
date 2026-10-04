import { describe, expect, it } from 'vitest';
import { MIN_SETUP_CODE_LENGTH } from '@/lib/auth/owner';
import { setupCodeProblem } from './setupCodeCopy';

describe('setupCodeProblem', () => {
  it('says a too-short code needs 12 characters and where to change it', () => {
    expect(setupCodeProblem(true)).toBe(
      'Your SETUP_CODE is too short — it needs at least 12 characters. Change it in your Vercel project’s Settings → Environment Variables, then redeploy.',
    );
  });

  it('names the 12-character minimum when no code is set', () => {
    expect(setupCodeProblem(false)).toBe(
      'Add a SETUP_CODE of at least 12 characters in your Vercel project’s Settings → Environment Variables, then redeploy. You’ll use it here to claim the site.',
    );
  });

  it('matches the real minimum', () => {
    for (const tooShort of [true, false]) expect(setupCodeProblem(tooShort)).toContain(`at least ${MIN_SETUP_CODE_LENGTH} characters`);
  });
});
