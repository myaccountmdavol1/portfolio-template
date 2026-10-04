'use client';

import { createContext, useContext } from 'react';

/** The site's icon pack (Site settings → Style); undefined = the build's default pack at /icons/catalog. */
export const IconPackContext = createContext<string | undefined>(undefined);

export function useIconPack(): string | undefined {
  return useContext(IconPackContext);
}
