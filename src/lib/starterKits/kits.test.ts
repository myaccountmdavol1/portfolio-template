import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isSiteData } from '../auth/http';
import { APP_TYPES } from '../editor/starters';
import { fontById, resolveSiteFonts } from '../fonts';
import { CATALOG_ICONS, ICON_PACKS } from '../iconCatalog';
import { seedSiteData } from '../seed';
import type { SiteData } from '../types';
import { WALLPAPER_CATALOG } from '../wallpaper';
import { kitById, STARTER_KITS } from '.';

// Checks every kit in the registry, so a new kit is covered by adding it to STARTER_KITS.

const PUBLIC = join(process.cwd(), 'public');
const CATALOG = new Set<string>(CATALOG_ICONS.map((i) => i.slug));
/** Hosts a kit may link to: placeholders and well-known services, never anyone's own site. */
const NEUTRAL_HOSTS = ['example.com', 'cal.com', 'open.spotify.com', 'www.linkedin.com', 'www.instagram.com', 'www.behance.net', 'dribbble.com', 'www.figma.com'];

/** Every string anywhere in a value. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

/** The app ids a site's layout, menu bar and incoming call point at. */
function referencedAppIds(data: SiteData): string[] {
  const { desktop } = data.layout;
  const actions = [...data.site.menuBar.items.map((i) => i.action), data.site.incomingCall.answerAction];
  return [
    ...desktop.icons.map((p) => p.appId),
    ...desktop.widgets.map((p) => p.appId),
    ...desktop.dock.flatMap((d) => (d.kind === 'app' ? [d.appId] : [])),
    ...actions.flatMap((a) => (a.startsWith('openApp:') ? [a.slice('openApp:'.length)] : [])),
  ];
}

describe.each(STARTER_KITS.map((kit) => [kit.id, kit] as const))('the %s kit', (_id, kit) => {
  const data = kit.build();

  it('has a name, a description and a plain id the registry finds', () => {
    expect(kit.name.trim()).not.toBe('');
    expect(kit.description.trim()).not.toBe('');
    expect(kit.id).toMatch(/^[a-z0-9-]+$/);
    expect(kitById(kit.id)).toBe(kit);
  });

  it('builds deep copies: changing one never touches the next build or the sample', () => {
    const before = JSON.stringify(kit.build());
    const sampleBefore = JSON.stringify(seedSiteData);
    const mutated = kit.build();
    (mutated.apps[0] as { title: string }).title = 'Changed';
    mutated.site.headline.line1 = 'changed';
    mutated.site.menuBar.items.push({ label: 'x', action: 'url:https://example.com/' });
    expect(JSON.stringify(kit.build())).toBe(before);
    expect(JSON.stringify(seedSiteData)).toBe(sampleBefore);
  });

  it('builds a complete, JSON-safe site, fresh on every call', () => {
    expect(isSiteData(data)).toBe(true);
    expect(JSON.parse(JSON.stringify(data))).toStrictEqual(data);
    const again = kit.build();
    expect(again).toStrictEqual(data);
    expect(again).not.toBe(data);
    expect(again.apps[0]).not.toBe(data.apps[0]);
  });

  it('has unique app ids, known app types and catalog icons', () => {
    const ids = data.apps.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const app of data.apps) {
      expect(APP_TYPES, app.id).toContain(app.type);
      if (app.icon.kind === 'catalog') expect(CATALOG.has(app.icon.slug), app.id).toBe(true);
    }
  });

  it('places and links only apps that exist, and every app is somewhere on the desktop', () => {
    const ids = new Set(data.apps.map((a) => a.id));
    for (const id of referencedAppIds(data)) expect(ids.has(id), id).toBe(true);
    const { desktop } = data.layout;
    const placed = new Set([...desktop.icons, ...desktop.widgets].map((p) => p.appId).concat(desktop.dock.flatMap((d) => (d.kind === 'app' ? [d.appId] : []))));
    for (const app of data.apps) expect(placed.has(app.id), app.id).toBe(true);
    for (const p of [...desktop.icons, ...desktop.widgets]) {
      expect(p.xPct, p.appId).toBeGreaterThanOrEqual(0);
      expect(p.xPct, p.appId).toBeLessThanOrEqual(100);
      expect(p.yPct, p.appId).toBeGreaterThanOrEqual(0);
      expect(p.yPct, p.appId).toBeLessThanOrEqual(100);
    }
    expect(data.layout.phone.overrides).toBeNull();
  });

  it('has a visible About app for the wizard’s photo and bio', () => {
    expect(data.apps.some((a) => a.type === 'about' && a.visible)).toBe(true);
  });

  it('wears its look, picked from the shipped catalogues', () => {
    const { look } = kit;
    expect(WALLPAPER_CATALOG.map((w) => w.id)).toContain(look.wallpaper.preset);
    expect(fontById(look.headingFont)).toBeDefined();
    expect(fontById(look.bodyFont)).toBeDefined();
    if (look.iconPack !== undefined) expect(ICON_PACKS.filter((p) => !p.private).map((p) => p.id)).toContain(look.iconPack);
    expect(data.site.wallpaper).toEqual(look.wallpaper);
    const fonts = resolveSiteFonts(data.site);
    expect(fonts.heading.id).toBe(look.headingFont);
    expect(fonts.body.id).toBe(look.bodyFont);
    expect(data.site.style?.iconPack).toBe(look.iconPack);
    expect(kit.preview.accent).toMatch(/^#[0-9a-f]{6}$/);
    expect(data.site.accent).toBe(kit.preview.accent);
    expect(kit.preview.icons.length).toBeGreaterThanOrEqual(3);
    for (const slug of kit.preview.icons) expect(CATALOG.has(slug), slug).toBe(true);
  });

  it('uses only pictures that ship with the template', () => {
    for (const s of strings(data)) {
      if (/^\/(kits|wallpapers)\//.test(s)) expect(existsSync(join(PUBLIC, s)), s).toBe(true);
      const icon = /^\/icons\/catalog\/([a-z0-9-]+)\.(png|webp)$/.exec(s);
      if (icon) expect(CATALOG.has(icon[1]), s).toBe(true);
    }
  });

  it('is about nobody in particular', () => {
    expect(data.site.ownerName).toBe('Your Name');
    expect(data.site.email).toBe('you@example.com');
    for (const s of strings(data)) {
      for (const email of s.match(/[^\s:@]+@[^\s@]+/g) ?? []) expect(email, s).toBe('you@example.com');
      for (const url of s.match(/https?:\/\/[^\s"]+/g) ?? []) expect(NEUTRAL_HOSTS, url).toContain(new URL(url).host);
    }
  });

  it.skipIf(kit.id === 'classic')('marks its sample copy as placeholder', () => {
    const about = data.apps.find((a) => a.type === 'about');
    expect(about?.type === 'about' && about.content.roleTitle.startsWith('Replace me')).toBe(true);
    expect(strings(data).filter((s) => s.includes('Replace me')).length).toBeGreaterThanOrEqual(6);
  });
});

describe('what each kit starts with', () => {
  const apps = (id: string) => kitById(id)!.build().apps.map((a) => `${a.id}:${a.type}:${a.title}`);

  it('Teacher: About, the classroom, PD badges, lesson resources, office hours, contact and this week', () => {
    expect(apps('teacher')).toEqual([
      'about:about:About Me',
      'classroom:photos:Our classroom',
      'badges:wallet:PD & Badges',
      'resources:link:Lesson resources (replace me)',
      'office-hours:calendar:Office hours',
      'contact:mail:Contact',
      'this-week:note:This week',
    ]);
    expect(kitById('teacher')!.build().site.headline).toEqual({ show: true, line1: 'welcome to my', line2: 'classroom.' });
  });

  it('Student: About, two projects, a resume, clubs and achievements', () => {
    expect(apps('student')).toEqual([
      'about:about:About Me',
      'project-1:project:Project One',
      'project-2:project:Project Two',
      'resume:document:Resume.pdf',
      'clubs:note:Clubs & activities',
      'achievements:wallet:Achievements',
    ]);
  });

  it('Creative: a gallery of scenery photos first, About, two case studies, a playlist and profiles', () => {
    expect(apps('creative')).toEqual([
      'gallery:photos:Gallery',
      'about:about:About Me',
      'case-study-1:project:Case Study One',
      'case-study-2:project:Case Study Two',
      'playlist:link:Playlist',
      'social:social:Find me online',
    ]);
    const gallery = kitById('creative')!.build().apps[0];
    expect(gallery.type === 'photos' && gallery.content.albums[0].photos.every((p) => p.url.startsWith('/wallpapers/'))).toBe(true);
  });

  it('Professional: About, a resume, credentials, two case studies, contact and booking', () => {
    expect(apps('professional')).toEqual([
      'about:about:About Me',
      'resume:document:Resume.pdf',
      'credentials:credentials:Credentials',
      'case-study-1:project:Case Study One',
      'case-study-2:project:Case Study Two',
      'contact:mail:Contact',
      'book:calendar:Book a call',
    ]);
  });
});
