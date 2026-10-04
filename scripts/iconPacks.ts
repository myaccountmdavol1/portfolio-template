// Serves the icon packs. Copies every pack in icon-packs/ to public/icons/<pack>/ (gitignored), copies the pack named
// by ICON_PACK (else "default") to public/icons/catalog/ too, so sites without a pack and saved /icons/catalog/...
// links look as before, and writes public/icons/packs.json for the editor's Icon pack picker. Private packs (an
// owner's own, not openly licensed) are served only when ICON_PACK names them. Runs before dev, build, test and e2e.
import { cpSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PRIVATE_ICON_PACKS } from '../src/lib/iconCatalog';

export function resolvePack(requested: string | undefined, available: string[]): string {
  if (requested && available.includes(requested)) return requested;
  if (available.includes('default')) return 'default';
  if (available.length > 0) return available[0];
  throw new Error('No icon packs found in icon-packs/');
}

/** Every pack, except private ones other than the chosen pack. */
export function servedPacks(available: string[], chosen: string): string[] {
  return available.filter((p) => !PRIVATE_ICON_PACKS.includes(p) || p === chosen);
}

export function installPack(packsDir: string, iconsDir: string, requested: string | undefined) {
  const available = existsSync(packsDir)
    ? readdirSync(packsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
    : [];
  const pack = resolvePack(requested, available);
  const packs = servedPacks(available, pack);
  rmSync(iconsDir, { recursive: true, force: true });
  cpSync(join(packsDir, pack), join(iconsDir, 'catalog'), { recursive: true });
  for (const p of packs) cpSync(join(packsDir, p), join(iconsDir, p), { recursive: true });
  writeFileSync(join(iconsDir, 'packs.json'), `${JSON.stringify({ default: pack, packs })}\n`);
  return { pack, packs, files: readdirSync(join(iconsDir, 'catalog')).length };
}

// No import.meta: Playwright loads this file as CommonJS through e2e/globalSetup.ts.
if (/iconPacks\.ts$/.test(process.argv[1] ?? '')) {
  const requested = process.env.ICON_PACK || undefined;
  const { pack, packs, files } = installPack('icon-packs', 'public/icons', requested);
  if (requested && requested !== pack) console.warn(`Icon pack "${requested}" not found; using "${pack}".`);
  console.log(`Installed icon pack "${pack}" as the default (${files} files); serving ${packs.join(', ')}`);
}
