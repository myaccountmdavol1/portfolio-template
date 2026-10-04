import { asRecord, stringList, type ScreensaverModule } from './module';

export interface FlurrySettings {
  colors: string[]; // #rrggbb
}

const FALLBACK = '#6f9bd1';

/** '#abc' → '#aabbcc', lower case; null when it isn't a hex colour. */
function normalHex(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return /^#[0-9a-f]{6}$/.test(v) ? v : null;
}

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return `#${[f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** The hue (0–359) of a hex colour; 0 for anything else. */
export function hexHue(hex: string): number {
  const n = normalHex(hex);
  return n ? Math.round(hexToHsl(n)[0]) : 0;
}

/** The accent and the hues 30° either side of it. */
export function neighbourHues(accent: string): string[] {
  const base = normalHex(accent) ?? FALLBACK;
  const [h, s, l] = hexToHsl(base);
  return [base, hslToHex((h + 30) % 360, s, l), hslToHex((h + 330) % 360, s, l)];
}

export const flurry: ScreensaverModule<FlurrySettings> = {
  id: 'flurry',
  name: 'Flurry',
  emptyNote: 'pick at least one colour.',
  defaults: (site) => ({ colors: neighbourHues(site.site.accent) }),
  read: (site, raw) => {
    const colors = (stringList(asRecord(raw).colors) ?? []).flatMap((c) => normalHex(c) ?? []);
    return colors.length > 0 ? { colors } : { colors: neighbourHues(site.site.accent) };
  },
  available: (_site, s) => s.colors.length > 0,
};
