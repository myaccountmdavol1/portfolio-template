import type { AppType, CatalogIconSlug, PortfolioApp } from '../types';

export const APP_TYPES: AppType[] = ['project', 'document', 'about', 'link', 'credentials', 'stats', 'note', 'clock', 'status', 'messages', 'guestbook', 'freeform', 'terminal', 'photos', 'maps', 'calendar', 'voicememos', 'gamecenter', 'mail', 'facetime', 'wallet', 'social', 'phone'];

export const APP_TYPE_LABELS: Record<AppType, string> = {
  project: 'Project',
  document: 'Document (PDF)',
  about: 'About me',
  link: 'Link or embed',
  credentials: 'Credentials',
  stats: 'Stats',
  note: 'Sticky note',
  clock: 'Clock & weather',
  status: 'Status (e.g. Open to work)',
  messages: 'Messages (Ask me anything)',
  guestbook: 'Stickies guestbook',
  freeform: 'Freeform (drawing)',
  terminal: 'Terminal',
  photos: 'Photos',
  maps: 'Maps (my journey)',
  calendar: 'Calendar (book a call)',
  voicememos: 'Voice Memos',
  gamecenter: 'Game Center (achievements)',
  mail: 'Mail (email me)',
  facetime: 'FaceTime (video hello)',
  wallet: 'Wallet (badges & microcredentials)',
  social: 'Social (all my profiles)',
  phone: 'Phone (call my office)',
};

const STARTER_TITLES: Record<AppType, string> = {
  project: 'New Project',
  document: 'Document.pdf',
  about: 'About Me',
  link: 'New Link',
  credentials: 'Credentials',
  stats: 'Stats',
  note: 'Note',
  clock: 'Clock',
  status: 'Status',
  messages: 'Messages',
  guestbook: 'Guestbook',
  freeform: 'Freeform',
  terminal: 'Terminal',
  photos: 'Photos',
  maps: 'Maps',
  calendar: 'Calendar',
  voicememos: 'Voice Memos',
  gamecenter: 'Game Center',
  mail: 'Mail',
  facetime: 'FaceTime',
  wallet: 'Wallet',
  social: 'Social',
  phone: 'Phone',
};

const STARTER_ICONS: Record<AppType, CatalogIconSlug> = {
  project: 'finder',
  document: 'preview',
  about: 'contacts',
  link: 'safari',
  credentials: 'passwords',
  stats: 'stocks',
  note: 'stickies',
  clock: 'clock',
  status: 'reminders',
  messages: 'messages',
  guestbook: 'stickies',
  freeform: 'freeform',
  terminal: 'terminal',
  photos: 'photos',
  maps: 'maps',
  calendar: 'calendar',
  voicememos: 'voice-memos',
  gamecenter: 'game-center',
  mail: 'mail',
  facetime: 'facetime',
  wallet: 'wallet',
  social: 'apps',
  phone: 'phone',
};

/** A unique id like "project-3": the type plus the lowest number not already taken. */
export function newAppId(type: AppType, existingIds: Iterable<string>): string {
  const taken = new Set(existingIds);
  for (let n = 1; ; n++) {
    const id = `${type}-${n}`;
    if (!taken.has(id)) return id;
  }
}

const P = (text: string) => ({ type: 'paragraph' as const, text });

/** A new app with friendly placeholder content, ready to be placed on the desktop. */
export function starterApp(type: AppType, id: string, order: number): PortfolioApp {
  const base = {
    id,
    title: STARTER_TITLES[type],
    icon: { kind: 'catalog' as const, slug: STARTER_ICONS[type] },
    visible: true,
    order,
  };
  switch (type) {
    case 'project':
      return {
        ...base,
        type,
        content: {
          coverUrl: '',
          tag: 'Category · Discipline',
          year: String(new Date().getFullYear()),
          role: 'Your role',
          body: { blocks: [P('What was the problem, what did you do, and what happened?')] },
          gallery: [],
          links: [],
        },
      };
    case 'document':
      return { ...base, type, content: { fileUrl: '', fileName: 'Document.pdf', showDownload: true } };
    case 'about':
      return {
        ...base,
        type,
        content: {
          media: { kind: 'image', url: '' },
          roleTitle: 'Your current role, in a sentence',
          bio: { blocks: [P('A few sentences about who you are and what you care about.')] },
          lists: [],
          quote: null,
          contactLinks: [],
        },
      };
    case 'link':
      return { ...base, type, content: { url: 'https://example.com/', mode: 'open' } };
    case 'credentials':
      return {
        ...base,
        type,
        content: {
          education: [],
          groups: [{ name: 'Certifications', color: 'linear-gradient(145deg,#4cd964,#248a3d)', items: [] }],
        },
      };
    case 'stats':
      return {
        ...base,
        type,
        content: {
          heading: 'Heading',
          subheading: '',
          steps: [],
          metrics: [{ label: 'Metric', value: '0' }],
          chart: null,
          showAsPhoneWidget: false,
        },
      };
    case 'note':
      return { ...base, type, content: { title: 'Note', items: [{ text: 'First item', done: false }] } };
    case 'clock':
      return {
        ...base,
        type,
        content: { city: 'New York', timeZone: 'America/New_York', latitude: 40.71, longitude: -74.01, showWeather: true, units: 'fahrenheit' },
      };
    case 'messages':
      return {
        ...base,
        type,
        content: {
          contactName: 'Me',
          greeting: 'Hi! Ask me anything about my work, experience, or what I’m looking for next.',
          persona: 'Friendly, upbeat, and brief.',
          suggestions: ['What do you do?', 'Tell me about a recent project', 'Are you open to new roles?', 'How can I reach you?'],
        },
      };
    case 'guestbook':
      return { ...base, type, content: { heading: 'Leave me a note!', prompt: 'Say hi, share a thought, or tell me how you found my site…', requireApproval: true } };
    case 'freeform':
      return { ...base, type, content: { prompt: 'Draw me something!', allowSend: true } };
    case 'terminal':
      return {
        ...base,
        type,
        content: {
          welcome: 'Last login: today on ttys000\nType “help” to see what you can do.',
          commands: [{ name: 'coffee', output: '☕ Brewing… done. Still hot, for once.' }],
        },
      };
    case 'photos':
      return { ...base, type, content: { albums: [{ name: 'Highlights', photos: [] }] } };
    case 'maps':
      return {
        ...base,
        type,
        content: {
          heading: 'My journey',
          places: [{ name: 'New York', detail: 'Where it all started', years: '2020', kind: 'home', latitude: 40.71, longitude: -74.01 }],
        },
      };
    case 'calendar':
      return {
        ...base,
        type,
        content: { heading: 'Let’s talk', note: '30-minute intro calls', bookingUrl: 'https://cal.com/', embed: true },
      };
    case 'voicememos':
      return { ...base, type, content: { memos: [] } };
    case 'gamecenter':
      return { ...base, type, content: { tagline: 'Explore my portfolio to unlock achievements!' } };
    case 'wallet':
      return {
        ...base,
        type,
        title: 'Badges',
        content: {
          heading: 'My badges',
          message: 'Microcredentials and certifications I’ve earned — tap a pass to see the details.',
          view: 'stack',
          passes: [
            {
              id: 'pass-example',
              title: 'Example Microcredential',
              issuer: 'Your Organization',
              earned: '2026-01-15',
              description: 'Replace this with your own badge — or import them all from Credly.',
              skills: ['Instructional Technology', 'Leadership'],
            },
          ],
          cards: [],
        },
      };
    case 'social':
      return {
        ...base,
        type,
        content: { heading: 'Find me online', links: [{ url: 'https://www.linkedin.com/', label: '' }, { url: 'https://www.instagram.com/', label: '' }] },
      };
    case 'phone':
      return { ...base, type, content: { label: 'Office', number: '+1 (555) 123-4567', hours: 'Mon–Fri, 9am–5pm', note: '', allowText: true } };
    case 'facetime':
      return { ...base, type, content: { videoUrl: '', subtitle: 'Tap to say hi' } };
    case 'mail':
      return { ...base, type, content: { to: '', subject: 'Hello from your portfolio', intro: 'Drop me a line — I read every message.' } };
    case 'status':
      return {
        ...base,
        type,
        content: { emoji: '👋', headline: 'Open to work', detail: 'Product design roles · Remote or on-site', color: '#34c759' },
      };
    default: {
      const unknown: never = type;
      throw new Error(`Unknown app type ${String(unknown)}`);
    }
  }
}
