import type { NoteColor, PublicNote } from './notes';

export type SubmitResult = { ok: true; status: 'pending' | 'approved' } | { ok: false; error: string };

export async function submitNote(body: { appId: string; name: string; message: string; color: NoteColor; doodle?: string; stickers?: string[] }): Promise<SubmitResult> {
  try {
    const res = await fetch('/api/guestbook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => ({}))) as { status?: 'pending' | 'approved'; error?: string };
    if (!res.ok) return { ok: false, error: json.error ?? 'Couldn’t send your note. Try again?' };
    return { ok: true, status: json.status ?? 'pending' };
  } catch {
    return { ok: false, error: 'Couldn’t send your note. Check your connection and try again.' };
  }
}

export async function fetchNotes(appId: string): Promise<PublicNote[]> {
  const res = await fetch(`/api/guestbook?${new URLSearchParams({ appId })}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return ((await res.json()) as { notes?: PublicNote[] }).notes ?? [];
}
