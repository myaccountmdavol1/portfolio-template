import { checkAnthropicKey, checkSpotifyCredentials, type CheckResult } from '@/lib/addons/check';
import { addonStatus, hostingAddons } from '@/lib/addons/config';
import { encryptSecret } from '@/lib/addons/secrets';
import type { AddonId, AddonsResponse, StoredAddons } from '@/lib/addons/types';
import { json, ownerOnly } from '@/lib/auth/http';
import { MIN_SETUP_CODE_LENGTH, usableSetupCode, type OwnerStore } from '@/lib/auth/owner';

// Site settings, Add-ons, on Vercel-backend sites (ownerOnly answers 404 on Firebase sites, which use hosting
// variables). Every reply is the status from addonStatus(): never a key, only a saved Claude key's last four characters.

/** Far more than any key needs; anything bigger is refused before it is parsed. */
const MAX_BODY_BYTES = 4_096;
/** One field: printable ASCII with no spaces, and a sane length. */
const FIELD = /^[\x21-\x7e]{1,512}$/;
/** Real Claude keys are far longer; this keeps the saved last-four hint from ever revealing a whole key. */
const MIN_CLAUDE_KEY_LENGTH = 20;

async function respond(store: OwnerStore, request: Request, status = 200): Promise<Response> {
  const body: AddonsResponse = {
    ...(await addonStatus({ store })),
    redirectUri: new URL('/api/spotify/callback', request.url).toString(),
  };
  return json(status, body);
}

async function readBody(request: Request): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: Response }> {
  const tooLarge = { ok: false as const, response: json(413, { error: 'That\u2019s too long to be a key.' }) };
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return tooLarge;
  const text = await request.text().catch(() => '');
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return tooLarge;
  try {
    const body: unknown = JSON.parse(text);
    if (body && typeof body === 'object' && !Array.isArray(body)) return { ok: true, body: body as Record<string, unknown> };
  } catch {
    // falls through to 400
  }
  return { ok: false, response: json(400, { error: 'Invalid request' }) };
}

type Field = { value: string } | { empty: true } | { bad: true };
const field = (value: unknown): Field => {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) return { empty: true };
  return FIELD.test(s) ? { value: s } : { bad: true };
};
const BAD_FIELD = 'That doesn\u2019t look like a key \u2014 paste it again without spaces.';

function failed(result: Extract<CheckResult, { ok: false }>, addon: AddonId): Response {
  if (result.reason === 'unreachable') return json(502, { error: `Couldn\u2019t reach ${addon === 'chat' ? 'Anthropic' : 'Spotify'} \u2014 try again.` });
  return json(400, {
    error: addon === 'chat' ? 'That key didn\u2019t work \u2014 check you copied all of it.' : 'Spotify didn\u2019t accept those \u2014 check the Client ID and secret.',
  });
}

/** Rewrites the stored value without one add-on (and never with undefined fields). */
function without(stored: StoredAddons | null, addon: AddonId, now: Date): StoredAddons {
  const { anthropicKey, spotify } = stored ?? {};
  return {
    ...(addon !== 'chat' && anthropicKey ? { anthropicKey } : {}),
    ...(addon !== 'spotify' && spotify ? { spotify } : {}),
    updatedAt: now.toISOString(),
  };
}

export async function GET(request: Request) {
  const auth = await ownerOnly(request);
  if (auth instanceof Response) return auth;
  return respond(auth.store, request);
}

/** { addon: 'chat', key } or { addon: 'spotify', clientId, clientSecret }: checked live, then sealed and saved. */
export async function POST(request: Request) {
  const auth = await ownerOnly(request);
  if (auth instanceof Response) return auth;
  const read = await readBody(request);
  if (!read.ok) return read.response;
  const { body } = read;
  const addon = body.addon;
  if (addon !== 'chat' && addon !== 'spotify') return json(400, { error: 'Invalid request' });

  const hosting = hostingAddons();
  if (hosting[addon]) return json(409, { error: 'Your hosting already sets this add-on, so there\u2019s nothing to save here.' });
  const code = usableSetupCode(process.env.SETUP_CODE);
  if (!code) {
    return json(409, {
      error: `Keys can\u2019t be saved until this site has a setup code of at least ${MIN_SETUP_CODE_LENGTH} characters (SETUP_CODE in your hosting settings).`,
    });
  }

  const now = new Date();
  if (addon === 'chat') {
    const keyField = field(body.key);
    if ('bad' in keyField) return json(400, { error: BAD_FIELD });
    if ('empty' in keyField) return json(400, { error: 'Paste your Claude API key first.' });
    const key = keyField.value;
    if (key.length < MIN_CLAUDE_KEY_LENGTH) return json(400, { error: 'That key is too short to be a Claude API key \u2014 check you copied all of it.' });
    const checked = await checkAnthropicKey(key);
    if (!checked.ok) return failed(checked, 'chat');
    // Read again after the (slow) live check, so an overlapping save of the other add-on isn't dropped.
    const stored = await auth.store.addons.get();
    await auth.store.addons.set({ ...without(stored, 'chat', now), anthropicKey: encryptSecret(key, code) });
  } else {
    const idField = field(body.clientId);
    const secretField = field(body.clientSecret);
    if ('bad' in idField || 'bad' in secretField) return json(400, { error: 'That doesn\u2019t look like a Client ID and secret \u2014 paste each again without spaces.' });
    if ('empty' in idField || 'empty' in secretField) return json(400, { error: 'Paste both the Client ID and the Client secret.' });
    const clientId = idField.value;
    const clientSecret = secretField.value;
    const checked = await checkSpotifyCredentials(clientId, clientSecret);
    if (!checked.ok) return failed(checked, 'spotify');
    const stored = await auth.store.addons.get();
    await auth.store.addons.set({ ...without(stored, 'spotify', now), spotify: { clientId, clientSecret: encryptSecret(clientSecret, code) } });
    // A connection made through another Spotify app can't be refreshed with these keys: start again. Done after the
    // save, so a failed save keeps the old connection.
    if (stored?.spotify?.clientId !== clientId) await auth.store.spotify.remove();
  }
  return respond(auth.store, request);
}

/** ?addon=chat|spotify. Removing Spotify also forgets the connection. */
export async function DELETE(request: Request) {
  const auth = await ownerOnly(request);
  if (auth instanceof Response) return auth;
  const addon = new URL(request.url).searchParams.get('addon');
  if (addon !== 'chat' && addon !== 'spotify') return json(400, { error: 'Invalid request' });
  const stored = await auth.store.addons.get();
  if (stored) await auth.store.addons.set(without(stored, addon, new Date()));
  if (addon === 'spotify') await auth.store.spotify.remove();
  return respond(auth.store, request);
}
