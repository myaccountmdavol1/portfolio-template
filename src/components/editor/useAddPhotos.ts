'use client';

import { useRef } from 'react';
import { prepareImage } from '@/lib/editor/imageResize';
import { addPhotosToAlbum, snapshotAlbum, type AlbumTarget } from '@/lib/editor/mutations';
import { useEditor } from './EditorContext';
import { useBatchUpload } from './useBatchUpload';

/**
 * Upload several photos (shrunk first) and add them to a Photos app's album in one edit, so one Undo removes
 * them all. The album is chosen when the files are, then found again in the latest draft when the uploads
 * finish (it may have moved or been renamed meanwhile), so edits made during the upload survive.
 * `albumIndex` null = the first album (made, if there are none).
 */
export function useAddPhotos(appId: string) {
  const editor = useEditor();
  const batch = useBatchUpload('images', { prepare: prepareImage });
  // The failed batch's own target, so Retry puts its photos where that batch was headed.
  const retryTarget = useRef<AlbumTarget | null>(null);

  function append(urls: string[], target: AlbumTarget | null) {
    if (urls.length > 0) editor?.apply((d) => addPhotosToAlbum(d, appId, target, urls));
  }

  return {
    uploading: batch.uploading,
    failed: batch.failed,
    add: async (files: File[], albumIndex: number | null) => {
      const images = files.filter((f) => f.type.startsWith('image/'));
      if (images.length === 0 || batch.uploading) return; // one batch at a time; a drop meanwhile must not change this batch's album
      const target = editor ? snapshotAlbum(editor.data, appId, albumIndex) : null;
      retryTarget.current = target;
      append(await batch.uploadAll(images), target);
    },
    retry: async () => {
      const target = retryTarget.current;
      append(await batch.retryFailed(), target);
    },
  };
}
