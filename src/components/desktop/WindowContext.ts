'use client';

import { createContext, useContext } from 'react';

/** Lets an app shape the desktop window it's shown in (the phone has no windows, so this is null there). */
export interface WindowApi {
  /** Resize the window to show media of this size, plus `extraHeight` of the app's own bars. */
  fitMedia: (media: { width: number; height: number }, extraHeight: number) => void;
  /** Back to the size from before `fitMedia`. */
  unfit: () => void;
}

export const WindowContext = createContext<WindowApi | null>(null);

export function useAppWindow(): WindowApi | null {
  return useContext(WindowContext);
}
