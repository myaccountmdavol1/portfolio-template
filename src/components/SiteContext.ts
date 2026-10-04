'use client';

import { createContext, useContext } from 'react';
import type { SiteData } from '@/lib/types';
import type { LinkTarget } from '@/lib/deepLink';

/** The site being shown and how to open an app — for apps that reach outside their own window (Terminal). */
export interface SiteApi {
  data: SiteData;
  openApp: (appId: string) => void;
  /**
   * Open an app and show one item in it (a pass, a photo). `itemMissing` shows a "couldn't find" note.
   * `silent` (the guided tour): no achievement step and the notification bubble stays.
   */
  openTarget: (target: LinkTarget & { itemMissing?: boolean; silent?: boolean }) => void;
  /** Which layout the app is shown in (the phone preview on a desktop screen is still 'phone'). */
  variant: 'desktop' | 'phone';
}

export const SiteContext = createContext<SiteApi | null>(null);

export function useSite(): SiteApi | null {
  return useContext(SiteContext);
}
