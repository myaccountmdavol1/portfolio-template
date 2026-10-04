import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATALOG_ICONS, ICON_PACKS } from '../src/lib/iconCatalog';

const files = CATALOG_ICONS.flatMap((icon) => [`${icon.slug}.png`, `${icon.slug}.webp`]);
const missingIn = (pack: string) => files.filter((f) => !existsSync(`icon-packs/${pack}/${f}`));

describe('icon packs on disk', () => {
  for (const pack of ICON_PACKS.filter((p) => !p.private)) {
    it(`${pack.id} has a PNG and a WebP for every catalog icon, and a licence`, () => {
      expect(missingIn(pack.id)).toEqual([]);
      expect(existsSync(`icon-packs/${pack.id}/LICENSE.md`)).toBe(true);
    });
  }

  it('a private pack, where present, is complete too', () => {
    for (const pack of ICON_PACKS.filter((p) => p.private && existsSync(`icon-packs/${p.id}`))) expect(missingIn(pack.id), pack.id).toEqual([]);
  });

  it('every pack folder is in the registry, so the editor can name it', () => {
    const folders = readdirSync('icon-packs', { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    for (const folder of folders) expect(ICON_PACKS.map((p) => p.id)).toContain(folder);
  });
});
