import { seedSiteData } from '../seed';
import type { StarterKit } from './types';

/** The kit that is the sample site itself: the default on a first run, and the fallback. */
export const CLASSIC_ID = 'classic';

/** Today's sample site, unchanged: projects, a resume, credentials and a to-do note. Also the fallback. */
export const classic: StarterKit = {
  id: CLASSIC_ID,
  name: 'Classic',
  description: 'Keep the sample site: projects, a resume, credentials and a to-do note.',
  // The sample's own look: no style picked, so the build's default icon pack.
  look: { wallpaper: { kind: 'preset', preset: 'sky' }, headingFont: 'instrument-serif', bodyFont: 'geist' },
  preview: { accent: '#6f9bd1', icons: ['finder', 'preview', 'contacts', 'passwords'] },
  build: () => structuredClone(seedSiteData),
};
