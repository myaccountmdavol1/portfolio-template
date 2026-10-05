// The starter kits' "Replace me" pictures (public/kits): a card in the kit's colour with a Lucide glyph (ISC) and
// the words "Replace me", so nobody mistakes them for real photos. `npm run kits:generate` writes them.
// Add a picture: an entry here, then run the script and commit public/kits.
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as L from 'lucide-react';
import { mix } from './iconPackStyles';

export interface KitPlaceholder {
  /** The file in public/kits, e.g. "teacher-classroom-1.svg". */
  file: string;
  /** The kit's accent (#rrggbb): the card's colour. */
  color: string;
  glyph: ComponentType<Record<string, unknown>>;
  /** What to replace it with, under "Replace me". */
  caption: string;
  shape: 'landscape' | 'square';
}

const glyph = (c: unknown) => c as ComponentType<Record<string, unknown>>;

const TEACHER = '#2f6f4f';
const STUDENT = '#7c3aed';
const CREATIVE = '#d9480f';
const PROFESSIONAL = '#1e3a5f';

export const KIT_PLACEHOLDERS: KitPlaceholder[] = [
  { file: 'teacher-headshot.svg', color: TEACHER, glyph: glyph(L.UserRound), caption: 'Your photo', shape: 'square' },
  { file: 'teacher-classroom-1.svg', color: TEACHER, glyph: glyph(L.School), caption: 'Your classroom', shape: 'landscape' },
  { file: 'teacher-classroom-2.svg', color: TEACHER, glyph: glyph(L.Palette), caption: 'Student work', shape: 'landscape' },
  { file: 'student-headshot.svg', color: STUDENT, glyph: glyph(L.UserRound), caption: 'Your photo', shape: 'square' },
  { file: 'student-project-1.svg', color: STUDENT, glyph: glyph(L.Lightbulb), caption: 'A project picture', shape: 'landscape' },
  { file: 'student-project-2.svg', color: STUDENT, glyph: glyph(L.FlaskConical), caption: 'A project picture', shape: 'landscape' },
  { file: 'creative-headshot.svg', color: CREATIVE, glyph: glyph(L.UserRound), caption: 'Your photo', shape: 'square' },
  { file: 'creative-project-1.svg', color: CREATIVE, glyph: glyph(L.Brush), caption: 'Your work', shape: 'landscape' },
  { file: 'creative-project-2.svg', color: CREATIVE, glyph: glyph(L.Camera), caption: 'Your work', shape: 'landscape' },
  { file: 'professional-headshot.svg', color: PROFESSIONAL, glyph: glyph(L.UserRound), caption: 'Your photo', shape: 'square' },
  { file: 'professional-project-1.svg', color: PROFESSIONAL, glyph: glyph(L.Briefcase), caption: 'A case study picture', shape: 'landscape' },
  { file: 'professional-project-2.svg', color: PROFESSIONAL, glyph: glyph(L.ChartNoAxesCombined), caption: 'A case study picture', shape: 'landscape' },
];

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FONT = 'font-family="Helvetica, Arial, sans-serif"';

export function placeholderSvg(card: KitPlaceholder): string {
  const [w, h] = card.shape === 'square' ? [800, 800] : [1200, 750];
  const cx = w / 2;
  const cy = h / 2;
  const icon = renderToStaticMarkup(createElement(card.glyph, { size: 160, color: '#ffffff', strokeWidth: 1.5 }));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(card.color, '#ffffff', 0.18)}"/><stop offset="1" stop-color="${mix(card.color, '#000000', 0.25)}"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<rect x="28" y="28" width="${w - 56}" height="${h - 56}" rx="32" fill="none" stroke="#ffffff" stroke-opacity=".6" stroke-width="4" stroke-dasharray="18 14"/>
<g transform="translate(${cx - 80} ${cy - 170})">${icon}</g>
<text x="${cx}" y="${cy + 70}" text-anchor="middle" ${FONT} font-weight="700" font-size="72" fill="#ffffff">Replace me</text>
<text x="${cx}" y="${cy + 125}" text-anchor="middle" ${FONT} font-size="32" fill="#ffffff" fill-opacity=".85">${esc(card.caption)}</text>
</svg>
`;
}

export const KITS_LICENSE = `# Starter kit pictures

The "Replace me" cards in this folder are placeholders for the starter kits in \`src/lib/starterKits/\`.
Replace them with your own pictures in the editor.

- Made by \`scripts/generateKitPlaceholders.ts\` (\`npm run kits:generate\`).
- Glyphs: Lucide, ISC licence (https://lucide.dev/license), reproduced below.
- The cards themselves (colours, layout and words) are dedicated to the public domain under CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/).

## Lucide

ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
`;
