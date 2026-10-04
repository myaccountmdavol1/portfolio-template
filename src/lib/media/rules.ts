import type { UploadFolder } from '../editor/backend';

/** The same limits as storage.rules.template (Firebase), applied to Vercel Blob and local uploads. */
export const UPLOAD_RULES: Record<UploadFolder, { types: string[]; maxBytes: number }> = {
  images: { types: ['image/*'], maxBytes: 10 * 1024 * 1024 },
  docs: { types: ['application/pdf'], maxBytes: 20 * 1024 * 1024 },
  videos: { types: ['video/*'], maxBytes: 100 * 1024 * 1024 },
  audio: { types: ['audio/*'], maxBytes: 25 * 1024 * 1024 },
};

/** The folder of a storagePath() path ("images/1759200000000-photo.png"), or null for anything else. */
export function folderOfPath(path: string): UploadFolder | null {
  const match = /^(images|docs|videos|audio)\/\d+-[a-z0-9.-]+$/.exec(path);
  return match ? (match[1] as UploadFolder) : null;
}

export function typeAllowed(folder: UploadFolder, contentType: string): boolean {
  return UPLOAD_RULES[folder].types.some((t) => (t.endsWith('/*') ? contentType.startsWith(t.slice(0, -1)) : contentType === t));
}

export function checkUpload(path: string, contentType: string, size: number): string | null {
  const folder = folderOfPath(path);
  if (!folder) return 'Bad file path';
  if (!typeAllowed(folder, contentType)) return 'That file type can’t go in this folder';
  if (size > UPLOAD_RULES[folder].maxBytes) return `That file is too big (the limit is ${UPLOAD_RULES[folder].maxBytes / 1024 / 1024} MB)`;
  return null;
}
