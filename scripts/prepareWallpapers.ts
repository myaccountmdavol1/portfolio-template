// Turns downloaded originals into scenery wallpapers in public/wallpapers:
//   <id>.webp        at most 2560 px wide and 450 KB, metadata stripped
//   <id>-thumb.webp  320 px wide, for the editor's picker
// and prints each photo's tone ('light' = dark text) for src/lib/scenery.ts.
// Usage: npx tsx scripts/prepareWallpapers.ts <folder of originals named <id>.jpg|.jpeg|.png|.webp>
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import sharp from 'sharp';
import { averageLuminance, toneForLuminance } from '../src/lib/tone';

const OUT = 'public/wallpapers';
const MAX_BYTES = 450 * 1024;

async function prepare(src: string, id: string) {
  const out = join(OUT, `${id}.webp`);
  // sharp drops EXIF/GPS metadata unless asked to keep it; .rotate() applies the camera orientation first.
  for (const quality of [72, 64, 56, 48, 40]) {
    await sharp(src).rotate().resize({ width: 2560, withoutEnlargement: true }).webp({ quality }).toFile(out);
    if (statSync(out).size <= MAX_BYTES) break;
  }
  if (statSync(out).size > MAX_BYTES) throw new Error(`${id}: still over 450 KB at quality 40`);
  await sharp(src).rotate().resize({ width: 320 }).webp({ quality: 70 }).toFile(join(OUT, `${id}-thumb.webp`));
  const { data } = await sharp(src).rotate().resize(48, 48, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const tone = toneForLuminance(averageLuminance(new Uint8ClampedArray(data)));
  console.log(`${id}: ${Math.round(statSync(out).size / 1024)} KB, tone '${tone}'`);
}

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error('Usage: npx tsx scripts/prepareWallpapers.ts <folder of originals>');
  mkdirSync(OUT, { recursive: true });
  for (const file of readdirSync(dir).sort()) {
    const ext = extname(file).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;
    await prepare(join(dir, file), file.slice(0, -ext.length));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
