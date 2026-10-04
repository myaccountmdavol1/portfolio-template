import { del, list } from '@vercel/blob';
import type { UploadFolder } from '../editor/backend';
import type { MediaStore } from './index';

/** Vercel Blob (BLOB_READ_WRITE_TOKEN). Uploads go straight from the browser; see /api/owner/upload. */
export function blobMedia(): MediaStore {
  return {
    kind: 'blob',
    async list(folder: UploadFolder) {
      const { blobs } = await list({ prefix: `${folder}/`, limit: 1000 });
      return blobs
        .map((b) => ({
          path: b.pathname,
          folder,
          name: b.pathname.slice(folder.length + 1).replace(/^\d+-/, ''),
          url: b.url,
          size: b.size,
          updated: new Date(b.uploadedAt).toISOString(),
        }))
        .sort((a, b) => b.updated.localeCompare(a.updated));
    },
    async remove(path) {
      await del(path);
    },
  };
}
