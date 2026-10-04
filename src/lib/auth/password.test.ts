import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('passwords', () => {
  it('verifies the right password and rejects others', async () => {
    const { passwordHash, salt } = await hashPassword('correct horse');
    expect(passwordHash).toMatch(/^[a-f0-9]{128}$/);
    expect(salt).toMatch(/^[a-f0-9]{32}$/);
    await expect(verifyPassword('correct horse', passwordHash, salt)).resolves.toBe(true);
    await expect(verifyPassword('Correct horse', passwordHash, salt)).resolves.toBe(false);
    await expect(verifyPassword('correct horse', 'abcd', salt)).resolves.toBe(false); // malformed stored hash
  });

  it('salts every hash', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a.salt).not.toBe(b.salt);
    expect(a.passwordHash).not.toBe(b.passwordHash);
  });
});
