import { installPack } from '../scripts/iconPacks';

export default function globalSetup() {
  // Match `npm run dev`/`build`, which read .env.local; never override an ICON_PACK already set.
  try {
    process.loadEnvFile('.env.local');
  } catch {
    // no .env.local: fall back to the default pack
  }
  installPack('icon-packs', 'public/icons/catalog', process.env.ICON_PACK || undefined);
}
