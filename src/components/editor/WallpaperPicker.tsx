'use client';

import { useEditor } from './EditorContext';
import { Modal } from './Modal';
import { WallpaperChooser, type WallpaperChooserProps } from './WallpaperChooser';

/** Editor → Wallpaper: the chooser in a dialog, uploading through the editor's backend. */
export function WallpaperPicker({ current, onPick, onClose }: Omit<WallpaperChooserProps, 'upload'> & { onClose: () => void }) {
  const editor = useEditor();
  return (
    <Modal title="Wallpaper" onClose={onClose} width={560}>
      <WallpaperChooser current={current} onPick={onPick} upload={editor?.upload ?? null} />
    </Modal>
  );
}
