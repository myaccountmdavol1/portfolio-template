import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret } from './secrets';

const CODE = 'a-long-setup-code';

describe('add-on secrets', () => {
  it('round-trips, with a fresh nonce every time', () => {
    const a = encryptSecret('sk-ant-example-1234', CODE);
    const b = encryptSecret('sk-ant-example-1234', CODE);
    expect(decryptSecret(a, CODE)).toBe('sk-ant-example-1234');
    expect(decryptSecret(b, CODE)).toBe('sk-ant-example-1234');
    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data);
    expect(Buffer.from(a.iv, 'base64')).toHaveLength(12);
    expect(Object.keys(a).sort()).toEqual(['data', 'iv', 'salt', 'tag', 'v']);
    expect(a.v).toBe(1);
  });

  it('never stores the plain text', () => {
    const sealed = encryptSecret('sk-ant-example-1234', CODE);
    expect(JSON.stringify(sealed)).not.toContain('sk-ant');
    expect(Buffer.from(sealed.data, 'base64').toString('utf8')).not.toContain('sk-ant');
  });

  it('gives null for another setup code, a changed value, or junk, and never throws', () => {
    const sealed = encryptSecret('secret', CODE);
    expect(decryptSecret(sealed, 'another-setup-code')).toBeNull();
    expect(decryptSecret(sealed, '')).toBeNull();
    const flipped = Buffer.from(sealed.data, 'base64');
    flipped[0] ^= 1;
    expect(decryptSecret({ ...sealed, data: flipped.toString('base64') }, CODE)).toBeNull();
    expect(decryptSecret({ ...sealed, tag: Buffer.alloc(16).toString('base64') }, CODE)).toBeNull();
    expect(decryptSecret({ ...sealed, iv: 'short' }, CODE)).toBeNull();
    for (const junk of [null, undefined, 'text', 42, {}, { ...sealed, v: 2 }, { ...sealed, data: 7 }]) {
      expect(decryptSecret(junk, CODE)).toBeNull();
    }
  });

  it('handles any text, including the empty string', () => {
    for (const plain of ['', 'caf\u00e9 \u2014 \u{1F3B5}', 'x'.repeat(500)]) expect(decryptSecret(encryptSecret(plain, CODE), CODE)).toBe(plain);
  });

  it('uses a fresh salt for every seal', () => {
    const a = encryptSecret('same', CODE);
    const b = encryptSecret('same', CODE);
    expect(a.salt).not.toBe(b.salt);
    expect(Buffer.from(a.salt, 'base64')).toHaveLength(16);
    expect(Object.keys(a).sort()).toEqual(['data', 'iv', 'salt', 'tag', 'v']);
  });

  it('gives null for a missing or wrong-length salt, a wrong iv or a wrong-length tag', () => {
    const sealed = encryptSecret('secret', CODE);
    const { salt: _salt, ...noSalt } = sealed;
    expect(decryptSecret(noSalt, CODE)).toBeNull();
    expect(decryptSecret({ ...sealed, salt: Buffer.alloc(8).toString('base64') }, CODE)).toBeNull();
    expect(decryptSecret({ ...sealed, iv: Buffer.alloc(12, 7).toString('base64') }, CODE)).toBeNull();
    expect(decryptSecret({ ...sealed, tag: Buffer.alloc(8).toString('base64') }, CODE)).toBeNull();
  });

  it('refuses to seal with an empty setup code', () => {
    expect(() => encryptSecret('x', '')).toThrow();
  });
});
