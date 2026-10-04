'use client';

import { AppIcon } from '@/components/AppIcon';
import { NotificationBubble } from '@/components/NotificationBubble';
import type { PortfolioApp } from '@/lib/types';
import type { OpenAppFn } from './HomeGrid';
import { selectedRing, useEditablePhoneItem } from './useEditablePhoneItem';

interface PhoneDockProps {
  appIds: string[];
  appsById: Map<string, PortfolioApp>;
  onOpen: OpenAppFn;
}

export function PhoneDock({ appIds, appsById, onOpen }: PhoneDockProps) {
  if (appIds.length === 0) return null;
  return (
    <nav
      aria-label="Dock"
      data-phone-dock
      className="dock-glass mx-3 flex flex-none justify-around rounded-[30px] bg-white/30 px-3 py-3 backdrop-blur-xl"
      style={{ marginBottom: 'max(10px, env(safe-area-inset-bottom))' }}
    >
      {appIds.map((id, i) => {
        const app = appsById.get(id);
        if (!app) return null;
        return <PhoneDockItem key={id} app={app} index={i} onOpen={onOpen} />;
      })}
    </nav>
  );
}

function PhoneDockItem({ app, index, onOpen }: { app: PortfolioApp; index: number; onOpen: OpenAppFn }) {
  const edit = useEditablePhoneItem(app.id);
  return (
    <button
      type="button"
      aria-label={app.title}
      aria-pressed={edit ? edit.selected : undefined}
      data-phone-dock-index={index}
      data-app-id={app.id}
      onClick={(e) => onOpen(app.id, e.currentTarget.getBoundingClientRect())}
      {...edit?.handlers}
      style={edit?.style}
      className={`cursor-pointer ${edit ? 'touch-none' : ''} ${edit?.selected ? selectedRing : ''}`}
    >
      <span className="relative block">
        <AppIcon icon={app.icon} size={60} variant="tile" />
        <NotificationBubble app={app} size={60} />
      </span>
    </button>
  );
}
