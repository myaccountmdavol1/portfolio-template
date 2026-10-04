import { starterApp } from '../editor/starters';
import type { PhotosApp, SiteData, WalletApp } from '../types';

// A Wallet and a Photos app for deep-link tests. The seed site has neither, and adding them to the seed
// would change the sample site (and many tests), so unit tests and the deep-link e2e server add these instead.

export const fixtureWallet: WalletApp = {
  id: 'wallet-fx',
  type: 'wallet',
  title: 'Badges',
  icon: { kind: 'builtin', name: 'badge' },
  visible: true,
  order: 20,
  content: {
    heading: 'Badges',
    message: '',
    view: 'stack',
    cards: [],
    passes: [
      { id: 'pass-gce', title: 'Google Certified Educator', issuer: 'Google for Education', earned: '2025-05-01', description: 'Level 1' },
      { id: 'pass-alc', title: 'Apple Learning Coach', issuer: 'Apple', earned: '2024-03-01' },
    ],
  },
};

export const fixturePhotos: PhotosApp = {
  id: 'photos-fx',
  type: 'photos',
  title: 'Photos',
  icon: { kind: 'builtin', name: 'folder' },
  visible: true,
  order: 21,
  content: {
    albums: [
      { name: 'Empty', photos: [{ url: '', caption: 'No picture yet' }] },
      {
        name: 'Classroom',
        photos: [
          { url: '/icons/catalog/photos.png', caption: 'Robotics club' },
          { url: '/icons/catalog/maps.png', caption: '' },
        ],
      },
    ],
  },
};

/** The chat, so e2e tests can ask it things (with /api/chat mocked). */
export const fixtureMessages = starterApp('messages', 'messages-fx', 22);

/** The seed site plus the Wallet and Photos above, with desktop icons for both, and the screen saver's hot corner at bottom-right. */
export function withDeepLinkFixture(data: SiteData): SiteData {
  return {
    ...data,
    site: { ...data.site, screensaver: { ...data.site.screensaver, hotCorner: 'bottom-right' } },
    apps: [...data.apps, fixtureWallet, fixturePhotos, fixtureMessages],
    layout: {
      ...data.layout,
      desktop: {
        ...data.layout.desktop,
        icons: [...data.layout.desktop.icons, { appId: fixtureWallet.id, xPct: 90, yPct: 36 }, { appId: fixturePhotos.id, xPct: 90, yPct: 52 }, { appId: fixtureMessages.id, xPct: 90, yPct: 68 }],
      },
    },
  };
}
