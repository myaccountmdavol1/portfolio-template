import type { BadgePass } from './types';

// Badges for the Wallet app: importing from Credly, colours, filters, and dates. Pure, so it's easy to test.

/** Pass colours (top → bottom of the gradient), picked per issuer so one issuer's passes match. */
const PALETTE: [string, string][] = [
  ['#0a84ff', '#0054b4'],
  ['#ff375f', '#b3143c'],
  ['#30d158', '#1a8a3a'],
  ['#ff9f0a', '#c25e00'],
  ['#bf5af2', '#7d2bb0'],
  ['#64d2ff', '#1f8fc2'],
  ['#ff6961', '#c0362c'],
  ['#5e5ce6', '#3634a3'],
  ['#1d1d1f', '#3a3a3c'],
];

function hash(s: string): number {
  let h = 0;
  for (const ch of s.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** CSS background for a pass. A custom colour gets a gentle darker fade. */
export function passBackground(pass: Pick<BadgePass, 'issuer' | 'color'>): string {
  if (pass.color) return `linear-gradient(160deg, ${pass.color} 0%, color-mix(in srgb, ${pass.color} 70%, black) 100%)`;
  const [a, b] = PALETTE[hash(pass.issuer || 'badge') % PALETTE.length];
  return `linear-gradient(160deg, ${a} 0%, ${b} 100%)`;
}

export const passGroup = (p: Pick<BadgePass, 'category' | 'issuer'>) => p.category?.trim() || p.issuer.trim() || 'Other';

/** Filter chips: each group with how many passes it has, biggest first. */
export function passGroups(passes: BadgePass[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of passes) counts.set(passGroup(p), (counts.get(passGroup(p)) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** “7 badges · 2 issuers · 18 skills” */
export function passSummary(passes: BadgePass[], noun = 'badge'): string {
  const issuers = new Set(passes.map((p) => p.issuer.trim().toLowerCase()).filter(Boolean)).size;
  const skills = new Set(passes.flatMap((p) => p.skills ?? []).map((s) => s.toLowerCase())).size;
  const parts = [`${passes.length} ${noun}${passes.length === 1 ? '' : 's'}`];
  if (issuers) parts.push(`${issuers} issuer${issuers === 1 ? '' : 's'}`);
  if (skills) parts.push(`${skills} skill${skills === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

export function isExpired(pass: Pick<BadgePass, 'expires'>, now = new Date()): boolean {
  return !!pass.expires && new Date(`${pass.expires}T23:59:59Z`) < now;
}

/** “Aug 2026” (dates are stored as YYYY-MM-DD; read in UTC so they don't shift a day). */
export function monthYear(date?: string): string {
  if (!date || !/^\d{4}-\d{2}(-\d{2})?$/.test(date)) return '';
  const [y, m] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Newest first; undated passes last. */
export function sortPasses(passes: BadgePass[]): BadgePass[] {
  return [...passes].sort((a, b) => (b.earned ?? '').localeCompare(a.earned ?? ''));
}

// ---------------- Credly ----------------

/** The username in a Credly profile link (credly.com/users/<name>, with or without /badges), or null. */
export function credlyUsername(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-z0-9._-]{2,80}$/i.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (!/(^|\.)credly\.com$/i.test(url.hostname)) return null;
    const m = url.pathname.match(/^\/users\/([a-z0-9._-]{2,80})/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

interface CredlyBadge {
  id?: string;
  issued_at_date?: string;
  expires_at_date?: string | null;
  image_url?: string;
  badge_template?: {
    name?: string;
    description?: string;
    image_url?: string;
    level?: string | null;
    skills?: ({ name?: string } | string)[];
  };
  issuer?: { entities?: { entity?: { name?: string; image_url?: string } }[] };
}

/** Passes from Credly's public badges feed (credly.com/users/<name>/badges.json). */
export function parseCredlyBadges(body: unknown): BadgePass[] {
  const data = (body as { data?: CredlyBadge[] } | null)?.data;
  if (!Array.isArray(data)) return [];
  return data.flatMap((b): BadgePass[] => {
    const t = b.badge_template;
    if (!b.id || !t?.name) return [];
    const issuer = b.issuer?.entities?.map((e) => e.entity?.name).find(Boolean) ?? 'Credly';
    const logo = b.issuer?.entities?.map((e) => e.entity?.image_url).find(Boolean);
    const skills = (t.skills ?? []).map((s) => (typeof s === 'string' ? s : s.name)).filter((s): s is string => !!s);
    return [
      {
        id: `credly-${b.id}`,
        title: t.name,
        issuer,
        imageUrl: b.image_url ?? t.image_url,
        ...(logo ? { issuerLogoUrl: logo } : {}),
        verifyUrl: `https://www.credly.com/badges/${b.id}`,
        ...(b.issued_at_date ? { earned: b.issued_at_date } : {}),
        ...(b.expires_at_date ? { expires: b.expires_at_date } : {}),
        ...(t.description ? { description: t.description } : {}),
        ...(skills.length ? { skills } : {}),
        ...(t.level ? { level: t.level } : {}),
        credentialId: b.id,
        source: 'credly',
      },
    ];
  });
}

/** Adds imported passes, skipping any already there (same verify link). Imports go on top. */
export function mergePasses(existing: BadgePass[], incoming: BadgePass[]): { passes: BadgePass[]; added: number } {
  const known = new Set(existing.map((p) => p.verifyUrl ?? p.id));
  const fresh = incoming.filter((p) => !known.has(p.verifyUrl ?? p.id));
  return { passes: [...fresh, ...existing], added: fresh.length };
}

// ---------------- colours from the badge art ----------------

const hex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
const luminance = (r: number, g: number, b: number) => {
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

/**
 * The badge's main colour from its pixels (RGBA), dark enough for white text on the pass.
 * Looks at colourful pixels only, grouped by hue; undefined when the art is black, white, or grey.
 */
export function pickPassColor(rgba: ArrayLike<number>): string | undefined {
  const buckets = Array.from({ length: 12 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const [r, g, b, a] = [rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]];
    if (a < 128) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (sat < 0.3 || max < 40 || max > 250 * 1.02) continue;
    let hue = 0;
    if (max === r) hue = ((g - b) / (max - min)) % 6;
    else if (max === g) hue = (b - r) / (max - min) + 2;
    else hue = (r - g) / (max - min) + 4;
    const bucket = buckets[Math.floor((((hue * 60) % 360) + 360) % 360 / 30)];
    bucket.w += sat;
    bucket.r += r * sat;
    bucket.g += g * sat;
    bucket.b += b * sat;
  }
  const best = buckets.reduce((a, b) => (b.w > a.w ? b : a));
  if (best.w < 1) return undefined;
  let [r, g, b] = [best.r / best.w, best.g / best.w, best.b / best.w];
  // Darken until white text reads well on it.
  for (let i = 0; i < 12 && luminance(r, g, b) > 0.3; i++) [r, g, b] = [r * 0.88, g * 0.88, b * 0.88];
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** A readable title from an uploaded file name: “google-certified_educator L1.png” → “Google Certified Educator L1”. */
export function titleFromFile(name: string): string {
  const base = name.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return base.replace(/\b[a-z]/g, (c) => c.toUpperCase()) || 'New badge';
}

/** A fresh pass for a dropped file (the owner fills in the rest). */
export function passFromFile(name: string, url: string, kind: 'image' | 'pdf', color?: string): BadgePass {
  return {
    id: `pass-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: titleFromFile(name),
    issuer: '',
    ...(kind === 'image' ? { imageUrl: url } : { certificateUrl: url }),
    ...(color ? { color } : {}),
  };
}

/** Earned in the last 60 days: the pass gets a “New” ribbon. */
export function isNew(pass: Pick<BadgePass, 'earned'>, now = new Date()): boolean {
  if (!pass.earned) return false;
  const earned = new Date(`${pass.earned}T00:00:00Z`).getTime();
  return now.getTime() - earned >= 0 && now.getTime() - earned < 60 * 24 * 60 * 60 * 1000;
}

/** Passes grouped by year for the timeline, newest year first; undated ones last. */
export function passesByYear(passes: BadgePass[]): { year: string; passes: BadgePass[] }[] {
  const groups = new Map<string, BadgePass[]>();
  for (const p of sortPasses(passes)) {
    const year = p.earned?.slice(0, 4) || 'Undated';
    groups.set(year, [...(groups.get(year) ?? []), p]);
  }
  return [...groups].map(([year, list]) => ({ year, passes: list }));
}

// ---------------- Accredible (Google for Education and others) ----------------

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** The credential id in an Accredible link (edu.google.accredible.com/<id>, credential.net/<id>, …), or null. */
export function accredibleCredentialId(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (!/(^|\.)(accredible\.com|credential\.net)$/i.test(url.hostname)) return null;
    return url.pathname.match(UUID)?.[0].toLowerCase() ?? null;
  } catch {
    return null;
  }
}

/** Plain text from the little bit of HTML Accredible puts in descriptions. */
function plainText(html: string): string {
  return html
    .replace(/<br\s*\/?>|<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{2,}/g, '\n')
    .trim();
}

interface AccredibleCredential {
  uuid?: string;
  name?: string;
  description?: string;
  issued_on?: string;
  expired_on?: string | null;
  url?: string;
  private?: boolean;
  revoked_at?: string | null;
  badge_image?: string;
  issuer?: { name?: string; image_url?: string };
  group?: { course_name?: string };
  learning_outcomes?: (string | { name?: string })[];
}

/** A pass from Accredible's public credential record (`/v1/credential-net/credentials/<id>`). */
export function parseAccredibleCredential(body: unknown, badgeImageUrl?: string): BadgePass | null {
  const c = (body as { data?: AccredibleCredential } | null)?.data;
  const title = c?.name || c?.group?.course_name;
  if (!c?.uuid || !title || c.private || c.revoked_at) return null;
  const skills = (c.learning_outcomes ?? []).map((s) => (typeof s === 'string' ? s : s.name)).filter((s): s is string => !!s);
  const description = c.description ? plainText(c.description) : '';
  return {
    id: `accredible-${c.uuid}`,
    title,
    issuer: c.issuer?.name || 'Accredible',
    ...(badgeImageUrl || c.badge_image ? { imageUrl: badgeImageUrl || c.badge_image } : {}),
    ...(c.issuer?.image_url ? { issuerLogoUrl: c.issuer.image_url } : {}),
    verifyUrl: c.url || `https://www.credential.net/${c.uuid}`,
    ...(c.issued_on ? { earned: c.issued_on } : {}),
    ...(c.expired_on ? { expires: c.expired_on } : {}),
    ...(description ? { description } : {}),
    ...(skills.length ? { skills } : {}),
    credentialId: c.uuid,
  };
}

// ---------------- other badge and certificate links ----------------

export type BadgeLinkKind = 'credly-profile' | 'accredible' | 'openbadge' | 'skilljar' | 'skillshop' | 'canva';

/** Which importer handles a pasted link (null = not a link we know). */
export function badgeLinkKind(input: string): BadgeLinkKind | null {
  if (accredibleCredentialId(input)) return 'accredible';
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return credlyUsername(input) ? 'credly-profile' : null;
  }
  const host = url.hostname.toLowerCase();
  if (/(^|\.)credly\.com$/.test(host)) return credlyUsername(input) ? 'credly-profile' : null;
  // Parchment (formerly Badgr / Canvas Credentials): standard Open Badges 2.0 assertions.
  if (/(^|\.)(parchment\.com|badgr\.io|badgr\.com)$/.test(host) && /\/public\/assertions\/[\w-]+/.test(url.pathname)) return 'openbadge';
  if (host === 'verify.skilljar.com' && /^\/c\/[\w-]+/.test(url.pathname)) return 'skilljar';
  if (/(^|\.)exceedlms\.com$/.test(host) && /\/student\/award\/[\w-]+/.test(url.pathname)) return 'skillshop';
  if (/(^|\.)canva\.com$/.test(host) && /certification/.test(url.pathname)) return 'canva';
  return null;
}

/** YYYY-MM-DD from “Nov. 2, 2025”, “June 12, 2024”, or an ISO timestamp. */
export function isoDate(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const m = text.match(/([A-Za-z]{3,9})\.?\s+(\d{1,2}),\s*(\d{4})/);
  if (!m) return undefined;
  const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[1].slice(0, 3).toLowerCase());
  if (month < 0) return undefined;
  return `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

interface OpenBadgeAssertion {
  id?: string;
  issuedOn?: string;
  expires?: string;
  revoked?: boolean;
  image?: string | { id?: string };
}
interface OpenBadgeClass {
  name?: string;
  description?: string;
  image?: string | { id?: string };
  tags?: string[];
  alignment?: { targetName?: string }[];
}
interface OpenBadgeIssuer {
  name?: string;
  image?: string | { id?: string };
}
const imageOf = (image: string | { id?: string } | undefined) => (typeof image === 'string' ? image : image?.id);

/** A pass from an Open Badges 2.0 assertion plus its badge class and issuer (Parchment, Badgr, …). */
export function parseOpenBadge(
  assertion: OpenBadgeAssertion | null,
  badge: OpenBadgeClass | null,
  issuer: OpenBadgeIssuer | null,
  link: string,
  imageUrl?: string,
): BadgePass | null {
  if (!assertion?.id || !badge?.name || assertion.revoked) return null;
  const id = assertion.id.split('/').pop() ?? assertion.id;
  const skills = [...(badge.tags ?? []), ...(badge.alignment ?? []).map((a) => a.targetName).filter((s): s is string => !!s)];
  return {
    id: `openbadge-${id}`,
    title: badge.name,
    issuer: issuer?.name || 'Open Badge',
    ...(imageUrl || imageOf(assertion.image) || imageOf(badge.image) ? { imageUrl: imageUrl || imageOf(assertion.image) || imageOf(badge.image) } : {}),
    ...(imageOf(issuer?.image) ? { issuerLogoUrl: imageOf(issuer?.image) } : {}),
    verifyUrl: link,
    ...(isoDate(assertion.issuedOn) ? { earned: isoDate(assertion.issuedOn) } : {}),
    ...(isoDate(assertion.expires) ? { expires: isoDate(assertion.expires) } : {}),
    ...(badge.description ? { description: badge.description.trim() } : {}),
    ...(skills.length ? { skills } : {}),
    credentialId: id,
  };
}

/** The visible lines of an HTML page (scripts and styles dropped). */
export function pageLines(html: string): string[] {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .split('\n')
    .map((l) => plainText(l).replace(/​/g, '').trim())
    .filter(Boolean);
}

const metaContent = (html: string, property: string) =>
  html.match(new RegExp(`<meta[^>]+(?:property|name)="${property}"[^>]+content="([^"]*)"`, 'i'))?.[1] ??
  html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${property}"`, 'i'))?.[1];
const after = (lines: string[], label: string) => {
  const i = lines.findIndex((l) => l.toLowerCase() === label.toLowerCase());
  return i >= 0 ? lines[i + 1] : undefined;
};

/** A pass from a Skilljar certificate page (verify.skilljar.com/c/…). Its image link expires, so it's copied. */
export function parseSkilljarPage(html: string, link: string): BadgePass | null {
  const lines = pageLines(html);
  const title = after(lines, 'Course Completed') ?? metaContent(html, 'og:title')?.replace(/^Certificate for\s+/i, '');
  if (!title) return null;
  const hours = after(lines, 'Hours earned');
  const image = metaContent(html, 'og:image');
  const id = new URL(link).pathname.split('/').pop() ?? link;
  return {
    id: `skilljar-${id}`,
    title: plainText(title),
    issuer: after(lines, 'Offered By') ?? 'Skilljar',
    ...(image ? { imageUrl: plainText(image) } : {}),
    verifyUrl: link,
    ...(isoDate(after(lines, 'Completion Date')) ? { earned: isoDate(after(lines, 'Completion Date')) } : {}),
    ...(hours ? { description: `Completed ${plainText(title)} (${hours.toLowerCase()}).` } : {}),
    credentialId: id,
  };
}

/** A pass from a Google Skillshop award page (skillshop.exceedlms.com/student/award/…). */
export function parseSkillshopPage(html: string, link: string): BadgePass | null {
  const lines = pageLines(html);
  const title = after(lines, 'Congratulations!');
  if (!title) return null;
  const i = lines.indexOf(title);
  const completed = lines.slice(i + 1, i + 4).find((l) => /^Completed by/i.test(l));
  const description = lines.slice(i + 1, i + 5).find((l) => /verifies|certif/i.test(l) && l !== completed);
  const completionId = lines.slice(i + 1, i + 8).find((l) => /^Completion ID:/i.test(l))?.replace(/^Completion ID:\s*/i, '');
  const id = new URL(link).pathname.split('/').pop() ?? link;
  return {
    id: `skillshop-${id}`,
    title,
    issuer: 'Google',
    verifyUrl: link,
    ...(isoDate(completed?.replace(/^.* on /i, '')) ? { earned: isoDate(completed?.replace(/^.* on /i, '')) } : {}),
    ...(description ? { description } : {}),
    ...(completionId ? { credentialId: completionId } : { credentialId: id }),
  };
}
