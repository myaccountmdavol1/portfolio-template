import { isSiteData, json, ownerOnly } from '@/lib/auth/http';

export async function GET(request: Request) {
  const auth = await ownerOnly(request);
  if (auth instanceof Response) return auth;
  return json(200, { draft: await auth.store.site.read('draft') });
}

/** Autosave. `prev` is the last saved value, so only what changed is written. */
export async function PUT(request: Request) {
  const auth = await ownerOnly(request);
  if (auth instanceof Response) return auth;
  const body = (await request.json().catch(() => null)) as { next?: unknown; prev?: unknown } | null;
  if (!isSiteData(body?.next) || !(body.prev === null || isSiteData(body.prev))) return json(400, { error: 'Invalid draft' });
  await auth.store.editor.writeDraft(body.next, body.prev);
  return json(200, { ok: true });
}
