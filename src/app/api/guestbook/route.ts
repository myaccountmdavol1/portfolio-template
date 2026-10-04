import { createHash } from 'node:crypto';
import { takeChatQuota } from '@/lib/chat/limits';
import { getPublishedSite } from '@/lib/getSiteData';
import { allowedStickers, keepAllowedStickers, parseNoteSubmission } from '@/lib/guestbook/notes';
import { getStore } from '@/lib/store';

const LIMITS = { perVisitorPerHour: 5, perSitePerDay: 200 };

const json = (status: number, body: unknown) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

/** The guestbook a note goes to. Freeform drawings are sent to the site's first guestbook. */
async function findGuestbook(appId: string) {
  const data = await getPublishedSite();
  const app = data.apps.find((a) => a.id === appId && a.visible);
  if (app?.type === 'guestbook') return app;
  if (app?.type === 'freeform' && app.content.allowSend) {
    return data.apps.find((a): a is Extract<typeof a, { type: 'guestbook' }> => a.type === 'guestbook' && a.visible) ?? null;
  }
  return null;
}

function visitorKey(request: Request): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return createHash('sha256').update(`portfolio-guestbook:${ip}`).digest('hex').slice(0, 24);
}

/** Approved notes, for everyone. */
export async function GET(request: Request) {
  const store = getStore();
  if (!store) return json(200, { notes: [] });
  const appId = new URL(request.url).searchParams.get('appId') ?? '';
  const app = await findGuestbook(appId);
  if (!app) return json(404, { error: 'This guestbook isn’t available.' });
  return json(200, { notes: await store.guestbook.listApproved(app.id) });
}

/** A visitor leaves a note. It waits for the owner's approval unless they've turned approval off. */
export async function POST(request: Request) {
  const store = getStore();
  if (!store) return json(503, { error: 'The guestbook isn’t set up on this site yet.', code: 'unconfigured' });
  const parsed = parseNoteSubmission(await request.json().catch(() => null));
  if (!parsed.ok) return json(400, { error: parsed.error });
  const app = await findGuestbook(parsed.note.appId);
  if (!app) return json(404, { error: 'This guestbook starts working once the site is published.' });

  const quota = await takeChatQuota(store.counters, visitorKey(request), LIMITS, new Date(), 'guestbook').catch(() => ({ ok: false as const }));
  if (!quota.ok) return json(429, { error: 'That’s a lot of notes! Try again a bit later.', code: 'rate_limited' });

  const status = app.content.requireApproval ? 'pending' : 'approved';
  const note = keepAllowedStickers({ ...parsed.note, appId: app.id }, allowedStickers(app.content));
  const id = await store.guestbook.add(note, status);
  return json(201, { id, status });
}
