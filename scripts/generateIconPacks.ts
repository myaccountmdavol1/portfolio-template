// Writes icon-packs/<pack>/<slug>.png and .webp for every catalog icon, plus the pack's LICENSE.md.
// Usage: npm run icons:generate                 (every generated pack)
//        npm run icons:generate -- glass outline
// Re-run after adding catalog icons.
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { CATALOG_ICONS } from '../src/lib/iconCatalog';
import { GENERATED_PACKS, packLicense, PACK_STYLES } from './iconPackStyles';

async function generate(pack: string) {
  const style = PACK_STYLES[pack];
  if (!style) throw new Error(`Unknown pack "${pack}". Known: ${GENERATED_PACKS.join(', ')}`);
  const out = `icon-packs/${pack}`;
  mkdirSync(out, { recursive: true });
  for (const icon of CATALOG_ICONS) {
    const svg = Buffer.from(style(icon));
    await sharp(svg).png().toFile(`${out}/${icon.slug}.png`);
    await sharp(svg).webp({ quality: 90 }).toFile(`${out}/${icon.slug}.webp`);
  }
  writeFileSync(`${out}/LICENSE.md`, packLicense(pack));
  console.log(`Wrote ${CATALOG_ICONS.length * 2} icons to ${out}`);
}

async function main() {
  const packs = process.argv.slice(2);
  for (const pack of packs.length > 0 ? packs : GENERATED_PACKS) await generate(pack);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
