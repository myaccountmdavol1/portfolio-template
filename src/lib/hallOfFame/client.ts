import type { HallSubmission, PublicHallEntry } from './entries';

export type SignResult = { ok: true } | { ok: false; error: string };

export async function signHallOfFame(entry: HallSubmission): Promise<SignResult> {
  try {
    const res = await fetch('/api/hall-of-fame', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    return res.ok ? { ok: true } : { ok: false, error: json.error ?? 'Couldn’t sign the Hall of Fame. Try again?' };
  } catch {
    return { ok: false, error: 'Couldn’t sign the Hall of Fame. Check your connection and try again.' };
  }
}

export async function fetchHallOfFame(): Promise<PublicHallEntry[]> {
  try {
    const res = await fetch('/api/hall-of-fame', { cache: 'no-store' });
    if (!res.ok) return [];
    return ((await res.json()) as { entries?: PublicHallEntry[] }).entries ?? [];
  } catch {
    return [];
  }
}
