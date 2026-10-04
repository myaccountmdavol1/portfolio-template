import { credlyUsername, parseCredlyBadges } from '@/lib/badges';
import type { BadgePass } from '@/lib/types';

const json = (status: number, body: unknown) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/** The editor's “Import from Credly”: a public profile's badges as Wallet passes (the browser can't ask Credly directly). */
export async function GET(request: Request) {
  const user = credlyUsername(new URL(request.url).searchParams.get('profile') ?? '');
  if (!user) return json(400, { error: 'Paste your Credly profile link — it looks like credly.com/users/your-name.' });
  const passes: BadgePass[] = [];
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`https://www.credly.com/users/${encodeURIComponent(user)}/badges.json?page=${page}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (portfolio badge import)' },
      cache: 'no-store',
    }).catch(() => null);
    if (!res) return json(502, { error: 'Couldn’t reach Credly. Try again in a minute.' });
    if (res.status === 404) return json(404, { error: 'That Credly profile wasn’t found — check it’s public and the link is right.' });
    if (!res.ok) return json(502, { error: 'Credly didn’t answer. Try again in a minute.' });
    const body = (await res.json().catch(() => null)) as { metadata?: { total_pages?: number } } | null;
    passes.push(...parseCredlyBadges(body));
    if (!body?.metadata?.total_pages || page >= body.metadata.total_pages) break;
  }
  return json(200, { passes });
}
