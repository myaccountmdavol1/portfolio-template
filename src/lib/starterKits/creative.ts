import type { SiteData } from '../types';
import { kitApp, kitSite, P } from './build';
import type { KitLook, StarterKit } from './types';

const ACCENT = '#d9480f';
const look: KitLook = { wallpaper: { kind: 'preset', preset: 'coastline' }, headingFont: 'bricolage-grotesque', bodyFont: 'dm-sans', iconPack: 'outline' };

const work = (id: string) => ({ url: `/wallpapers/${id}.webp`, caption: 'Replace me with a piece of your work' });

function build(): SiteData {
  return {
    site: kitSite(look, ACCENT, {
      headline: { show: true, line1: 'come see my', line2: 'work.' },
      menuBar: {
        items: [
          { label: 'Contact', action: 'url:mailto:you@example.com' },
          { label: 'Gallery', action: 'openApp:gallery' },
        ],
      },
      seo: { title: 'Your Name \u2014 Portfolio', description: 'Replace me with one line about the work you make.' },
    }),
    apps: [
      kitApp('photos', 'gallery', 1, {
        title: 'Gallery',
        content: {
          albums: [
            { name: 'Selected work', photos: [work('mountain-lake'), work('coastline'), work('desert-dunes'), work('meadow'), work('night-sky')] },
            { name: 'In progress', photos: [{ url: '/kits/creative-project-2.svg', caption: 'Replace me with a sketch or work in progress' }] },
          ],
        },
      }),
      kitApp('about', 'about', 2, {
        content: {
          media: { kind: 'image', url: '/kits/creative-headshot.svg' },
          roleTitle: 'Replace me with what you make, e.g. \u201cIllustrator and designer\u201d',
          bio: { blocks: [P('Replace me with a few sentences about your work, your process and who you make it for.')] },
          lists: [{ heading: 'Available for', items: ['Replace me with a kind of project', 'Replace me with another', 'Replace me with one more'] }],
          contactLinks: [{ label: 'Email me', url: 'mailto:you@example.com' }],
        },
      }),
      kitApp('project', 'case-study-1', 3, {
        title: 'Case Study One',
        content: {
          coverUrl: '/kits/creative-project-1.svg',
          tag: 'Replace me \u00b7 e.g. Branding',
          role: 'Replace me with your role',
          body: {
            blocks: [
              P('Replace me with the brief: who it was for and what they needed.'),
              { type: 'heading', text: 'Process' },
              P('Replace me with how the idea took shape.'),
            ],
          },
          gallery: [
            { url: '/wallpapers/desert-dunes.webp', caption: 'Replace me with a process shot' },
            { url: '/wallpapers/night-sky.webp', caption: 'Replace me with the final piece' },
          ],
        },
      }),
      kitApp('project', 'case-study-2', 4, {
        title: 'Case Study Two',
        content: {
          coverUrl: '/kits/creative-project-2.svg',
          tag: 'Replace me \u00b7 e.g. Photography',
          role: 'Replace me with your role',
          body: { blocks: [P('Replace me with the story behind this piece.')] },
        },
      }),
      kitApp('link', 'playlist', 5, {
        title: 'Playlist',
        icon: 'spotify',
        content: { url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M', mode: 'embed' },
      }),
      kitApp('social', 'social', 6, {
        title: 'Find me online',
        content: {
          heading: 'Find me online',
          links: [
            { url: 'https://www.instagram.com/', label: '' },
            { url: 'https://www.behance.net/', label: '' },
            { url: 'https://dribbble.com/', label: '' },
          ],
        },
      }),
    ],
    layout: {
      desktop: {
        icons: [
          { appId: 'gallery', xPct: 2, yPct: 4 },
          { appId: 'case-study-1', xPct: 2, yPct: 20 },
          { appId: 'case-study-2', xPct: 2, yPct: 36 },
          { appId: 'about', xPct: 2, yPct: 52 },
          { appId: 'social', xPct: 90, yPct: 4 },
        ],
        widgets: [],
        dock: [
          { kind: 'app', appId: 'gallery' },
          { kind: 'app', appId: 'about' },
          { kind: 'app', appId: 'case-study-1' },
          { kind: 'app', appId: 'case-study-2' },
          { kind: 'separator' },
          { kind: 'app', appId: 'playlist' },
          { kind: 'app', appId: 'social' },
          { kind: 'separator' },
          { kind: 'url', url: 'mailto:you@example.com', label: 'Mail', iconUrl: '/icons/catalog/mail.png' },
        ],
      },
      phone: { overrides: null },
    },
  };
}

export const creative: StarterKit = {
  id: 'creative',
  name: 'Creative',
  description: 'Gallery first: your work, two case studies, a playlist and your profiles.',
  look,
  preview: { accent: ACCENT, icons: ['photos', 'finder', 'spotify', 'apps'] },
  build,
};
