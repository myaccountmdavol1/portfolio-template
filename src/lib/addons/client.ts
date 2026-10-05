import type { AddonId, AddonsResponse } from './types';

// The editor's side of /api/owner/addons (Vercel-backend sites). Keys go in; only the status ever comes back.

export type AddonsResult = { ok: true; status: AddonsResponse } | { ok: false; error: string };

export interface AddonsClient {
  load(): Promise<AddonsResult>;
  saveChat(key: string): Promise<AddonsResult>;
  saveSpotify(clientId: string, clientSecret: string): Promise<AddonsResult>;
  remove(addon: AddonId): Promise<AddonsResult>;
}

const URL_PATH = '/api/owner/addons';

export function createAddonsClient(doFetch: typeof fetch = (input, init) => fetch(input, init)): AddonsClient {
  async function call(init: RequestInit = {}, query = ''): Promise<AddonsResult> {
    try {
      const res = await doFetch(`${URL_PATH}${query}`, {
        credentials: 'same-origin',
        cache: 'no-store',
        ...init,
        headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
      });
      const body = (await res.json().catch(() => null)) as (AddonsResponse & { error?: string }) | null;
      if (res.ok && body) return { ok: true, status: body };
      if (res.status === 401) return { ok: false, error: 'Your session ended. Sign in again.' };
      return { ok: false, error: body?.error ?? 'Something went wrong \u2014 try again.' };
    } catch {
      return { ok: false, error: 'Couldn\u2019t reach your site \u2014 check your connection.' };
    }
  }
  const post = (body: unknown) => call({ method: 'POST', body: JSON.stringify(body) });
  return {
    load: () => call(),
    saveChat: (key) => post({ addon: 'chat', key }),
    saveSpotify: (clientId, clientSecret) => post({ addon: 'spotify', clientId, clientSecret }),
    remove: (addon) => call({ method: 'DELETE' }, `?addon=${addon}`),
  };
}
