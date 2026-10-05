import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { seedSiteData } from '@/lib/seed';
import type { SiteSettings } from '@/lib/types';
import { SetupPreview } from './SetupPreview';

const render = (site: SiteSettings) => renderToStaticMarkup(createElement(SetupPreview, { site }));

describe('SetupPreview', () => {
  it('draws the site\u2019s wallpaper, headline, name and icons', () => {
    const html = render(seedSiteData.site);
    expect(html).toContain('data-testid="setup-preview"');
    expect(html).toContain('data-wallpaper="sky"');
    expect(html).toContain('welcome to my');
    expect(html).toContain('portfolio.');
    expect(html).toContain('Your Name');
    expect(html).toContain('var(--font-instrument-serif)');
    expect(html).toContain('src="/icons/catalog/finder.webp"');
  });

  it('follows the chosen wallpaper, fonts and icon pack', () => {
    const html = render({ ...seedSiteData.site, wallpaper: { kind: 'preset', preset: 'dusk' }, style: { headingFont: 'lora', bodyFont: 'inter', iconPack: 'glass' } });
    expect(html).toContain('data-wallpaper="dusk"');
    expect(html).toContain('Lora');
    expect(html).toContain('Inter');
    expect(html).toContain('src="/icons/glass/mail.webp"');
  });

  it('marks an uploaded wallpaper', () => {
    expect(render({ ...seedSiteData.site, wallpaper: { kind: 'image', imageUrl: '/api/dev-media/images/1-bg.png' } })).toContain('data-wallpaper="image"');
  });
});
