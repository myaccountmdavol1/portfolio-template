import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { json, ownerOnly } from '@/lib/auth/http';
import { getMedia, mediaDir } from '@/lib/media';
import { diskMedia } from '@/lib/media/disk';
import { checkUpload, folderOfPath, UPLOAD_RULES } from '@/lib/media/rules';

// Vercel Blob: the browser asks here for a one-time token, then uploads straight to Blob (no 4.5 MB function limit).
// Local dev / e2e: the file itself is posted here and saved on disk.

export async function POST(request: Request) {
  const auth = await ownerOnly(request);
  if (auth instanceof Response) return auth;
  const media = getMedia();
  if (!media) return json(503, { error: 'File storage isn’t set up on this site.' });

  if (media.kind === 'blob') {
    const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
    if (!body) return json(400, { error: 'Bad upload request' });
    try {
      const result = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname) => {
          const folder = folderOfPath(pathname);
          if (!folder) throw new Error('Bad file path');
          return { allowedContentTypes: UPLOAD_RULES[folder].types, maximumSizeInBytes: UPLOAD_RULES[folder].maxBytes, addRandomSuffix: false };
        },
      });
      return json(200, result);
    } catch (err) {
      return json(400, { error: err instanceof Error ? err.message : 'Upload refused' });
    }
  }

  const form = await request.formData().catch(() => null);
  const path = String(form?.get('path') ?? '');
  const file = form?.get('file');
  if (!(file instanceof File)) return json(400, { error: 'No file' });
  const problem = checkUpload(path, file.type, file.size);
  if (problem) return json(400, { error: problem });
  const url = await diskMedia(mediaDir()!).save(path, new Uint8Array(await file.arrayBuffer()));
  return json(200, { url });
}
