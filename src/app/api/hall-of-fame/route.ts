import { createHash } from 'node:crypto';
import { takeChatQuota } from '@/lib/chat/limits';
import { getPublishedSite } from '@/lib/getSiteData';
import { parseHallSubmission } from '@/lib/hallOfFame/entries';
import { getStore } from '@/lib/store';

const LIMITS = { perVisitorPerHour: 3, perSitePerDay: 100 };

const json = (status: number, body: unknown) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/** The site's Game Center, if it's visible and the Hall of Fame is switched on. */
async function hallIsOpen(): Promise<boolean> {
  const { apps } = await getPublishedSite();
  const gc = apps.find((a) => a.type === 'gamecenter' && a.visible);
  return gc?.type === 'gamecenter' && gc.content.hallOfFame !== false;
}

function visitorKey(request: Request): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return createHash('sha256').update(`portfolio-hall:${ip}`).digest('hex').slice(0, 24);
}

/** Approved names, for everyone. */
export async function GET() {
  const store = getStore();
  if (!store || !(await hallIsOpen())) return json(200, { entries: [] });
  return json(200, { entries: await store.hallOfFame.listApproved() });
}

/** A Platinum visitor signs. Every name waits for the owner's approval. */
export async function POST(request: Request) {
  const store = getStore();
  if (!store) return json(503, { error: 'The Hall of Fame isn’t set up on this site yet.' });
  if (!(await hallIsOpen())) return json(404, { error: 'The Hall of Fame is closed.' });
  const parsed = parseHallSubmission(await request.json().catch(() => null));
  if (!parsed.ok) return json(400, { error: parsed.error });
  const quota = await takeChatQuota(store.counters, visitorKey(request), LIMITS, new Date(), 'hallOfFame').catch(() => ({ ok: false as const }));
  if (!quota.ok) return json(429, { error: 'You’ve already signed! Try again a bit later.' });
  const id = await store.hallOfFame.add(parsed.entry);
  return json(201, { id, status: 'pending' });
}
