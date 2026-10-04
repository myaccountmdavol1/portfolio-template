'use client';

import { useRef, useState } from 'react';
import type { EditorBackend, UploadFolder } from '@/lib/editor/backend';
import { runQueue } from '@/lib/editor/uploadQueue';
import { useEditor } from './EditorContext';

const CONCURRENCY = 3;

export interface BatchUpload {
  /** Progress while files are going up; null when idle. */
  uploading: { done: number; total: number } | null;
  /** Files that didn't upload, kept so Retry can send just those. */
  failed: File[];
  /** Uploads every file (three at a time). Resolves to the URLs in input order, skipping failures. */
  uploadAll: (files: File[]) => Promise<string[]>;
  retryFailed: () => Promise<string[]>;
}

/**
 * Upload many files at once with progress and a per-file failure list. `prepare` (e.g. shrink a photo) runs before each upload.
 * Uploads through the editor unless `upload` is passed.
 */
export function useBatchUpload(folder: UploadFolder, { prepare, upload }: { prepare?: (file: File) => Promise<File>; upload?: EditorBackend['upload'] } = {}): BatchUpload {
  const editor = useEditor();
  const send = upload ?? editor?.upload;
  const [uploading, setUploading] = useState<BatchUpload['uploading']>(null);
  const [failed, setFailed] = useState<File[]>([]);
  const busy = useRef(false);

  async function uploadAll(files: File[]): Promise<string[]> {
    if (!send || files.length === 0 || busy.current) return [];
    busy.current = true;
    setFailed([]);
    setUploading({ done: 0, total: files.length });
    try {
      const { results, failed: bad } = await runQueue(
        files,
        async (file) => send(prepare ? await prepare(file) : file, folder),
        CONCURRENCY,
        (done) => setUploading({ done, total: files.length }),
      );
      setFailed(bad);
      return results.filter((url): url is string => typeof url === 'string');
    } finally {
      busy.current = false;
      setUploading(null);
    }
  }

  return { uploading, failed, uploadAll, retryFailed: () => uploadAll(failed) };
}
