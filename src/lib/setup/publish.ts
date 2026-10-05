import type { EditorBackend } from '../editor/backend';
import { SignedOutError } from '../editor/httpBackend';
import type { SiteData } from '../types';

/**
 * Saves the wizard's site as the whole draft, publishes it, then records that setup is finished: only after a
 * successful publish, so a failure leaves setup unfinished and the answers in the browser for Try again.
 * `afterSave` runs once the draft is saved (the caller clears its unsaved mirror, which the draft now holds).
 */
export async function publishWizard(backend: Pick<EditorBackend, 'saveDraft' | 'publish'>, data: SiteData, finish: () => Promise<void>, afterSave?: () => void): Promise<void> {
  await backend.saveDraft(data, null);
  afterSave?.();
  await backend.publish(data);
  await finish();
}

/** POST /api/owner/setup. A 401 (the session ended) calls onUnauthorized and rejects with SignedOutError, like the editor's calls. */
export async function finishSetup(options: { onUnauthorized: () => void; fetch?: typeof fetch }): Promise<void> {
  const doFetch = options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  const res = await doFetch('/api/owner/setup', { method: 'POST', credentials: 'same-origin' });
  if (res.status === 401) {
    options.onUnauthorized();
    throw new SignedOutError('Signed out');
  }
  if (!res.ok) throw new Error(`POST /api/owner/setup failed with ${res.status}`);
}
