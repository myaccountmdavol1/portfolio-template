// The template's own app icons: a coloured rounded square with a white glyph. Openly licensed sources only:
// Lucide (ISC) for symbols and Simple Icons (CC0) for brands, so the template ships no Apple artwork.
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as L from 'lucide-react';
import { siGoogleslides, siNetflix, siSpotify } from 'simple-icons';
import type { CatalogIcon } from '../src/lib/iconCatalog';

type Glyph = { lucide: ComponentType<Record<string, unknown>> } | { brand: { path: string } };

const lucide = (c: unknown): Glyph => ({ lucide: c as ComponentType<Record<string, unknown>> });

export const GLYPHS: Partial<Record<CatalogIcon['slug'], Glyph>> = {
  'app-store': lucide(L.ShoppingBag), apps: lucide(L.LayoutGrid), books: lucide(L.BookOpen),
  calculator: lucide(L.Calculator), calendar: lucide(L.Calendar), clock: lucide(L.Clock),
  contacts: lucide(L.Contact), facetime: lucide(L.Video), 'find-my': lucide(L.LocateFixed),
  finder: lucide(L.Smile), freeform: lucide(L.PenTool), games: lucide(L.Gamepad2), home: lucide(L.House),
  journal: lucide(L.NotebookPen), mail: lucide(L.Mail), maps: lucide(L.Map), messages: lucide(L.MessageCircle),
  music: lucide(L.Music), news: lucide(L.Newspaper), notes: lucide(L.StickyNote), passwords: lucide(L.KeyRound),
  phone: lucide(L.Phone), 'photo-booth': lucide(L.Camera), photos: lucide(L.Flower2), podcasts: lucide(L.Podcast),
  preview: lucide(L.Image), reminders: lucide(L.ListChecks), safari: lucide(L.Compass), siri: lucide(L.AudioLines),
  stickies: lucide(L.StickyNote), stocks: lucide(L.ChartLine), 'system-settings': lucide(L.Settings),
  terminal: lucide(L.SquareTerminal), textedit: lucide(L.FileText), trash: lucide(L.Trash2),
  'trash-full': lucide(L.Trash2), tv: lucide(L.Tv), 'voice-memos': lucide(L.Mic), weather: lucide(L.CloudSun),
  wallet: lucide(L.Wallet), chess: lucide(L.Crown), dictionary: lucide(L.BookA), 'font-book': lucide(L.Type),
  'disk-utility': lucide(L.HardDrive), 'activity-monitor': lucide(L.Activity), console: lucide(L.ScrollText),
  'time-machine': lucide(L.History), tips: lucide(L.Lightbulb), icloud: lucide(L.Cloud),
  magnifier: lucide(L.ZoomIn), spotlight: lucide(L.Search), wallpaper: lucide(L.Mountain),
  'screen-time': lucide(L.Hourglass), batteries: lucide(L.BatteryFull), 'control-center': lucide(L.ToggleRight),
  'game-center': lucide(L.Trophy), 'drive-backup': lucide(L.DatabaseBackup), 'drive-external': lucide(L.HardDrive),
  'drive-internal': lucide(L.HardDrive), 'drive-network': lucide(L.Network), 'drive-removable': lucide(L.Usb),
  canva: lucide(L.Palette), 'google-slides': { brand: siGoogleslides }, spotify: { brand: siSpotify },
  netflix: { brand: siNetflix },
};

export const GRADIENTS: Record<CatalogIcon['category'], [string, string]> = {
  productivity: ['#5ac8fa', '#007aff'],
  media: ['#ff8a65', '#ff2d55'],
  system: ['#a1a1aa', '#52525b'],
  utilities: ['#34d399', '#0f766e'],
  drives: ['#cbd5e1', '#64748b'],
};

export function initials(label: string): string {
  return label
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/** The glyph for an icon (Lucide symbol, Simple Icons brand, or initials) centred on a 256px canvas, in `color`. */
export function glyphMarkup(icon: CatalogIcon, color = '#fff'): string {
  const g = GLYPHS[icon.slug];
  if (!g) {
    return `<text x="128" y="128" dy=".35em" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="104" fill="${color}">${initials(icon.label)}</text>`;
  }
  if ('brand' in g) {
    // Simple Icons paths are drawn on a 24x24 grid: 24 * 6 = 144px, centred.
    return `<g transform="translate(56 56) scale(6)"><path d="${g.brand.path}" fill="${color}"/></g>`;
  }
  const inner = renderToStaticMarkup(createElement(g.lucide, { size: 152, color, strokeWidth: 1.75 }));
  return `<g transform="translate(52 52)">${inner}</g>`;
}

export function iconSvg(icon: CatalogIcon): string {
  const [top, bottom] = GRADIENTS[icon.category];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
<linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<rect x="8" y="8" width="240" height="240" rx="56" fill="url(#g)"/>
<rect x="8" y="8" width="240" height="240" rx="56" fill="url(#h)"/>
${glyphMarkup(icon)}
</svg>`;
}
