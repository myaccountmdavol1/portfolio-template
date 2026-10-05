import type { SiteData } from '../types';
import { kitApp, kitSite, P } from './build';
import type { KitLook, StarterKit } from './types';

const ACCENT = '#1e3a5f';
const look: KitLook = { wallpaper: { kind: 'preset', preset: 'midnight' }, headingFont: 'fraunces', bodyFont: 'inter', iconPack: 'mono-light' };

function build(): SiteData {
  return {
    site: kitSite(look, ACCENT, {
      headline: { show: true, line1: 'hello, and welcome to my', line2: 'portfolio.' },
      menuBar: {
        items: [
          { label: 'Contact', action: 'openApp:contact' },
          { label: 'Resume', action: 'openApp:resume' },
        ],
      },
      seo: { title: 'Your Name \u2014 Portfolio', description: 'Replace me with one line about the work you do and who you do it for.' },
    }),
    apps: [
      kitApp('about', 'about', 1, {
        content: {
          media: { kind: 'image', url: '/kits/professional-headshot.svg' },
          roleTitle: 'Replace me with your title and organization',
          bio: { blocks: [P('Replace me with a few sentences about your experience, what you\u2019re best at and the work you want more of.')] },
          lists: [{ heading: 'What I do', items: ['Replace me with a strength', 'Replace me with another strength', 'Replace me with a result you\u2019re proud of'] }],
          contactLinks: [
            { label: 'Email me', url: 'mailto:you@example.com' },
            { label: 'LinkedIn', url: 'https://www.linkedin.com/' },
          ],
        },
      }),
      kitApp('document', 'resume', 2, { title: 'Resume.pdf', content: { fileName: 'Replace me - Resume.pdf' } }),
      kitApp('credentials', 'credentials', 3, {
        content: {
          education: [{ abbr: 'B.A.', step: 'Undergraduate', title: 'Replace me with your degree', school: 'University name', year: '2020', inProgress: false, progress: 100 }],
          groups: [
            {
              name: 'Certifications',
              color: 'linear-gradient(145deg,#64748b,#334155)',
              items: [{ short: 'C1', name: 'Replace me with a certification', issuer: 'Issuing organization', year: '2025', desc: 'Replace me with what this credential covers.' }],
            },
          ],
        },
      }),
      kitApp('project', 'case-study-1', 4, {
        title: 'Case Study One',
        content: {
          coverUrl: '/kits/professional-project-1.svg',
          tag: 'Replace me \u00b7 e.g. Operations',
          role: 'Replace me with your role',
          body: {
            blocks: [
              P('Replace me with the situation: the goal, and what stood in the way.'),
              { type: 'heading', text: 'What I did' },
              P('Replace me with your approach and the decisions you made.'),
              { type: 'heading', text: 'Results' },
              P('Replace me with the outcome, in numbers if you can.'),
            ],
          },
        },
      }),
      kitApp('project', 'case-study-2', 5, {
        title: 'Case Study Two',
        content: {
          coverUrl: '/kits/professional-project-2.svg',
          tag: 'Replace me \u00b7 e.g. Strategy',
          role: 'Replace me with your role',
          body: { blocks: [P('Replace me with the problem, what you did and how it turned out.')] },
        },
      }),
      kitApp('mail', 'contact', 6, {
        title: 'Contact',
        content: { to: '', subject: 'Hello', intro: 'Replace me with how you like to be contacted, e.g. \u201cI reply within a day.\u201d' },
      }),
      kitApp('calendar', 'book', 7, {
        title: 'Book a call',
        content: { heading: 'Let\u2019s talk', note: 'Replace me with what a call is for, e.g. 30-minute intro calls', bookingUrl: 'https://cal.com/', embed: true },
      }),
    ],
    layout: {
      desktop: {
        icons: [
          { appId: 'about', xPct: 2, yPct: 4 },
          { appId: 'resume', xPct: 2, yPct: 20 },
          { appId: 'case-study-1', xPct: 2, yPct: 36 },
          { appId: 'case-study-2', xPct: 2, yPct: 52 },
          { appId: 'credentials', xPct: 90, yPct: 4 },
          { appId: 'book', xPct: 90, yPct: 20 },
        ],
        widgets: [],
        dock: [
          { kind: 'app', appId: 'about' },
          { kind: 'app', appId: 'resume' },
          { kind: 'app', appId: 'credentials' },
          { kind: 'separator' },
          { kind: 'app', appId: 'case-study-1' },
          { kind: 'app', appId: 'case-study-2' },
          { kind: 'separator' },
          { kind: 'app', appId: 'contact' },
          { kind: 'app', appId: 'book' },
        ],
      },
      phone: { overrides: null },
    },
  };
}

export const professional: StarterKit = {
  id: 'professional',
  name: 'Professional',
  description: 'A calm, credible page: resume, credentials, case studies and a way to book a call.',
  look,
  preview: { accent: ACCENT, icons: ['preview', 'passwords', 'mail', 'calendar'] },
  build,
};
