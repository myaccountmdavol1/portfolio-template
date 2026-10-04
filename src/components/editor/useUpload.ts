'use client';

import { useState } from 'react';
import type { UploadFolder } from '@/lib/editor/backend';
import { useEditor } from './EditorContext';

export type UploadState = 'idle' | 'uploading' | 'error';

/** Upload with a per-file error state and a Retry that re-sends the same file. `prepare` (e.g. shrink a photo) runs first. */
export function useUpload(folder: UploadFolder, onDone: (url: string, file: File) => void, prepare?: (file: File) => Promise<File>) {
  const editor = useEditor();
  const [state, setState] = useState<UploadState>('idle');
  const [lastFile, setLastFile] = useState<File | null>(null);

  async function upload(file: File) {
    if (!editor) return;
    setLastFile(file);
    setState('uploading');
    try {
      const url = await editor.upload(prepare ? await prepare(file) : file, folder);
      setState('idle');
      onDone(url, file);
    } catch (err) {
      console.error('Upload failed', err);
      setState('error');
    }
  }

  return { state, upload, retry: () => lastFile && void upload(lastFile) };
}
