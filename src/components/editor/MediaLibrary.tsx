'use client';

import { Copy, FileText, Music, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { EditorBackend, MediaItem, UploadFolder } from '@/lib/editor/backend';
import { prepareImage } from '@/lib/editor/imageResize';
import { Modal, modalButton } from './Modal';
import { useBatchUpload } from './useBatchUpload';

const FOLDERS: [UploadFolder, string][] = [
  ['images', 'Images'],
  ['videos', 'Videos'],
  ['audio', 'Audio'],
  ['docs', 'Documents'],
];

const ACCEPT: Record<UploadFolder, string> = {
  images: 'image/*',
  videos: 'video/*',
  audio: 'audio/*',
  docs: 'application/pdf,.pdf,.doc,.docx,.txt',
};

interface MediaLibraryProps {
  media: EditorBackend['media'];
  /** Adds files to the library. Omit it and the library has no Upload button. */
  upload?: EditorBackend['upload'];
  /** Only this folder (when choosing a file for a field); otherwise every folder, as tabs. */
  folder?: UploadFolder;
  /** Choosing a file for a field; without it, the library is for browsing and tidying up. */
  onPick?: (url: string) => void;
  /** True if a URL is used by the draft or the live site (so deleting it would break something). */
  inUse: (url: string) => boolean;
  onClose: () => void;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Everything you've uploaded: reuse a file, copy its link, or delete what you no longer need. */
export function MediaLibrary({ media, upload, folder, onPick, inUse, onClose }: MediaLibraryProps) {
  const [tab, setTab] = useState<UploadFolder>(folder ?? 'images');
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const batch = useBatchUpload(tab, { prepare: tab === 'images' ? prepareImage : undefined, upload });

  useEffect(() => {
    let cancelled = false;
    media.list(tab).then(
      (list) => {
        if (cancelled) return;
        setItems(list);
        setFailed(false);
      },
      (err: unknown) => {
        console.error('Could not load the media library', err);
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [media, tab, reload]);

  async function uploadFiles(files: File[]) {
    await batch.uploadAll(files);
    setReload((n) => n + 1);
  }

  async function remove(item: MediaItem) {
    const warning = inUse(item.url) ? '\n\nIt’s still used on your site — that spot will show nothing until you pick something else.' : '';
    if (!window.confirm(`Delete “${item.name}”? This can’t be undone.${warning}`)) return;
    await media.remove(item.path);
    setReload((n) => n + 1);
  }

  async function copy(item: MediaItem) {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(item.path);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard blocked
    }
  }

  return (
    <Modal title={onPick ? 'Choose from your library' : 'Media library'} onClose={onClose} width={720}>
      {!folder && (
        <div role="tablist" aria-label="Folders" className="mb-3 flex gap-1">
          {FOLDERS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                setItems(null);
                setTab(id);
              }}
              className="cursor-pointer rounded-full px-3 py-1 text-xs font-medium aria-selected:bg-[#1d1c1a] aria-selected:text-white"
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {upload && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className={`${modalButton} h-8 cursor-pointer gap-1.5 px-3 has-[:disabled]:opacity-60`}>
            <Upload size={13} aria-hidden />
            {batch.uploading ? `Uploading ${Math.min(batch.uploading.done + 1, batch.uploading.total)} of ${batch.uploading.total}…` : 'Upload…'}
            <input
              type="file"
              multiple
              accept={ACCEPT[tab]}
              className="sr-only"
              disabled={!!batch.uploading}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = '';
                void uploadFiles(files);
              }}
            />
          </label>
          {batch.failed.length > 0 && !batch.uploading && (
            <span role="alert" className="text-xs text-[#b3261e]">
              {batch.failed.length} couldn’t upload —{' '}
              <button type="button" onClick={() => void batch.retryFailed().then(() => setReload((n) => n + 1))} className="cursor-pointer underline">
                Retry
              </button>
            </span>
          )}
        </div>
      )}
      {failed && (
        <p role="alert" className="m-0 text-xs text-[#b3261e]">
          Couldn’t load your files. Check your connection and try again.
        </p>
      )}
      {!failed && items === null && <p className="m-0 text-xs text-[#6b675f]">Loading…</p>}
      {items?.length === 0 && <p className="m-0 text-xs text-[#6b675f]">Nothing here yet — files you upload show up here to reuse.</p>}
      {items && items.length > 0 && (
        <ul aria-label="Files" className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-3">
          {items.map((item) => {
            const used = inUse(item.url);
            return (
              <li key={item.path} className="flex flex-col overflow-hidden rounded-lg border border-black/10 bg-white">
                <button
                  type="button"
                  aria-label={onPick ? `Use ${item.name}` : item.name}
                  disabled={!onPick}
                  onClick={() => onPick?.(item.url)}
                  className="flex aspect-[4/3] items-center justify-center bg-[#f1efea] enabled:cursor-pointer enabled:hover:opacity-90"
                >
                  {item.folder === 'images' ? (
                    // eslint-disable-next-line @next/next/no-img-element -- owner uploads from Firebase Storage
                    <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : item.folder === 'videos' ? (
                    <video src={item.url} muted playsInline preload="metadata" className="h-full w-full bg-black object-contain" />
                  ) : item.folder === 'audio' ? (
                    <Music size={28} aria-hidden className="text-[#6b675f]" />
                  ) : (
                    <FileText size={28} aria-hidden className="text-[#6b675f]" />
                  )}
                </button>
                <div className="flex flex-col gap-1 p-2">
                  <span className="truncate text-xs font-medium" title={item.name}>
                    {item.name}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-[#6b675f]">
                    {formatSize(item.size)}
                    {used && <span className="rounded bg-[#30d158]/20 px-1 font-semibold text-[#1f7a36]">In use</span>}
                  </span>
                  <span className="flex gap-1">
                    {onPick ? (
                      <button type="button" onClick={() => onPick(item.url)} className={`${modalButton} h-7 flex-1 px-2`}>
                        Use this
                      </button>
                    ) : (
                      <button type="button" aria-label={`Copy link to ${item.name}`} onClick={() => void copy(item)} className={`${modalButton} h-7 flex-1 gap-1 px-2`}>
                        <Copy size={12} aria-hidden /> {copied === item.path ? 'Copied' : 'Copy link'}
                      </button>
                    )}
                    <button type="button" aria-label={`Delete ${item.name}`} onClick={() => void remove(item)} className={`${modalButton} h-7 px-2 text-[#c0362c]`}>
                      <Trash2 size={12} aria-hidden />
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
