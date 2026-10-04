import type { SiteData } from '@/lib/types';

/** A module's editor form. `structural` (add/remove/reorder, switches) makes its own undo step. */
export interface SaverFormProps<S> {
  data: SiteData;
  settings: S;
  onChange: (next: S, structural?: boolean) => void;
}
