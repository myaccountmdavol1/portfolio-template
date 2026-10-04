import { json, ownerOnly } from '@/lib/auth/http';

export async function GET(request: Request) {
  const auth = await ownerOnly(request);
  if (auth instanceof Response) return auth;
  return json(200, { versions: await auth.store.editor.versions() });
}
