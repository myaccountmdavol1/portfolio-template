import { accredibleCredentialId, badgeLinkKind, parseAccredibleCredential, parseOpenBadge, parseSkilljarPage, parseSkillshopPage } from '@/lib/badges';
import type { BadgePass } from '@/lib/types';

const json = (status: number, body: unknown) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';

async function get(url: string, accept: string): Promise<Response | null> {
  return fetch(url, { headers: { Accept: accept, 'User-Agent': UA }, cache: 'no-store' }).catch(() => null);
}
async function getJson<T>(url: string): Promise<T | null> {
  const res = await get(url, 'application/json');
  return res?.ok ? ((await res.json().catch(() => null)) as T | null) : null;
}

/** Where an image link finally points (these sites serve badges through a redirect). */
async function finalImageUrl(url: string | undefined): Promise<string | undefined> {
  let current = url;
  for (let hop = 0; current && hop < 3; hop++) {
    const res = await fetch(current, { redirect: 'manual', cache: 'no-store' }).catch(() => null);
    const location = res?.headers.get('location');
    if (!location) break;
    const next = new URL(location, current).toString();
    if (!/^https:\/\//.test(next)) break;
    current = next;
  }
  return current;
}

type Result = { passes: BadgePass[]; copyImage?: boolean } | { error: string; status: number };

async function importLink(link: string): Promise<Result> {
  const kind = badgeLinkKind(link);
  if (kind === 'accredible') {
    const id = accredibleCredentialId(link);
    const body = await getJson<{ data?: { badge_image?: string } }>(`https://api.accredible.com/v1/credential-net/credentials/${id}`);
    if (!body) return { error: 'That credential wasn’t found — check the link.', status: 404 };
    // Accredible's badge image links carry a token that expires within days, so keep a copy instead.
    const pass = parseAccredibleCredential(body, await finalImageUrl(body.data?.badge_image));
    return pass ? { passes: [pass], copyImage: !!pass.imageUrl } : { error: 'That credential is private or was revoked, so it can’t be shown.', status: 403 };
  }
  if (kind === 'openbadge') {
    // Open Badges 2.0: the assertion links to its badge class, which links to the issuer.
    const assertion = await getJson<{ id?: string; badge?: string; image?: string | { id?: string } }>(link);
    if (!assertion?.badge) return { error: 'That badge wasn’t found — check the link.', status: 404 };
    const badge = await getJson<{ name?: string; issuer?: string }>(assertion.badge);
    const issuer = badge?.issuer ? await getJson<{ name?: string }>(badge.issuer) : null;
    const image = typeof assertion.image === 'string' ? assertion.image : assertion.image?.id;
    const pass = parseOpenBadge(assertion, badge, issuer, link, await finalImageUrl(image));
    return pass ? { passes: [pass] } : { error: 'That badge was revoked, so it can’t be shown.', status: 403 };
  }
  if (kind === 'skilljar' || kind === 'skillshop') {
    const res = await get(link, 'text/html');
    if (!res?.ok) return { error: 'Couldn’t open that certificate page — check the link.', status: 404 };
    const html = await res.text();
    const pass = kind === 'skilljar' ? parseSkilljarPage(html, link) : parseSkillshopPage(html, link);
    if (!pass) return { error: 'Couldn’t read that certificate page. Download it and drag it into Badges instead.', status: 422 };
    // Skilljar's certificate image link expires, so the editor copies it into your own storage.
    return { passes: [pass], copyImage: kind === 'skilljar' && !!pass.imageUrl };
  }
  if (kind === 'canva') return { error: 'Canva doesn’t let other sites read its certificates. Download yours (as an image or PDF) and drag it onto your Badges window.', status: 422 };
  return { error: 'That link isn’t one we can read yet. Download the badge or certificate and drag it onto your Badges window.', status: 400 };
}

/** The editor's “Import from a link”: one public badge or certificate as a Wallet pass. */
export async function GET(request: Request) {
  const link = new URL(request.url).searchParams.get('url') ?? '';
  if (!/^https:\/\//.test(link)) return json(400, { error: 'Paste the full link, starting with https://' });
  const result = await importLink(link);
  return 'error' in result ? json(result.status, { error: result.error }) : json(200, result);
}
