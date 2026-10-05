import { usableSetupCode } from '../auth/owner';
import { getStore } from '../store';
import type { ServerStore } from '../store/types';
import { decryptSecret } from './secrets';
import type { AddonStatus, HostingAddons, StoredAddons } from './types';

// Server-only. The one place each add-on's key is decided: the hosting's environment variables always win; a key
// saved in Site settings, Add-ons, is the fallback. Never send what these return to a browser.

type Env = Record<string, string | undefined>;

export interface AddonDeps {
  env?: Env;
  /** Defaults to getStore(). Pass null for "no storage". */
  store?: ServerStore | null;
}

function storeOf(deps: AddonDeps): ServerStore | null {
  if ('store' in deps) return deps.store ?? null;
  try {
    return getStore();
  } catch {
    return null; // a misconfigured backend: no stored keys
  }
}

async function readStored(store: ServerStore | null): Promise<StoredAddons | null> {
  if (!store) return null;
  try {
    return await store.addons.get();
  } catch (err) {
    console.error('Could not read the add-on settings', err);
    return null;
  }
}

const envChatKey = (env: Env) => env.ANTHROPIC_API_KEY?.trim() || null;

function envSpotify(env: Env): { clientId: string; clientSecret: string } | null {
  const clientId = env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = env.SPOTIFY_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** Which add-ons the hosting sets. Booleans only, for the editor's read-only Add-ons section. */
export function hostingAddons(env: Env = process.env): HostingAddons {
  return { chat: envChatKey(env) !== null, spotify: envSpotify(env) !== null };
}

export async function chatKey(deps: AddonDeps = {}): Promise<{ key: string; source: 'env' | 'stored' } | null> {
  const env = deps.env ?? process.env;
  const fromEnv = envChatKey(env);
  if (fromEnv) return { key: fromEnv, source: 'env' };
  const code = usableSetupCode(env.SETUP_CODE);
  if (!code) return null; // nothing stored can be opened without a usable code
  const sealed = (await readStored(storeOf(deps)))?.anthropicKey;
  const key = sealed ? decryptSecret(sealed, code) : null;
  return key ? { key, source: 'stored' } : null;
}

export async function spotifyCredentials(deps: AddonDeps = {}): Promise<{ clientId: string; clientSecret: string; source: 'env' | 'stored' } | null> {
  const env = deps.env ?? process.env;
  const fromEnv = envSpotify(env);
  if (fromEnv) return { ...fromEnv, source: 'env' };
  const code = usableSetupCode(env.SETUP_CODE);
  if (!code) return null;
  const saved = (await readStored(storeOf(deps)))?.spotify;
  const clientSecret = saved ? decryptSecret(saved.clientSecret, code) : null;
  return saved && clientSecret ? { clientId: saved.clientId, clientSecret, source: 'stored' } : null;
}

async function spotifyConnected(store: ServerStore | null, env: Env): Promise<boolean> {
  if (env.SPOTIFY_REFRESH_TOKEN) return true;
  try {
    return Boolean(await store?.spotify.read());
  } catch {
    return false;
  }
}

/** What the Add-ons cards show. Holds no key: only the last four characters of a saved Claude key. */
export async function addonStatus(deps: AddonDeps = {}): Promise<AddonStatus> {
  const env = deps.env ?? process.env;
  const store = storeOf(deps);
  const code = usableSetupCode(env.SETUP_CODE);
  const stored = await readStored(store);
  const connected = await spotifyConnected(store, env);

  let chat: AddonStatus['chat'] = { state: 'off' };
  if (envChatKey(env)) chat = { state: 'env' };
  else if (stored?.anthropicKey) {
    const key = code ? decryptSecret(stored.anthropicKey, code) : null;
    chat = key ? { state: 'on', hint: key.slice(-4) } : { state: 'reenter' };
  }

  let spotify: AddonStatus['spotify'] = { state: 'off', connected };
  if (envSpotify(env)) spotify = { state: 'env', connected };
  else if (stored?.spotify) {
    const secret = code ? decryptSecret(stored.spotify.clientSecret, code) : null;
    spotify = { state: secret ? (connected ? 'connected' : 'credentials') : 'reenter', connected };
  }

  return { chat, spotify, canStore: code !== undefined };
}
