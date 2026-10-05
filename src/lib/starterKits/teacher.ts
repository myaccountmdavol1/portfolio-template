import type { SiteData } from '../types';
import { kitApp, kitSite, P } from './build';
import type { KitLook, StarterKit } from './types';

const ACCENT = '#2f6f4f';
const look: KitLook = { wallpaper: { kind: 'preset', preset: 'chalkboard' }, headingFont: 'patrick-hand', bodyFont: 'nunito', iconPack: 'pastel' };

function build(): SiteData {
  return {
    site: kitSite(look, ACCENT, {
      headline: { show: true, line1: 'welcome to my', line2: 'classroom.' },
      menuBar: {
        items: [
          { label: 'Contact', action: 'openApp:contact' },
          { label: 'Office hours', action: 'openApp:office-hours' },
        ],
      },
      seo: { title: 'Your Name \u2014 Classroom', description: 'Replace me with one line about you and your class.' },
    }),
    apps: [
      kitApp('about', 'about', 1, {
        content: {
          media: { kind: 'image', url: '/kits/teacher-headshot.svg' },
          roleTitle: 'Replace me with what you teach, e.g. \u201cGrade 5 teacher\u201d',
          bio: { blocks: [P('Replace me with your teaching philosophy: what you believe about learning, and what a day in your classroom feels like.')] },
          lists: [{ heading: 'In my classroom', items: ['Replace me with something your students love', 'Replace me with a routine that works', 'Replace me with what you\u2019re learning next'] }],
          contactLinks: [{ label: 'Email me', url: 'mailto:you@example.com' }],
        },
      }),
      kitApp('photos', 'classroom', 2, {
        title: 'Our classroom',
        content: {
          albums: [
            {
              name: 'Our classroom',
              photos: [
                { url: '/kits/teacher-classroom-1.svg', caption: 'Replace me with a photo of your classroom' },
                { url: '/kits/teacher-classroom-2.svg', caption: 'Replace me with a photo of student work' },
              ],
            },
            { name: 'Field trips', photos: [{ url: '/wallpapers/meadow.webp', caption: 'Replace me with a photo from a class trip' }] },
          ],
        },
      }),
      kitApp('wallet', 'badges', 3, {
        title: 'PD & Badges',
        content: {
          heading: 'Professional learning',
          message: 'Replace me with your certificates and badges \u2014 or import them all from Credly.',
          view: 'stack',
          passes: [
            {
              id: 'pass-1',
              title: 'Replace me with a certificate',
              issuer: 'Issuing organization',
              earned: '2026-01-15',
              description: 'Replace me with what this course or workshop covered.',
              skills: ['Classroom technology'],
            },
            {
              id: 'pass-2',
              title: 'Replace me with a badge',
              issuer: 'Issuing organization',
              earned: '2025-06-20',
              description: 'Replace me with what this badge recognizes.',
              skills: ['Literacy'],
            },
          ],
          cards: [],
        },
      }),
      kitApp('link', 'resources', 4, { title: 'Lesson resources (replace me)', icon: 'books', content: { url: 'https://example.com/', mode: 'open' } }),
      kitApp('calendar', 'office-hours', 5, {
        title: 'Office hours',
        content: { heading: 'Office hours', note: 'Replace me with when families can book a time, e.g. Tue & Thu, 3\u20134pm', bookingUrl: 'https://cal.com/', embed: true },
      }),
      kitApp('mail', 'contact', 6, {
        title: 'Contact',
        content: { to: '', subject: 'A question about class', intro: 'Replace me with a line for families, e.g. \u201cI reply within two school days.\u201d' },
      }),
      kitApp('note', 'this-week', 7, {
        title: 'This week',
        content: {
          title: 'This week:',
          items: [
            { text: 'Replace me with what the class is working on', done: false },
            { text: 'Replace me with a date to remember', done: false },
            { text: 'Replace me with something to bring', done: false },
          ],
        },
      }),
    ],
    layout: {
      desktop: {
        icons: [
          { appId: 'about', xPct: 2, yPct: 4 },
          { appId: 'classroom', xPct: 2, yPct: 20 },
          { appId: 'badges', xPct: 2, yPct: 36 },
          { appId: 'resources', xPct: 2, yPct: 52 },
          { appId: 'office-hours', xPct: 90, yPct: 4 },
          { appId: 'contact', xPct: 90, yPct: 20 },
        ],
        widgets: [{ appId: 'this-week', xPct: 70, yPct: 48 }],
        dock: [
          { kind: 'app', appId: 'about' },
          { kind: 'app', appId: 'classroom' },
          { kind: 'app', appId: 'badges' },
          { kind: 'app', appId: 'resources' },
          { kind: 'separator' },
          { kind: 'app', appId: 'office-hours' },
          { kind: 'app', appId: 'contact' },
          { kind: 'app', appId: 'this-week' },
        ],
      },
      phone: { overrides: null },
    },
  };
}

export const teacher: StarterKit = {
  id: 'teacher',
  name: 'Teacher',
  description: 'A class page: your classroom, PD badges, lesson resources and office hours.',
  look,
  preview: { accent: ACCENT, icons: ['photos', 'wallet', 'books', 'calendar'] },
  build,
};
