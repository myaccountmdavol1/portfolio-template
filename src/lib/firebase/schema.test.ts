import { describe, expect, it } from 'vitest';
import { seedSiteData } from '../seed';
import { appToDoc, assembleSiteData, docToApp, docToLayout, layoutToDoc } from './schema';

describe('appToDoc / docToApp', () => {
  it('strips the id when converting to a document, and restores it when converting back', () => {
    const app = seedSiteData.apps[0];
    const doc = appToDoc(app);
    expect(doc).not.toHaveProperty('id');
    expect(docToApp(app.id, doc)).toEqual(app);
  });
});

describe('assembleSiteData', () => {
  it('sorts apps by order regardless of input order', () => {
    const [a, b, c] = seedSiteData.apps;
    const result = assembleSiteData(seedSiteData.site, [c, a, b], seedSiteData.layout);
    expect(result.apps.map((x) => x.id)).toEqual([a, b, c].map((x) => x.id));
  });

  it('keeps site and layout unchanged', () => {
    const result = assembleSiteData(seedSiteData.site, seedSiteData.apps, seedSiteData.layout);
    expect(result.site).toEqual(seedSiteData.site);
    expect(result.layout).toEqual(seedSiteData.layout);
  });
});

describe('layoutToDoc / docToLayout', () => {
  const layout = {
    ...seedSiteData.layout,
    phone: { overrides: { pages: [[{ appId: 'p1', size: '1x1' as const }], [{ appId: 'todo', size: '2x2' as const }]], dock: ['about'] } },
  };

  it('wraps phone pages so no array sits directly inside an array', () => {
    const doc = layoutToDoc(layout);
    expect(doc.phone.overrides?.pages[0]).toEqual({ slots: [{ appId: 'p1', size: '1x1' }] });
  });

  it('round-trips, including null overrides', () => {
    expect(docToLayout(layoutToDoc(layout))).toEqual(layout);
    expect(docToLayout(layoutToDoc(seedSiteData.layout))).toEqual(seedSiteData.layout);
  });
});
