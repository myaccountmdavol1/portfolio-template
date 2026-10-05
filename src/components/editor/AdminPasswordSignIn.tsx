'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { setEditorFlag } from '@/lib/editor/gate';
import { usePasswordSession } from './usePasswordSession';
import { CLAIM_INSTRUCTIONS, setupCodeProblem } from './setupCodeCopy';

const button = 'inline-flex h-10 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-medium transition-colors disabled:opacity-50';
const field = 'h-10 w-full rounded-lg border border-black/15 bg-white px-3 text-sm text-[#1d1c1a] outline-none focus:border-[#0a84ff]';
const label = 'flex flex-col gap-1 text-left text-xs font-medium text-[#6b675f]';

/**
 * /admin on Vercel-backend sites: claim the site, sign in, or reset the password with the setup code.
 * Until the setup wizard is finished, a successful claim or sign-in continues at /setup.
 */
export function AdminPasswordSignIn() {
  const { session, refresh } = usePasswordSession();
  const [mode, setMode] = useState<'signIn' | 'reset'>('signIn');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => setExpired(new URLSearchParams(window.location.search).has('expired')), []);
  // Remember the owner on this browser so the editor toolbar appears on the home page.
  useEffect(() => {
    if (session.status === 'ready') setEditorFlag(session.owner);
  }, [session]);

  async function submit(path: string, body: Record<string, string>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        setError(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? 'Something went wrong. Try again.');
        return;
      }
      setExpired(false);
      setMode('signIn');
      const next = await refresh();
      // A new owner, or one who skipped it, goes on to the setup wizard until it is finished.
      // A full reload on purpose: /setup starts from a fresh page load, not a client-side navigation.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (next?.owner && !next.setupDone) window.location.assign('/setup');
    } catch {
      setError('Couldn’t reach the site. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  function onClaim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password') ?? '');
    if (password !== String(form.get('confirm') ?? '')) {
      setError('The two passwords don’t match.');
      return;
    }
    void submit('/api/owner/claim', { setupCode: String(form.get('setupCode') ?? ''), password });
  }

  function onSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void submit('/api/owner/session', { password: String(new FormData(e.currentTarget).get('password') ?? '') });
  }

  async function signOut() {
    await fetch('/api/owner/session', { method: 'DELETE' }).catch(() => null);
    setEditorFlag(false);
    await refresh();
  }

  const claimForm = (submitLabel: string) => (
    <form onSubmit={onClaim} className="mt-4 flex flex-col gap-3">
      <label className={label}>
        Setup code
        <input name="setupCode" autoComplete="off" required className={field} />
      </label>
      <label className={label}>
        New password
        <input name="password" type="password" autoComplete="new-password" minLength={8} required className={field} />
      </label>
      <label className={label}>
        Confirm password
        <input name="confirm" type="password" autoComplete="new-password" minLength={8} required className={field} />
      </label>
      <button type="submit" disabled={busy} className={`${button} bg-[#1d1c1a] text-white hover:bg-black`}>
        {submitLabel}
      </button>
    </form>
  );

  const ready = session.status === 'ready' ? session : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#ebe7df] p-6 text-[#1d1c1a]">
      <div className="w-full max-w-sm rounded-2xl bg-[#fbfaf7] p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,.12)]">
        <h1 className="m-0 font-serif text-4xl font-normal">Editor</h1>

        {session.status === 'loading' && <p className="mt-4 text-sm text-[#6b675f]">Checking sign-in…</p>}

        {session.status === 'error' && (
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <p role="alert" className="m-0 text-[#b3261e]">
              Couldn&rsquo;t reach the site.
            </p>
            <button type="button" onClick={() => void refresh()} className={`${button} text-[#6b675f] hover:bg-black/5`}>
              Try again
            </button>
          </div>
        )}

        {ready && !ready.claimed && !ready.configured && <p className="mt-4 text-sm text-[#6b675f]">{setupCodeProblem(ready.setupCodeTooShort)}</p>}

        {ready && !ready.claimed && ready.configured && (
          <>
            <p className="mt-4 mb-0 text-sm font-medium">Claim your site</p>
            <p className="m-0 mt-1 text-sm text-[#6b675f]">{CLAIM_INSTRUCTIONS}</p>
            {claimForm('Claim this site')}
          </>
        )}

        {ready && ready.claimed && !ready.owner && mode === 'signIn' && (
          <>
            {expired && (
              <p role="status" className="mt-4 mb-0 text-sm text-[#6b675f]">
                Your session ended — sign in again. Your unsaved edits are still on this computer.
              </p>
            )}
            <form onSubmit={onSignIn} className="mt-4 flex flex-col gap-3">
              <label className={label}>
                Password
                <input name="password" type="password" autoComplete="current-password" required className={field} />
              </label>
              <button type="submit" disabled={busy} className={`${button} bg-[#1d1c1a] text-white hover:bg-black`}>
                Sign in
              </button>
            </form>
            <button
              type="button"
              onClick={() => {
                setMode('reset');
                setError(null);
              }}
              className={`${button} mt-2 text-[#6b675f] hover:bg-black/5`}
            >
              Forgot password?
            </button>
          </>
        )}

        {ready && ready.claimed && !ready.owner && mode === 'reset' && (
          <>
            <p className="mt-4 mb-0 text-sm text-[#6b675f]">Use your setup code to choose a new password. Other browsers will be signed out.</p>
            {claimForm('Set new password')}
            <button type="button" onClick={() => setMode('signIn')} className={`${button} mt-2 text-[#6b675f] hover:bg-black/5`}>
              Back to sign in
            </button>
          </>
        )}

        {ready && ready.owner && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="m-0 text-sm text-[#6b675f]">You&rsquo;re signed in as the owner.</p>
            {!ready.setupDone && (
              <Link href="/setup" className={`${button} bg-[#1d1c1a] text-white hover:bg-black`}>
                Finish setting up
              </Link>
            )}
            <Link href="/?edit=1" className={`${button} bg-[#0a84ff] text-white hover:bg-[#0071e3]`}>
              Open the editor
            </Link>
            <button type="button" onClick={() => void signOut()} className={`${button} text-[#6b675f] hover:bg-black/5`}>
              Sign out
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-[#b3261e]">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
