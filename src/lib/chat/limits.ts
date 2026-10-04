/** Counts requests in a named window and returns the new total. Firestore in production, memory otherwise. */
export interface CounterStore {
  /** `now` is the request's time, so windows (and cleanup) never depend on a second clock. */
  increment(key: string, expiresAt: Date, now: Date): Promise<number>;
}

export interface ChatLimits {
  perVisitorPerHour: number;
  perSitePerDay: number;
}

export function chatLimitsFromEnv(env: Record<string, string | undefined> = process.env): ChatLimits {
  const num = (v: string | undefined, fallback: number) => (v && Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);
  return { perVisitorPerHour: num(env.CHAT_LIMIT_PER_VISITOR_HOURLY, 15), perSitePerDay: num(env.CHAT_LIMIT_PER_DAY, 100) };
}

export type LimitResult = { ok: true } | { ok: false; reason: 'visitor' | 'site' };

/**
 * Checks and counts one message. The site-wide daily cap bounds the worst-case bill; the per-visitor
 * hourly cap stops one person from using it all up.
 */
export async function takeChatQuota(
  store: CounterStore,
  visitorKey: string,
  limits: ChatLimits,
  now = new Date(),
  /** Keeps each feature's counters separate (chat, guestbook…). */
  namespace = 'chat',
): Promise<LimitResult> {
  const hour = now.toISOString().slice(0, 13); // 2026-09-29T18
  const day = now.toISOString().slice(0, 10); // 2026-09-29
  const hourEnds = new Date(`${hour}:00:00.000Z`);
  hourEnds.setUTCHours(hourEnds.getUTCHours() + 1);
  const dayEnds = new Date(`${day}T00:00:00.000Z`);
  dayEnds.setUTCDate(dayEnds.getUTCDate() + 1);

  const visitorCount = await store.increment(`${namespace === 'chat' ? '' : `${namespace}_`}visitor_${visitorKey}_${hour}`, hourEnds, now);
  if (visitorCount > limits.perVisitorPerHour) return { ok: false, reason: 'visitor' };
  const siteCount = await store.increment(`${namespace === 'chat' ? '' : `${namespace}_`}site_${day}`, dayEnds, now);
  if (siteCount > limits.perSitePerDay) return { ok: false, reason: 'site' };
  return { ok: true };
}

export function memoryCounterStore(): CounterStore {
  const counts = new Map<string, { n: number; expiresAt: number }>();
  return {
    async increment(key, expiresAt, now) {
      for (const [k, v] of counts) if (v.expiresAt <= now.getTime()) counts.delete(k);
      const next = (counts.get(key)?.n ?? 0) + 1;
      counts.set(key, { n: next, expiresAt: expiresAt.getTime() });
      return next;
    },
  };
}
