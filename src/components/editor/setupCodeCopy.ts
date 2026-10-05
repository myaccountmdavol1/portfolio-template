// What /admin says when SETUP_CODE can’t be used. No server imports: this runs in the browser.
// The 12 matches MIN_SETUP_CODE_LENGTH in src/lib/auth/owner.ts (setupCodeCopy.test.ts checks it).

export function setupCodeProblem(tooShort: boolean): string {
  return tooShort
    ? 'Your SETUP_CODE is too short — it needs at least 12 characters. Change it in your Vercel project’s Settings → Environment Variables, then redeploy.'
    : 'Add a SETUP_CODE of at least 12 characters in your Vercel project’s Settings → Environment Variables, then redeploy. You’ll use it here to claim the site.';
}

/** The claim form's instructions. */
export const CLAIM_INSTRUCTIONS = 'Enter the setup code you chose when you deployed (at least 12 characters), then pick a password.';
