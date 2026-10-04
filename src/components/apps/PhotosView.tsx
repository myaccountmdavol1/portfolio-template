'use client';

import { ChevronLeft, ChevronRight, ExternalLink, Play, Upload, X } from 'lucide-react';
import { useEffect, useState, type DragEvent } from 'react';
import { useFocusRequest, useReportItem } from '@/components/AppLinkContext';
import { useAppWindow } from '@/components/desktop/WindowContext';
import { useEditor } from '@/components/editor/EditorContext';
import { useAddPhotos } from '@/components/editor/useAddPhotos';
import { photoAlbums } from '@/lib/deepLink';
import type { PhotosApp } from '@/lib/types';

const SLIDE_MS = 3500;
// Heights of the viewer's top bar and caption bar, so the window can be sized around the photo.
const TOP_BAR_H = 46;
const CAPTION_BAR_H = 52;

/** Photos: albums in a grid, a lightbox with arrows, and a “Memories” slideshow. */
export function PhotosView({ app }: { app: PhotosApp }) {
  const albums = photoAlbums(app.content);
  const [albumIndex, setAlbumIndex] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const appWindow = useAppWindow();
  const shownAlbum = Math.min(albumIndex, Math.max(0, albums.length - 1));
  const album = albums[shownAlbum];
  const photos = album?.photos ?? [];

  // Edit mode: image files dropped on the window are added to the album on show (the first if none, "Album 1" if there are none at all).
  const editor = useEditor();
  const adding = useAddPhotos(app.id);
  const [dragging, setDragging] = useState(false);
  // photoAlbums() hides empty albums; each carries its place in the saved list.
  const savedIndex = album?.index ?? null;
  const dropProps = editor
    ? {
        onDragOver: (e: DragEvent) => {
          if (!Array.from(e.dataTransfer.items).some((i) => i.kind === 'file' && i.type.startsWith('image/'))) return;
          e.preventDefault();
          setDragging(true);
        },
        onDragLeave: (e: DragEvent) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        },
        onDrop: (e: DragEvent) => {
          e.preventDefault();
          setDragging(false);
          void adding.add(Array.from(e.dataTransfer.files), savedIndex);
        },
      }
    : {};
  const dropOverlay = editor && (dragging || adding.uploading) && (
    <div data-testid="photos-drop" className="pointer-events-none absolute inset-2 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#0a84ff] bg-[#0a84ff]/10 text-sm font-semibold text-[#0a84ff]">
      <Upload size={28} aria-hidden />
      {adding.uploading ? `Uploading ${Math.min(adding.uploading.done + 1, adding.uploading.total)} of ${adding.uploading.total}…` : `Drop photos to add them to ${album?.name ?? 'Album 1'}`}
    </div>
  );

  // A link to one photo opens it in the viewer; the open photo goes into the address bar.
  useFocusRequest((req) => {
    const [a, p] = (req.itemKey ?? '').split(':').map(Number);
    if (!albums[a]?.photos[p]) return;
    setAlbumIndex(a);
    setOpen(p);
    setPlaying(false);
  });
  // During Memories the photo changes every few seconds; the address bar shouldn't follow it.
  useReportItem(open !== null && album && !playing ? `${shownAlbum}:${open}` : null);

  useEffect(() => {
    if (!playing || open === null || photos.length < 2) return;
    const id = window.setTimeout(() => setOpen((i) => ((i ?? 0) + 1) % photos.length), SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [playing, open, photos.length]);

  if (!album) {
    return (
      <div className="relative min-h-[420px] bg-white p-10 text-center text-sm text-[#6e6e73]" {...dropProps}>
        {dropOverlay}
        <p className="m-0">No photos yet.</p>
        {editor && <p className="m-0 mt-2 text-xs">Tip: drop photos here to add them.</p>}
      </div>
    );
  }

  const step = (delta: number) => setOpen((i) => (i === null ? i : (i + delta + photos.length) % photos.length));
  const current = open !== null ? photos[open] : null;
  const close = () => {
    setOpen(null);
    setPlaying(false);
    appWindow?.unfit();
  };

  if (current) {
    const hasCaption = !!(current.caption || current.link);
    // Contained in a box with a real height, so the whole photo always shows (never cropped).
    // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded photo
    const img = (
      <img
        key={open}
        src={current.url}
        alt={current.caption}
        // On a desktop, the window grows or shrinks to suit each photo's shape.
        onLoad={(e) => {
          const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
          if (width && height) appWindow?.fitMedia({ width, height }, TOP_BAR_H + (hasCaption ? CAPTION_BAR_H : 0));
        }}
        className={`absolute inset-0 h-full w-full object-contain ${playing ? 'memories-zoom' : ''}`}
      />
    );
    return (
      <div
        role="dialog"
        aria-label={current.caption || 'Photo'}
        // keep-colors: the viewer stays black in Dark Mode instead of being inverted to white.
        className="keep-colors flex h-full min-h-[420px] flex-col bg-black text-white"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1);
          if (e.key === 'ArrowLeft') step(-1);
          if (e.key === 'Escape') {
            e.stopPropagation();
            close();
          }
        }}
      >
        <div className="flex flex-none items-center justify-between p-2" style={{ height: TOP_BAR_H }}>
          <span className="px-2 text-xs text-white/70 tabular-nums">
            {(open ?? 0) + 1} / {photos.length}
            {playing && ' · Memories'}
          </span>
          <button type="button" aria-label="Close photo" autoFocus onClick={close} className="cursor-pointer rounded-full p-1.5 hover:bg-white/15">
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {current.link ? (
            <a href={current.link} target="_blank" rel="noopener noreferrer" aria-label={`Open ${current.caption || 'link'}`} className="absolute inset-0 cursor-pointer">
              {img}
            </a>
          ) : (
            img
          )}
          {photos.length > 1 && (
            <>
              <button type="button" aria-label="Previous photo" onClick={() => step(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-white/15 p-2 hover:bg-white/25">
                <ChevronLeft size={20} aria-hidden />
              </button>
              <button type="button" aria-label="Next photo" onClick={() => step(1)} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-white/15 p-2 hover:bg-white/25">
                <ChevronRight size={20} aria-hidden />
              </button>
            </>
          )}
        </div>
        {hasCaption && (
          <div className="flex flex-none items-center justify-center gap-3 px-3 text-center text-sm text-white/85" style={{ height: CAPTION_BAR_H }}>
            {current.caption && <span className="min-w-0 truncate">{current.caption}</span>}
            {current.link && (
              <a href={current.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-black hover:bg-white/90">
                Visit <ExternalLink size={12} aria-hidden />
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[max(420px,100%)] flex-col bg-white text-[#1d1d1f]" {...dropProps}>
      {dropOverlay}
      {editor && adding.failed.length > 0 && !adding.uploading && (
        <p role="alert" className="m-0 bg-[#fdecea] px-4 py-2 text-xs text-[#b3261e]">
          {adding.failed.length} couldn’t upload —{' '}
          <button type="button" onClick={() => void adding.retry()} className="cursor-pointer underline">
            Retry
          </button>
        </p>
      )}
      <div className="flex flex-none items-center gap-2 border-b border-black/10 px-4 py-2.5">
        <div role="tablist" aria-label="Albums" className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {albums.map((a, i) => (
            <button
              key={a.name + i}
              type="button"
              role="tab"
              aria-selected={a === album}
              onClick={() => setAlbumIndex(i)}
              className="flex-none cursor-pointer rounded-full px-3 py-1 text-[13px] font-medium aria-selected:bg-[#1d1d1f] aria-selected:text-white"
            >
              {a.name}
            </button>
          ))}
        </div>
        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setOpen(0);
              setPlaying(true);
            }}
            className="flex flex-none cursor-pointer items-center gap-1.5 rounded-full bg-[#0a84ff] px-3 py-1 text-[13px] font-semibold text-white"
          >
            <Play size={13} aria-hidden /> Memories
          </button>
        )}
      </div>

      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1 p-1">
        {photos.map((p, i) => (
          <li key={p.url + i}>
            <button type="button" aria-label={p.caption || `Photo ${i + 1}`} onClick={() => setOpen(i)} className="block aspect-square w-full cursor-zoom-in overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- owner-uploaded photos from any host */}
              <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform hover:scale-105" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
