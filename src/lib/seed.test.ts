import { describe, expect, it } from 'vitest';
import { seedSiteData } from './seed';
import type { AppType } from './types';

const ALL_TYPES: AppType[] = ['project', 'document', 'about', 'link', 'credentials', 'stats', 'note'];

describe('seedSiteData', () => {
  const ids = new Set(seedSiteData.apps.map((a) => a.id));

  it('has unique app ids', () => {
    expect(ids.size).toBe(seedSiteData.apps.length);
  });

  it('contains at least one app of every type', () => {
    const types = new Set(seedSiteData.apps.map((a) => a.type));
    for (const t of ALL_TYPES) expect(types.has(t), `missing type ${t}`).toBe(true);
  });

  it('only references existing apps from the layout', () => {
    const { desktop } = seedSiteData.layout;
    for (const p of [...desktop.icons, ...desktop.widgets]) expect(ids.has(p.appId), p.appId).toBe(true);
    for (const d of desktop.dock) if (d.kind === 'app') expect(ids.has(d.appId), d.appId).toBe(true);
  });

  it('only references existing apps from action strings', () => {
    const actions = [
      ...seedSiteData.site.menuBar.items.map((i) => i.action),
      seedSiteData.site.incomingCall.answerAction,
    ];
    for (const action of actions) {
      const match = /^openApp:(.+)$/.exec(action);
      if (match) expect(ids.has(match[1]), action).toBe(true);
      else expect(action.startsWith('url:'), action).toBe(true);
    }
  });

  it('keeps positions within 0–100%', () => {
    const { icons, widgets } = seedSiteData.layout.desktop;
    for (const p of [...icons, ...widgets]) {
      expect(p.xPct).toBeGreaterThanOrEqual(0);
      expect(p.xPct).toBeLessThanOrEqual(100);
      expect(p.yPct).toBeGreaterThanOrEqual(0);
      expect(p.yPct).toBeLessThanOrEqual(100);
    }
  });
});
