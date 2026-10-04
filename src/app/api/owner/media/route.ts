import { json, ownerOnly } from '@/lib/auth/http';
import type { UploadFolder } from '@/lib/editor/backend';
import { getMedia } from '@/lib/media';
import { folderOfPath } from '@/lib/media/rules';

const FOLDERS: UploadFolder[] = ['images', 'docs', 'videos', 'audio'];
const noMedia = () => json(503, { error: 'File storage isn’t set up on this site.' });

export async function GET(request: Request) {
  const auth = await ownerOnly(request);
  if (auth instanceof Response) return auth;
  const media = getMedia();
  if (!media) return noMedia();
  const folder = new URL(request.url).searchParams.get('folder') as UploadFolder;
  if (!FOLDERS.includes(folder)) return json(400, { error: 'Unknown folder' });
  return json(200, { items: await media.list(folder) });
}

export async function DELETE(request: Request) {
  const auth = await ownerOnly(request);
  if (auth instanceof Response) return auth;
  const media = getMedia();
  if (!media) return noMedia();
  const path = new URL(request.url).searchParams.get('path') ?? '';
  if (!folderOfPath(path)) return json(400, { error: 'Bad file path' });
  await media.remove(path);
  return json(200, { ok: true });
}
