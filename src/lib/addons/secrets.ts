import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import type { Encrypted } from './types';

// Server-only. Add-on keys are sealed with AES-256-GCM under a key derived from the site's SETUP_CODE, so a
// copy of the database alone can't open them. The key comes from scrypt with a random salt per value: a slow,
// salted KDF, because a setup code may be human-chosen and so guessable. A different setup code simply can't
// open a value (null, never a throw). Derived keys are cached per process so repeated opens cost one derivation.

export type { Encrypted } from './types';

const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const CACHE_MAX = 16;

const keyCache = new Map<string, Buffer>();

function keyFor(setupCode: string, salt: Buffer): Buffer {
  // Keyed by a hash of the code, never the raw code.
  const id = salt.toString('base64') + '\0' + createHash('sha256').update(setupCode).digest('hex');
  const hit = keyCache.get(id);
  if (hit) return hit;
  const key = scryptSync(setupCode, salt, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  if (keyCache.size >= CACHE_MAX) keyCache.delete(keyCache.keys().next().value as string);
  keyCache.set(id, key);
  return key;
}

export function encryptSecret(plain: string, setupCode: string): Encrypted {
  if (!setupCode) throw new Error('A setup code is needed to seal a secret.');
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', keyFor(setupCode, salt), iv, { authTagLength: TAG_BYTES });
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return { v: 1, salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
}

function isEncrypted(value: unknown): value is Encrypted {
  const v = value as Partial<Encrypted> | null;
  return Boolean(
    v && typeof v === 'object' && v.v === 1 && typeof v.salt === 'string' && typeof v.iv === 'string' && typeof v.tag === 'string' && typeof v.data === 'string',
  );
}

/** The plain text, or null when the value is junk, was changed, or was sealed with another setup code. */
export function decryptSecret(value: unknown, setupCode: string): string | null {
  if (!isEncrypted(value) || !setupCode) return null;
  try {
    const salt = Buffer.from(value.salt, 'base64');
    const iv = Buffer.from(value.iv, 'base64');
    const tag = Buffer.from(value.tag, 'base64');
    if (salt.length !== SALT_BYTES || iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null;
    const decipher = createDecipheriv('aes-256-gcm', keyFor(setupCode, salt), iv, { authTagLength: TAG_BYTES });
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
