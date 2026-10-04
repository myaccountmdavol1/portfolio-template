import { createHash } from 'node:crypto';
import { takeChatQuota } from '@/lib/chat/limits';
import { parseContact } from '@/lib/contact';
import { getPublishedSite } from '@/lib/getSiteData';
import { getStore } from '@/lib/store';

// The Mail app's Send: stores the message in the owner's inbox (read in the editor). Works for every
// visitor, unlike mailto: links, which need a desktop email app to be set up.

const LIMITS = { perVisitorPerHour: 5, perSitePerDay: 100 };
const json = (status: number, body: unknown) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  const store = getStore();
  if (!store) return json(503, { error: 'Sending isn’t set up on this site yet — use one of the email links below.', code: 'unconfigured' });
  const parsed = parseContact(await request.json().catch(() => null));
  if (!parsed.ok) return json(400, { error: parsed.error });

  const data = await getPublishedSite();
  const app = data.apps.find((a) => a.id === parsed.message.appId && a.visible);
  if (app?.type !== 'mail') return json(404, { error: 'This mailbox starts working once the site is published.' });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const visitor = createHash('sha256').update(`portfolio-contact:${ip}`).digest('hex').slice(0, 24);
  const quota = await takeChatQuota(store.counters, visitor, LIMITS, new Date(), 'contact').catch(() => ({ ok: false as const }));
  if (!quota.ok) return json(429, { error: 'You’ve sent a few already — try again a bit later, or use an email link below.', code: 'rate_limited' });

  const id = await store.inbox.add(parsed.message);
  return json(201, { id });
}
