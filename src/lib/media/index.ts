import { dirname, join } from 'node:path';
import type { MediaItem, UploadFolder } from '../editor/backend';
import { blobMedia } from './blob';
import { diskMedia } from './disk';

export interface MediaStore {
  kind: 'blob' | 'disk';
  list(folder: UploadFolder): Promise<MediaItem[]>;
  remove(path: string): Promise<void>;
}

type Env = Record<string, string | undefined>;

/** Where local uploads go: MEDIA_DIR, or a "media" folder next to the PGlite database. Never in production. */
export function mediaDir(env: Env = process.env): string | null {
  if (env.NODE_ENV === 'production') return null;
  if (env.MEDIA_DIR) return env.MEDIA_DIR;
  return env.PGLITE_DIR ? join(dirname(env.PGLITE_DIR), 'media') : null;
}

/** Vercel Blob when its token is set; otherwise, outside production, a local folder. */
export function getMedia(env: Env = process.env): MediaStore | null {
  if (env.BLOB_READ_WRITE_TOKEN) return blobMedia();
  const dir = mediaDir(env);
  return dir ? diskMedia(dir) : null;
}
