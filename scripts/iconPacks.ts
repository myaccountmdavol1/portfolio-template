// Copies the icon pack named by ICON_PACK into public/icons/catalog (gitignored), so every icon URL stays
// /icons/catalog/<slug>.webp whichever pack a site uses. Runs before dev, build, test and e2e.
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

export function resolvePack(requested: string | undefined, available: string[]): string {
  if (requested && available.includes(requested)) return requested;
  if (available.includes('default')) return 'default';
  if (available.length > 0) return available[0];
  throw new Error('No icon packs found in icon-packs/');
}

export function installPack(packsDir: string, publicDir: string, requested: string | undefined) {
  const available = existsSync(packsDir)
    ? readdirSync(packsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
    : [];
  const pack = resolvePack(requested, available);
  rmSync(publicDir, { recursive: true, force: true });
  cpSync(join(packsDir, pack), publicDir, { recursive: true });
  return { pack, files: readdirSync(publicDir).length };
}

// No import.meta: Playwright loads this file as CommonJS through e2e/globalSetup.ts.
if (/iconPacks\.ts$/.test(process.argv[1] ?? '')) {
  const requested = process.env.ICON_PACK || undefined;
  const { pack, files } = installPack('icon-packs', 'public/icons/catalog', requested);
  if (requested && requested !== pack) console.warn(`Icon pack "${requested}" not found; using "${pack}".`);
  console.log(`Installed icon pack "${pack}" (${files} files)`);
}
