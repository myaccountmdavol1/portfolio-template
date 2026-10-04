import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { MediaItem, UploadFolder } from '../editor/backend';
import type { MediaStore } from './index';
import { folderOfPath } from './rules';

type DiskMedia = MediaStore & { save(path: string, bytes: Uint8Array): Promise<string>; read(path: string): Promise<Uint8Array | null> };

/** Local development and e2e only: files in a folder on this machine, served by /api/dev-media. */
export function diskMedia(dir: string): DiskMedia {
  const fileFor = (path: string) => {
    if (!folderOfPath(path)) throw new Error('Bad file path');
    return join(dir, path);
  };
  return {
    kind: 'disk',
    async list(folder: UploadFolder) {
      const names = await readdir(join(dir, folder)).catch(() => [] as string[]);
      const items: MediaItem[] = [];
      for (const name of names) {
        const path = `${folder}/${name}`;
        if (!folderOfPath(path)) continue;
        const info = await stat(join(dir, path));
        items.push({ path, folder, name: name.replace(/^\d+-/, ''), url: `/api/dev-media/${path}`, size: info.size, updated: info.mtime.toISOString() });
      }
      return items.sort((a, b) => (b.updated ?? '').localeCompare(a.updated ?? ''));
    },
    async remove(path) {
      await rm(fileFor(path), { force: true });
    },
    async save(path, bytes) {
      const file = fileFor(path);
      await mkdir(join(dir, path.split('/')[0]), { recursive: true });
      await writeFile(file, bytes);
      return `/api/dev-media/${path}`;
    },
    async read(path) {
      try {
        return new Uint8Array(await readFile(fileFor(path)));
      } catch {
        return null;
      }
    },
  };
}
