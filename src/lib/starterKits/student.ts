import type { SiteData } from '../types';
import { kitApp, kitSite, P } from './build';
import type { KitLook, StarterKit } from './types';

const ACCENT = '#7c3aed';
const look: KitLook = { wallpaper: { kind: 'preset', preset: 'sunrise' }, headingFont: 'space-grotesk', bodyFont: 'inter', iconPack: 'glass' };

function build(): SiteData {
  return {
    site: kitSite(look, ACCENT, {
      headline: { show: true, line1: 'hi, welcome to my', line2: 'portfolio.' },
      menuBar: {
        items: [
          { label: 'Contact', action: 'url:mailto:you@example.com' },
          { label: 'Resume', action: 'openApp:resume' },
        ],
      },
      seo: { title: 'Your Name \u2014 Portfolio', description: 'Replace me with one line about what you study and what you\u2019re looking for.' },
    }),
    apps: [
      kitApp('about', 'about', 1, {
        content: {
          media: { kind: 'image', url: '/kits/student-headshot.svg' },
          roleTitle: 'Replace me with your school, subject and year',
          bio: { blocks: [P('Replace me with a few sentences about who you are, what you study and what you want to do next.')] },
          lists: [{ heading: 'What I\u2019m into', items: ['Replace me with a subject you love', 'Replace me with a skill you\u2019re building', 'Replace me with something you do for fun'] }],
          contactLinks: [{ label: 'Email me', url: 'mailto:you@example.com' }],
        },
      }),
      kitApp('project', 'project-1', 2, {
        title: 'Project One',
        content: {
          coverUrl: '/kits/student-project-1.svg',
          tag: 'Class project \u00b7 Replace me',
          role: 'Replace me with your role, e.g. \u201cTeam lead\u201d',
          body: {
            blocks: [
              P('Replace me with the question or problem you worked on.'),
              { type: 'heading', text: 'What I did' },
              P('Replace me with the steps you took and what you made.'),
              { type: 'heading', text: 'What I learned' },
              P('Replace me with one or two things you would do differently next time.'),
            ],
          },
        },
      }),
      kitApp('project', 'project-2', 3, {
        title: 'Project Two',
        content: {
          coverUrl: '/kits/student-project-2.svg',
          tag: 'Independent project \u00b7 Replace me',
          role: 'Replace me with your role',
          body: { blocks: [P('Replace me with what the project was, what you did, and how it turned out.')] },
        },
      }),
      kitApp('document', 'resume', 4, { title: 'Resume.pdf', content: { fileName: 'Replace me - Resume.pdf' } }),
      kitApp('note', 'clubs', 5, {
        title: 'Clubs & activities',
        content: {
          title: 'Clubs & activities:',
          items: [
            { text: 'Replace me with a club you\u2019re part of', done: false },
            { text: 'Replace me with a team or volunteer role', done: false },
            { text: 'Replace me with something you\u2019re learning on your own', done: false },
          ],
        },
      }),
      kitApp('wallet', 'achievements', 6, {
        title: 'Achievements',
        icon: 'game-center',
        content: {
          heading: 'Achievements',
          message: 'Replace me with awards, certificates and badges you\u2019ve earned.',
          view: 'shelf',
          passes: [
            { id: 'pass-1', title: 'Replace me with an award', issuer: 'Your school', earned: '2026-05-01', description: 'Replace me with what it was for.' },
            { id: 'pass-2', title: 'Replace me with a certificate', issuer: 'Issuing organization', earned: '2025-12-10', description: 'Replace me with what you learned.', skills: ['Replace me with a skill'] },
          ],
          cards: [],
        },
      }),
    ],
    layout: {
      desktop: {
        icons: [
          { appId: 'about', xPct: 2, yPct: 4 },
          { appId: 'project-1', xPct: 2, yPct: 20 },
          { appId: 'project-2', xPct: 2, yPct: 36 },
          { appId: 'resume', xPct: 2, yPct: 52 },
          { appId: 'achievements', xPct: 90, yPct: 4 },
        ],
        widgets: [{ appId: 'clubs', xPct: 70, yPct: 48 }],
        dock: [
          { kind: 'app', appId: 'about' },
          { kind: 'app', appId: 'project-1' },
          { kind: 'app', appId: 'project-2' },
          { kind: 'app', appId: 'resume' },
          { kind: 'separator' },
          { kind: 'app', appId: 'achievements' },
          { kind: 'app', appId: 'clubs' },
          { kind: 'separator' },
          { kind: 'url', url: 'mailto:you@example.com', label: 'Mail', iconUrl: '/icons/catalog/mail.png' },
        ],
      },
      phone: { overrides: null },
    },
  };
}

export const student: StarterKit = {
  id: 'student',
  name: 'Student',
  description: 'Show what you\u2019ve made: two projects, a resume, clubs and achievements.',
  look,
  preview: { accent: ACCENT, icons: ['finder', 'preview', 'stickies', 'game-center'] },
  build,
};
