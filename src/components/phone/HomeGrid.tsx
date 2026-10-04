import type { Rect } from '@/lib/geometry';
import type { ReactNode } from 'react';
import { LINK_SLOT_PREFIX } from '@/lib/phoneLayout';
import type { DockEntry, PhoneSlot, PortfolioApp } from '@/lib/types';
import { PhoneIcon } from './PhoneIcon';
import { PhoneLinkIcon } from './PhoneLinkIcon';
import { PhoneWidget } from './PhoneWidget';

export type OpenAppFn = (appId: string, origin: Rect | null) => void;

interface HomeGridProps {
  page: number;
  slots: PhoneSlot[];
  appsById: Map<string, PortfolioApp>;
  ink: string;
  inkShadow?: string;
  onOpen: OpenAppFn;
  /** The desktop dock, to draw link shortcuts ("link:<index>" slots). */
  dockEntries: DockEntry[];
  /** Drawn behind the icons, like text on the wallpaper (page 1 only). */
  backdrop?: ReactNode;
}

/** One swipeable page of the home screen. */
export function HomeGrid({ page, slots, appsById, dockEntries, ink, inkShadow, onOpen, backdrop }: HomeGridProps) {
  return (
    <div className="phone-page" data-phone-page={page}>
      {backdrop}
      <div className="phone-grid relative z-[1]">
        {slots.map((slot, i) => {
          if (slot.appId.startsWith(LINK_SLOT_PREFIX)) {
            const dockIndex = Number(slot.appId.slice(LINK_SLOT_PREFIX.length));
            const entry = dockEntries[dockIndex];
            return entry?.kind === 'url' ? <PhoneLinkIcon key={slot.appId} entry={entry} dockIndex={dockIndex} ink={ink} inkShadow={inkShadow} /> : null;
          }
          const app = appsById.get(slot.appId);
          if (!app) return null;
          return slot.size !== '1x1' ? (
            <PhoneWidget key={app.id} app={app} onOpen={onOpen} slot={`${page}:${i}`} size={slot.size} />
          ) : (
            <PhoneIcon key={app.id} app={app} ink={ink} inkShadow={inkShadow} onOpen={onOpen} slot={`${page}:${i}`} />
          );
        })}
      </div>
    </div>
  );
}
