import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { installPack, resolvePack, servedPacks } from './iconPacks';

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

describe('servedPacks', () => {
  it('serves every pack, and the private macOS pack only when it was chosen', () => {
    expect(servedPacks(['default', 'glass', 'macos'], 'default')).toEqual(['default', 'glass']);
    expect(servedPacks(['default', 'glass', 'macos'], 'macos')).toEqual(['default', 'glass', 'macos']);
    expect(servedPacks(['default', 'my-pack'], 'default')).toEqual(['default', 'my-pack']);
  });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'packs-'));
  const packs = join(root, 'icon-packs');
  for (const [pack, body] of [
    ['default', 'd'],
    ['glass', 'g'],
    ['macos', 'm'],
  ]) {
    mkdirSync(join(packs, pack), { recursive: true });
    writeFileSync(join(packs, pack, 'mail.png'), body);
    writeFileSync(join(packs, pack, 'mail.webp'), body);
  }
  const icons = join(root, 'public/icons');
  mkdirSync(join(icons, 'catalog'), { recursive: true });
  writeFileSync(join(icons, 'catalog/stale.png'), 'old');
  return { packs, icons };
}

describe('installPack', () => {
  it('serves the chosen pack at /icons/catalog, every pack by name, and a manifest', () => {
    const { packs, icons } = fixture();
    expect(installPack(packs, icons, 'macos')).toEqual({ pack: 'macos', packs: ['default', 'glass', 'macos'], files: 2 });
    // replaces the old catalog: the stale file is gone
    expect(readdirSync(join(icons, 'catalog')).sort()).toEqual(['mail.png', 'mail.webp']);
    expect(readFileSync(join(icons, 'catalog/mail.png'), 'utf8')).toBe('m');
    expect(readFileSync(join(icons, 'glass/mail.webp'), 'utf8')).toBe('g');
    expect(readdirSync(icons).sort()).toEqual(['catalog', 'default', 'glass', 'macos', 'packs.json']);
    expect(JSON.parse(readFileSync(join(icons, 'packs.json'), 'utf8'))).toEqual({ default: 'macos', packs: ['default', 'glass', 'macos'] });
  });

  it('keeps the private macOS pack off a site that did not choose it', () => {
    const { packs, icons } = fixture();
    expect(installPack(packs, icons, undefined)).toEqual({ pack: 'default', packs: ['default', 'glass'], files: 2 });
    expect(existsSync(join(icons, 'macos'))).toBe(false);
    expect(readFileSync(join(icons, 'catalog/mail.png'), 'utf8')).toBe('d');
    expect(JSON.parse(readFileSync(join(icons, 'packs.json'), 'utf8'))).toEqual({ default: 'default', packs: ['default', 'glass'] });
  });
});
