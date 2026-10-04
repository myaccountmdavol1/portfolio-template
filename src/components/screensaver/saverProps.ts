import type { SiteData } from '@/lib/types';

/** What every screen saver module gets. `reduced`: draw one still frame. `onCorner`: the bounce hit a corner exactly. */
export interface SaverProps<S> {
  data: SiteData;
  settings: S;
  reduced: boolean;
  onCorner: () => void;
}
