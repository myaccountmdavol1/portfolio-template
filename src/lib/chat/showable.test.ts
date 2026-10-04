import { describe, expect, it } from 'vitest';
import { starterApp } from '../editor/starters';
import { resolveDeepLink } from '../deepLink';
import { withDeepLinkFixture } from '../fixtures/deepLinkFixture';
import { seedSiteData } from '../seed';
import type { SiteData } from '../types';
import { MAX_SHOWABLE, showableSection, showableTargets, showTool } from './showable';

const site: SiteData = withDeepLinkFixture(seedSiteData);

describe('showableTargets', () => {
  const targets = showableTargets(site);

  it('lists apps, then badges and captioned photos', () => {
    expect(targets).toContainEqual({ open: 'project-one', label: 'Project One', kind: 'app' });
    expect(targets).toContainEqual({ open: 'badges', label: 'Badges', kind: 'app' });
    expect(targets).toContainEqual({ open: 'badges', item: 'apple-learning-coach', label: 'Apple Learning Coach', kind: 'badge' });
    expect(targets).toContainEqual({ open: 'photos', item: 'robotics-club', label: 'Robotics club', kind: 'photo' });
    const firstItem = targets.findIndex((t) => t.kind !== 'app');
    expect(targets.slice(firstItem).every((t) => t.kind !== 'app')).toBe(true);
  });

  it('leaves out widgets, uncaptioned photos, and the Messages app', () => {
    expect(targets.some((t) => t.open === 'to-do')).toBe(false);
    expect(targets.some((t) => t.kind === 'photo' && t.item === '2')).toBe(false);
    const withChat = { ...site, apps: [...site.apps, { ...starterApp('messages', 'm-1', 99), title: 'Ask me' }] };
    expect(showableTargets(withChat).some((t) => t.label === 'Ask me')).toBe(false);
  });

  it('only lists targets a deep link can open', () => {
    for (const t of targets) expect(resolveDeepLink(site, t.open, t.item)?.itemMissing, `${t.open} ${t.item}`).toBe(false);
  });

  it('caps the list', () => {
    const wallet = site.apps.find((a) => a.type === 'wallet')!;
    const many = Array.from({ length: 120 }, (_, i) => ({ id: `p${i}`, title: `Badge ${i}`, issuer: 'X' }));
    const big = { ...site, apps: site.apps.map((a) => (a === wallet && a.type === 'wallet' ? { ...a, content: { ...a.content, passes: many } } : a)) };
    const capped = showableTargets(big);
    expect(capped).toHaveLength(MAX_SHOWABLE);
    expect(capped.filter((t) => t.kind === 'app').length).toBe(showableTargets(site).filter((t) => t.kind === 'app').length);
  });
});

describe('showTool', () => {
  it('limits open and item to the listed values', () => {
    const tool = showTool(showableTargets(site))!;
    expect(tool.name).toBe('show');
    const props = tool.input_schema.properties as Record<string, { enum: string[] }>;
    expect(props.open.enum).toContain('badges');
    expect(new Set(props.open.enum).size).toBe(props.open.enum.length);
    expect(props.item.enum).toContain('apple-learning-coach');
    expect(tool.input_schema.required).toEqual(['open']);
  });

  it('has no item field when nothing has items, and no tool when nothing is showable', () => {
    const tool = showTool([{ open: 'a', label: 'A', kind: 'app' }])!;
    expect((tool.input_schema.properties as Record<string, unknown>).item).toBeUndefined();
    expect(showTool([])).toBeNull();
  });
});

describe('showableSection', () => {
  it('writes one line per target', () => {
    expect(
      showableSection([
        { open: 'about-me', label: 'About Me', kind: 'app' },
        { open: 'badges', item: 'x', label: 'X Badge', kind: 'badge' },
      ]),
    ).toBe('open=about-me — About Me\nopen=badges item=x — X Badge (badge)');
  });
});
