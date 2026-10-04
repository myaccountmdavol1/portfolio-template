'use client';

import { X } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { useDialogFocus } from '@/hooks/useDialogFocus';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

export function Modal({ title, onClose, children, width = 560 }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref);
  return (
    <div
      className="fixed inset-0 z-[9800] flex items-center justify-center bg-black/30 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
        className="flex max-h-[min(640px,calc(100dvh-32px))] w-full flex-col overflow-hidden rounded-xl bg-[#fbfaf7] text-[#1d1c1a] shadow-[0_30px_70px_rgba(0,0,0,.3)] outline-none"
        style={{ maxWidth: width }}
      >
        <div className="flex flex-none items-center justify-between border-b border-black/10 px-4 py-3">
          <h2 className="m-0 text-sm font-semibold">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="cursor-pointer rounded-full p-1 hover:bg-black/5">
            <X size={16} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export const modalButton =
  'inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-black/15 bg-white px-3 text-xs font-medium hover:bg-black/5 disabled:cursor-default disabled:opacity-50';
