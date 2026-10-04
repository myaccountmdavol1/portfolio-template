import { join } from 'node:path';
import { isPackId } from '@/lib/iconCatalog';
import type { CatalogIconSlug } from '@/lib/types';

/** The PNGs to try for a catalog icon on a share image: the site's pack, then the build's default pack. */
export function iconPngPaths(slug: CatalogIconSlug, pack: string | undefined, root = process.cwd()): string[] {
  const dirs = isPackId(pack) && pack !== 'catalog' ? [pack, 'catalog'] : ['catalog'];
  return dirs.map((dir) => join(root, 'public/icons', dir, `${slug}.png`));
}
