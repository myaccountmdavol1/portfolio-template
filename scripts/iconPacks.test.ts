import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { installPack, resolvePack } from './iconPacks';

describe('resolvePack', () => {
  it('uses the requested pack when it exists', () => {
    expect(resolvePack('macos', ['default', 'macos'])).toBe('macos');
  });
  it('falls back to default when the requested pack is missing (the template has no macos pack)', () => {
    expect(resolvePack('macos', ['default'])).toBe('default');
    expect(resolvePack(undefined, ['default', 'macos'])).toBe('default');
  });
  it('falls back to the first pack when there is no default yet', () => {
    expect(resolvePack(undefined, ['macos'])).toBe('macos');
  });
  it('throws when there are no packs at all', () => {
    expect(() => resolvePack(undefined, [])).toThrow(/icon-packs/);
  });
});

describe('installPack', () => {
  it('replaces the public catalog with the chosen pack', () => {
    const root = mkdtempSync(join(tmpdir(), 'packs-'));
    const packs = join(root, 'icon-packs');
    const pub = join(root, 'public/icons/catalog');
    mkdirSync(join(packs, 'default'), { recursive: true });
    mkdirSync(join(packs, 'macos'), { recursive: true });
    writeFileSync(join(packs, 'default/mail.png'), 'd');
    writeFileSync(join(packs, 'macos/mail.png'), 'm');
    writeFileSync(join(packs, 'macos/mail.webp'), 'm');
    mkdirSync(pub, { recursive: true });
    writeFileSync(join(pub, 'stale.png'), 'old');

    expect(installPack(packs, pub, 'macos')).toEqual({ pack: 'macos', files: 2 });
    expect(readdirSync(pub).sort()).toEqual(['mail.png', 'mail.webp']);
  });
});
