import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (password: string, salt: string, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 64;
export const MIN_PASSWORD_LENGTH = 8;

/** A salted scrypt hash, stored as hex. */
export async function hashPassword(password: string): Promise<{ passwordHash: string; salt: string }> {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, KEY_LENGTH);
  return { passwordHash: key.toString('hex'), salt };
}

export async function verifyPassword(password: string, passwordHash: string, salt: string): Promise<boolean> {
  const key = await scrypt(password, salt, KEY_LENGTH);
  const expected = Buffer.from(passwordHash, 'hex');
  return expected.length === key.length && timingSafeEqual(key, expected);
}
