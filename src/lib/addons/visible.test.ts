import { describe, expect, it } from 'vitest';
import { starterApp } from '../editor/starters';
import { seedSiteData } from '../seed';
import type { SiteData } from '../types';
import { withoutDisconnected } from './visible';

/** The sample site plus two Messages apps, on the desktop, in the dock and on a custom phone layout. */
function withChats(): SiteData {
  const a = starterApp('messages', 'messages-1', 90);
  const b = starterApp('messages', 'messages-2', 91);
  const { desktop } = seedSiteData.layout;
  return {
    ...seedSiteData,
    apps: [...seedSiteData.apps, a, b],
    layout: {
      desktop: {
        icons: [...desktop.icons, { appId: 'messages-1', xPct: 50, yPct: 50 }, { appId: 'messages-2', xPct: 60, yPct: 50 }],
        widgets: desktop.widgets,
        dock: [...desktop.dock, { kind: 'app', appId: 'messages-1' }],
      },
      phone: {
        overrides: {
          pages: [[{ appId: 'p1', size: '1x1' }, { appId: 'messages-1', size: '1x1' }], [{ appId: 'messages-2', size: '1x1' }]],
          dock: ['messages-2', 'p2'],
        },
      },
    },
  };
}

describe('withoutDisconnected', () => {
  it('changes nothing while chat is connected', () => {
    const data = withChats();
    expect(withoutDisconnected(data, { chat: true })).toBe(data);
  });

  it('changes nothing when there are no Messages apps', () => {
    expect(withoutDisconnected(seedSiteData, { chat: false })).toBe(seedSiteData);
  });

  it('drops every Messages app and everything that points at one, and nothing else', () => {
    const data = withChats();
    const before = JSON.stringify(data);
    const shown = withoutDisconnected(data, { chat: false });
    expect(shown.apps).toEqual(seedSiteData.apps);
    expect(shown.layout.desktop).toEqual(seedSiteData.layout.desktop);
    expect(shown.layout.phone.overrides).toEqual({ pages: [[{ appId: 'p1', size: '1x1' }]], dock: ['p2'] });
    expect(shown.site).toBe(data.site);
    expect(JSON.stringify(shown)).not.toContain('messages-');
    // The input is untouched: the stored site keeps its Messages apps.
    expect(JSON.stringify(data)).toBe(before);
  });

  it('drops menu items that open a removed app, keeps the rest, and fixes the incoming call', () => {
    const data = withChats();
    const { site } = data;
    const withLinks: SiteData = {
      ...data,
      site: {
        ...site,
        menuBar: { ...site.menuBar, items: [...site.menuBar.items, { label: 'Chat', action: 'openApp:messages-1' }] },
        incomingCall: { ...site.incomingCall, answerAction: 'openApp:messages-2' },
      },
    };
    const shown = withoutDisconnected(withLinks, { chat: false });
    expect(shown.site.menuBar.items).toEqual(site.menuBar.items);
    expect(shown.site.incomingCall.answerAction).toBe('openApp:about');
    expect(withLinks.site.menuBar.items).toHaveLength(site.menuBar.items.length + 1);
  });

  it('matches a type or title ref the way the site does', () => {
    const data = withChats();
    const { site } = data;
    const withRefs: SiteData = {
      ...data,
      site: {
        ...site,
        menuBar: { ...site.menuBar, items: [...site.menuBar.items, { label: 'Chat', action: 'openApp:messages' }] },
        incomingCall: { ...site.incomingCall, answerAction: 'openApp:messages' },
      },
    };
    const shown = withoutDisconnected(withRefs, { chat: false });
    expect(shown.site.menuBar.items).toEqual(site.menuBar.items);
    expect(shown.site.incomingCall.answerAction).toBe('openApp:about');
  });

  it('leaves the incoming call alone when it opens another app, and clears it when there is no About app', () => {
    const data = withChats();
    const { site } = data;
    const keep = withoutDisconnected(data, { chat: false });
    expect(keep.site.incomingCall.answerAction).toBe(site.incomingCall.answerAction);
    const noAbout: SiteData = {
      ...data,
      apps: data.apps.filter((a) => a.id !== 'about'),
      site: { ...site, incomingCall: { ...site.incomingCall, answerAction: 'openApp:messages-1' } },
    };
    expect(withoutDisconnected(noAbout, { chat: false }).site.incomingCall.answerAction).toBe('');
  });
});
