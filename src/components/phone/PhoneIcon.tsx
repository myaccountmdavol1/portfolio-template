'use client';

import { AppIcon } from '@/components/AppIcon';
import { NotificationBubble } from '@/components/NotificationBubble';
import type { PortfolioApp } from '@/lib/types';
import type { OpenAppFn } from './HomeGrid';
import { selectedRing, useEditablePhoneItem } from './useEditablePhoneItem';

/** `slot` is "page:index", used by Edit-mode drag and drop. */
export function PhoneIcon({ app, ink, inkShadow, onOpen, slot }: { app: PortfolioApp; ink: string; inkShadow?: string; onOpen: OpenAppFn; slot: string }) {
  const edit = useEditablePhoneItem(app.id);
  return (
    <button
      type="button"
      aria-label={app.title}
      aria-pressed={edit ? edit.selected : undefined}
      data-phone-slot={slot}
      data-app-id={app.id}
      onClick={(e) => onOpen(app.id, e.currentTarget.getBoundingClientRect())}
      {...edit?.handlers}
      style={edit?.style}
      className={`flex min-w-0 cursor-pointer flex-col items-center gap-1.5 ${edit ? 'touch-none' : ''} ${edit?.selected ? selectedRing : ''}`}
    >
      <span className="relative">
        <AppIcon icon={app.icon} size={60} variant="tile" />
        <NotificationBubble app={app} size={60} />
      </span>
      <span className="max-w-full truncate text-[11px] font-medium" style={{ color: ink, textShadow: inkShadow }}>
        {app.title}
      </span>
    </button>
  );
}
