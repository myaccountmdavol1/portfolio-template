import { json, ownerOnly } from '@/lib/auth/http';
import { markSetupDone } from '@/lib/auth/owner';

/** Called by the setup wizard after it has published: setup is finished. */
export async function POST(request: Request) {
  const auth = await ownerOnly(request);
  if (auth instanceof Response) return auth;
  await markSetupDone(auth.store);
  return json(200, { ok: true });
}
