import type { PortfolioApp, RichText, SiteData } from './types';

export interface SearchEntry {
  appId: string;
  title: string;
  /** Short line under the title, e.g. the project's tag. */
  subtitle: string;
  /** Everything searchable about the app, lowercased. */
  haystack: string;
  /** Original-case text used to cut a snippet around a match. */
  text: string;
}

export interface SearchResult {
  appId: string;
  title: string;
  subtitle: string;
  /** A short excerpt around the match, or '' when the title matched. */
  snippet: string;
  score: number;
}

const richText = (r: RichText) => r.blocks.map((b) => b.text).join(' ');

/** Human-readable text for an app: used by Spotlight and as the AI chat's knowledge. */
export function appText(app: PortfolioApp): { subtitle: string; text: string } {
  switch (app.type) {
    case 'project': {
      const c = app.content;
      return { subtitle: [c.tag, c.year].filter(Boolean).join(' · '), text: [c.tag, c.role, c.year, richText(c.body), ...c.gallery.map((g) => g.caption), ...c.links.map((l) => l.label)].join(' ') };
    }
    case 'document':
      return { subtitle: 'Document', text: app.content.fileName };
    case 'about': {
      const c = app.content;
      return { subtitle: c.roleTitle, text: [c.roleTitle, richText(c.bio), ...c.lists.flatMap((l) => [l.heading, ...l.items]), c.quote?.text ?? '', c.quote?.author ?? ''].join(' ') };
    }
    case 'link':
      return { subtitle: 'Link', text: app.content.url };
    case 'credentials': {
      const c = app.content;
      return {
        subtitle: 'Education & credentials',
        text: [
          ...c.education.flatMap((e) => [e.title, e.abbr, e.school, e.year]),
          ...c.groups.flatMap((g) => [g.name, ...g.items.flatMap((i) => [i.name, i.issuer, i.year, i.desc])]),
        ].join(' '),
      };
    }
    case 'stats': {
      const c = app.content;
      return { subtitle: c.heading, text: [c.heading, c.subheading, ...c.steps.flatMap((s) => [s.name, s.desc]), ...c.metrics.map((m) => `${m.value} ${m.label}`)].join(' ') };
    }
    case 'note':
      return { subtitle: 'Note', text: [app.content.title, ...app.content.items.map((i) => i.text)].join(' ') };
    case 'clock':
      return { subtitle: `Local time in ${app.content.city}`, text: `${app.content.city} time weather` };
    case 'status':
      return { subtitle: app.content.headline, text: `${app.content.headline} ${app.content.detail}` };
    case 'messages':
      return { subtitle: 'Ask me anything', text: 'chat message ask question' };
    case 'guestbook':
      return { subtitle: 'Guestbook', text: `${app.content.heading} guestbook note sticky` };
    case 'freeform':
      return { subtitle: 'Drawing canvas', text: `${app.content.prompt} draw drawing doodle` };
    case 'terminal':
      return { subtitle: 'Command line', text: 'terminal command shell' };
    case 'photos':
      return { subtitle: 'Photos', text: app.content.albums.flatMap((a) => [a.name, ...a.photos.map((p) => p.caption)]).join(' ') };
    case 'maps':
      return { subtitle: app.content.heading, text: app.content.places.flatMap((p) => [p.name, p.detail, p.years]).join(' ') };
    case 'calendar':
      return { subtitle: 'Book a call', text: `${app.content.heading} ${app.content.note} calendar meeting book call` };
    case 'voicememos':
      return { subtitle: 'Voice Memos', text: app.content.memos.map((m) => m.title).join(' ') };
    case 'gamecenter':
      return { subtitle: 'Achievements', text: 'game center achievements' };
    case 'mail':
      return { subtitle: 'Email me', text: 'mail email contact message' };
    case 'facetime':
      return { subtitle: 'Video hello', text: 'facetime video call intro' };
    case 'wallet':
      return { subtitle: app.content.heading, text: `${app.content.heading} ${app.content.message} donate tip support wallet` };
    case 'social':
      return { subtitle: app.content.heading, text: `${app.content.heading} social media ${app.content.links.map((l) => l.url).join(' ')}` };
    case 'phone':
      return { subtitle: `${app.content.label} · ${app.content.number}`, text: `phone call ${app.content.label} ${app.content.number} ${app.content.hours}` };
    default: {
      const unknownApp: never = app;
      return unknownApp;
    }
  }
}

export function buildSearchIndex(data: SiteData): SearchEntry[] {
  return data.apps
    .filter((a) => a.visible)
    .map((app) => {
      const { subtitle, text } = appText(app);
      const full = `${app.title} ${text}`.replace(/\s+/g, ' ').trim();
      return { appId: app.id, title: app.title, subtitle, haystack: full.toLowerCase(), text: full };
    });
}

function snippetAround(text: string, at: number, length: number): string {
  const start = Math.max(0, at - 30);
  const end = Math.min(text.length, at + length + 50);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

/** Title matches beat body matches; earlier and word-start matches rank higher. Every word must match. */
export function searchSite(index: SearchEntry[], query: string, limit = 8): SearchResult[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const results: SearchResult[] = [];
  for (const entry of index) {
    const title = entry.title.toLowerCase();
    if (!words.every((w) => entry.haystack.includes(w))) continue;
    let score = 0;
    for (const w of words) {
      if (title.startsWith(w)) score += 100;
      else if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(title)) score += 60;
      else if (title.includes(w)) score += 40;
      else score += 10;
    }
    const titleHit = words.every((w) => title.includes(w));
    const at = titleHit ? -1 : entry.haystack.indexOf(words[0], entry.title.length);
    results.push({
      appId: entry.appId,
      title: entry.title,
      subtitle: entry.subtitle,
      snippet: at >= 0 ? snippetAround(entry.text, at, words[0].length) : '',
      score,
    });
  }
  return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}
