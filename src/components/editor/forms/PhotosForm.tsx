'use client';

import type { PhotosApp, PhotosContent } from '@/lib/types';

type Photo = PhotosContent['albums'][number]['photos'][number];
import { useState, type ReactNode } from 'react';
import { prepareImage } from '@/lib/editor/imageResize';
import { ListEditor, Section, smallButton, TextField, UploadField } from '../fields';
import { useAddPhotos } from '../useAddPhotos';
import { useContentEditor } from './useContentEditor';

/** One album's batch upload: an "Add photos…" button, and a drop zone over the whole album section. */
function AlbumDrop({ appId, index, children }: { appId: string; index: number; children: ReactNode }) {
  const photos = useAddPhotos(appId);
  const [over, setOver] = useState(false);
  const hasImages = (e: React.DragEvent) => Array.from(e.dataTransfer.items).some((i) => i.kind === 'file' && i.type.startsWith('image/'));
  return (
    <div
      data-testid="album-drop"
      className={`flex flex-col gap-2 rounded-md ${over ? 'outline-2 outline-dashed outline-[#0a84ff] bg-[#0a84ff]/5' : ''}`}
      onDragOver={(e) => {
        if (!hasImages(e)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void photos.add(Array.from(e.dataTransfer.files), index);
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className={smallButton}>
          {photos.uploading ? `Uploading ${Math.min(photos.uploading.done + 1, photos.uploading.total)} of ${photos.uploading.total}…` : 'Add photos…'}
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={!!photos.uploading}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = '';
              void photos.add(files, index);
            }}
          />
        </label>
        <span className="text-[11px] text-[#6b675f]">or drop photos here</span>
      </div>
      {photos.failed.length > 0 && !photos.uploading && (
        <p role="alert" className="m-0 text-xs text-[#b3261e]">
          {photos.failed.length} couldn’t upload —{' '}
          <button type="button" onClick={() => void photos.retry()} className="cursor-pointer underline">
            Retry
          </button>
        </p>
      )}
      {children}
    </div>
  );
}

export function PhotosForm({ app }: { app: PhotosApp }) {
  const { set } = useContentEditor(app);
  return (
    <Section title="Albums">
      <ListEditor
        label="Albums"
        items={app.content.albums}
        onChange={(items, s) => set('albums', items, s)}
        create={() => ({ name: 'New album', photos: [] })}
        itemTitle={(a) => `${a.name} (${a.photos.length})`}
        addLabel="Add album"
        render={(album, update, albumIndex) => (
          <AlbumDrop appId={app.id} index={albumIndex}>
            <TextField label="Album name" value={album.name} onChange={(name) => update({ ...album, name })} />
            <ListEditor<Photo>
              label="Photos"
              items={album.photos}
              onChange={(photos) => update({ ...album, photos })}
              create={() => ({ url: '', caption: '' })}
              itemTitle={(p, i) => p.caption || `Photo ${i + 1}`}
              addLabel="Add photo"
              render={(photo, updatePhoto) => (
                <>
                  <UploadField label="Photo" value={photo.url} prepare={prepareImage} onChange={(url) => updatePhoto({ ...photo, url })} />
                  <TextField label="Caption" value={photo.caption} onChange={(caption) => updatePhoto({ ...photo, caption })} />
                  <TextField
                    label="Link (optional)"
                    type="url"
                    value={photo.link ?? ''}
                    placeholder="https://…"
                    onChange={(link) => updatePhoto({ ...photo, link: link || undefined })}
                    hint={!photo.link && /^https?:\/\//.test(photo.caption) ? 'Tip: your caption looks like a link — paste it here to make the photo clickable.' : 'Makes the photo clickable, with a “Visit” button.'}
                  />
                </>
              )}
            />
          </AlbumDrop>
        )}
      />
    </Section>
  );
}
