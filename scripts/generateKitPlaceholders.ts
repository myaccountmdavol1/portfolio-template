// Writes public/kits/<file>.svg for every starter kit placeholder, plus public/kits/LICENSE.md.
// Usage: npm run kits:generate   (then commit public/kits)
import { mkdirSync, writeFileSync } from 'node:fs';
import { KIT_PLACEHOLDERS, KITS_LICENSE, placeholderSvg } from './kitPlaceholders';

const out = 'public/kits';
mkdirSync(out, { recursive: true });
for (const card of KIT_PLACEHOLDERS) writeFileSync(`${out}/${card.file}`, placeholderSvg(card));
writeFileSync(`${out}/LICENSE.md`, KITS_LICENSE);
console.log(`Wrote ${KIT_PLACEHOLDERS.length} pictures and LICENSE.md to ${out}`);
