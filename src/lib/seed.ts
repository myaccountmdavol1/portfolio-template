import type { SiteData } from './types';

const P = (text: string) => ({ type: 'paragraph' as const, text });

/** Placeholder content that exercises every app type. Replaced by real content via the editor (Plans 3–4). */
export const seedSiteData: SiteData = {
  site: {
    ownerName: 'Your Name',
    email: 'you@example.com',
    socialLinks: [{ label: 'LinkedIn', url: 'https://www.linkedin.com/' }],
    headline: { show: true, line1: 'welcome to my', line2: 'portfolio.' },
    wallpaper: { kind: 'preset', preset: 'sky' },
    accent: '#6f9bd1',
    clock24: false,
    menuBar: {
      items: [
        { label: 'Contact', action: 'url:mailto:you@example.com' },
        { label: 'Resume', action: 'openApp:resume' },
      ],
    },
    incomingCall: { enabled: true, delaySec: 4, callerName: 'Your Name', answerAction: 'openApp:about' },
    seo: { title: 'Your Name — Portfolio', description: 'A quick look around my desktop.' },
    updatedAt: '2026-09-28T00:00:00.000Z',
  },
  apps: [
    {
      id: 'p1',
      type: 'project',
      title: 'Project One',
      icon: { kind: 'catalog', slug: 'finder' },
      visible: true,
      order: 1,
      content: {
        coverUrl: '',
        tag: 'Mobile app · UX research',
        year: '2026',
        role: 'Lead designer',
        body: {
          blocks: [
            P('A short description of the problem, what you did, and the outcome.'),
            { type: 'heading', text: 'What I learned' },
            P('Two or three sentences is plenty — the case study link carries the rest.'),
          ],
        },
        gallery: [],
        links: [{ label: 'Open case study', url: 'https://www.figma.com/' }],
      },
    },
    {
      id: 'p2',
      type: 'project',
      title: 'Project Two',
      icon: { kind: 'catalog', slug: 'finder' },
      visible: true,
      order: 2,
      content: {
        coverUrl: '',
        tag: 'Web · Product design',
        year: '2025',
        role: 'Product designer',
        body: { blocks: [P('A short description of the problem, what you did, and the outcome.')] },
        gallery: [],
        links: [],
      },
    },
    {
      id: 'resume',
      type: 'document',
      title: 'Resume.pdf',
      icon: { kind: 'catalog', slug: 'preview' },
      visible: true,
      order: 3,
      content: { fileUrl: '', fileName: 'Resume.pdf', showDownload: true },
    },
    {
      id: 'about',
      type: 'about',
      title: 'About Me',
      icon: { kind: 'catalog', slug: 'contacts' },
      visible: true,
      order: 4,
      content: {
        media: { kind: 'image', url: '' },
        roleTitle: 'Your current role, in a sentence',
        bio: { blocks: [P('A few sentences about who you are, what you do, and what you care about.')] },
        lists: [{ heading: 'What drives me', items: ['Solving real problems', 'Learning something new every week', 'Working with great people'] }],
        quote: { text: 'Alone we can do so little; together we can do so much.', author: 'Helen Keller' },
        contactLinks: [
          { label: 'Email me', url: 'mailto:you@example.com' },
          { label: 'LinkedIn', url: 'https://www.linkedin.com/' },
        ],
      },
    },
    {
      id: 'playlist',
      type: 'link',
      title: 'Playlist',
      icon: { kind: 'catalog', slug: 'spotify' },
      visible: true,
      order: 5,
      content: { url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M', mode: 'embed' },
    },
    {
      id: 'credentials',
      type: 'credentials',
      title: 'Credentials',
      icon: { kind: 'catalog', slug: 'passwords' },
      visible: true,
      order: 6,
      content: {
        education: [
          { abbr: 'B.S.', step: 'Step 1 · Undergraduate', title: 'Bachelor of Science', school: 'University name', year: '2022', inProgress: false, progress: 100 },
          { abbr: 'M.S.', step: 'Step 2 · Graduate', title: 'Master of Science', school: 'University name', year: 'Expected 2027', inProgress: true, progress: 60 },
        ],
        groups: [
          {
            name: 'Certifications',
            color: 'linear-gradient(145deg,#4cd964,#248a3d)',
            items: [
              { short: 'C1', name: 'Certification name', issuer: 'Issuing organization', year: '2025', desc: 'What this credential covers.', verifyUrl: 'https://example.com/' },
              { short: 'C2', name: 'Another certification', issuer: 'Issuing organization', year: '2024', desc: 'What this credential covers.' },
            ],
          },
          {
            name: 'Digital Badges',
            color: 'linear-gradient(145deg,#ffb340,#ff7a00)',
            items: [{ short: 'B1', name: 'Badge name', issuer: 'Issuing organization', year: '2025', desc: 'What this badge recognizes.' }],
          },
        ],
      },
    },
    {
      id: 'stats',
      type: 'stats',
      title: 'My Path',
      icon: { kind: 'catalog', slug: 'stocks' },
      visible: true,
      order: 7,
      content: {
        heading: 'How I work',
        subheading: 'Every project follows the same route',
        steps: [
          { name: 'Listen', desc: 'Understand the goal and the people involved.' },
          { name: 'Plan', desc: 'Agree on what success looks like.' },
          { name: 'Build', desc: 'Make it, test it, improve it.' },
          { name: 'Reflect', desc: 'Look at what worked and what to change.' },
        ],
        metrics: [
          { label: 'People reached', value: '170' },
          { label: 'Returning partners', value: '52' },
        ],
        chart: {
          title: 'People reached per year',
          bars: [
            { label: '2024', value: 95 },
            { label: '2025', value: 118 },
            { label: '2026', value: 48 },
          ],
        },
        showAsPhoneWidget: true,
      },
    },
    {
      id: 'todo',
      type: 'note',
      title: 'To do',
      icon: { kind: 'catalog', slug: 'stickies' },
      visible: true,
      order: 8,
      content: {
        title: 'To do:',
        items: [
          { text: 'Finish my portfolio', done: true },
          { text: 'Help someone try something new', done: false },
          { text: 'Create something worth sharing', done: false },
          { text: 'Drink my coffee while it’s hot', done: false },
        ],
      },
    },
  ],
  layout: {
    desktop: {
      icons: [
        { appId: 'p1', xPct: 2, yPct: 4 },
        { appId: 'p2', xPct: 2, yPct: 20 },
        { appId: 'resume', xPct: 2, yPct: 36 },
        { appId: 'about', xPct: 2, yPct: 52 },
        { appId: 'credentials', xPct: 90, yPct: 4 },
        { appId: 'stats', xPct: 90, yPct: 20 },
      ],
      widgets: [{ appId: 'todo', xPct: 70, yPct: 48 }],
      dock: [
        { kind: 'app', appId: 'about' },
        { kind: 'app', appId: 'credentials' },
        { kind: 'app', appId: 'playlist' },
        { kind: 'app', appId: 'resume' },
        { kind: 'separator' },
        { kind: 'app', appId: 'stats' },
        { kind: 'app', appId: 'todo' },
        { kind: 'separator' },
        { kind: 'url', url: 'mailto:you@example.com', label: 'Mail', iconUrl: '/icons/catalog/mail.png' },
        { kind: 'url', url: 'https://cal.com/', label: 'Book a call', iconUrl: '/icons/catalog/calendar.png' },
        { kind: 'url', url: 'https://www.instagram.com/', label: 'Instagram', iconUrl: '/icons/catalog/photos.png' },
        { kind: 'url', url: 'https://www.linkedin.com/', label: 'LinkedIn', iconUrl: '/icons/catalog/safari.png' },
      ],
    },
    phone: { overrides: null },
  },
};
