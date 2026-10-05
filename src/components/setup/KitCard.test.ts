import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { kitById } from '@/lib/starterKits';
import { seedSiteData } from '@/lib/seed';
import { CurrentSiteCard, KitCard } from './KitCard';

const render = (id: string, checked = false) => renderToStaticMarkup(createElement(KitCard, { kit: kitById(id)!, checked, onPick: () => {} }));

describe('KitCard', () => {
  it('is a radio named after the kit, described by its description', () => {
    const html = render('teacher', true);
    expect(html).toContain('role="radio"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-label="Teacher"');
    expect(html).toContain('aria-describedby="kit-teacher-about"');
    expect(html).toContain('id="kit-teacher-about"');
    expect(html).toContain('A class page: your classroom, PD badges, lesson resources and office hours.');
    expect(render('teacher')).toContain('aria-checked="false"');
  });

  it('shows the kit\u2019s wallpaper, fonts and icons in its pack', () => {
    const html = render('teacher');
    expect(html).toContain('data-wallpaper="chalkboard"');
    expect(html).toContain('Patrick Hand');
    expect(html).toContain('Nunito');
    expect(html).toContain('src="/icons/pastel/photos.webp"');
    expect(html).toContain('src="/icons/pastel/calendar.webp"');
  });

  it('draws Classic in the sample\u2019s look, with the build\u2019s default icons', () => {
    const html = render('classic');
    expect(html).toContain('data-wallpaper="sky"');
    expect(html).toContain('var(--font-instrument-serif)');
    expect(html).toContain('src="/icons/catalog/finder.webp"');
    expect(html).toContain('Keep the sample site');
  });

  it('shows a scenery kit\u2019s small photo, not the full one', () => {
    expect(render('creative')).toContain('/wallpapers/coastline-thumb.webp');
  });

  it('shows a warning only while it is picked', () => {
    const warning = 'Picking a kit replaces your apps and their content. Published versions can be restored from version history; changes you haven\u2019t published can\u2019t.';
    const card = (checked: boolean) => renderToStaticMarkup(createElement(KitCard, { kit: kitById('teacher')!, checked, onPick: () => {}, warning }));
    expect(card(true)).toContain(warning);
    expect(card(true)).toContain('aria-describedby="kit-teacher-about kit-teacher-warning"');
    expect(card(false)).not.toContain(warning);
  });
});

describe('CurrentSiteCard', () => {
  it('draws the owner\u2019s own site: its wallpaper, fonts and first few icons', () => {
    const site = { ...seedSiteData, site: { ...seedSiteData.site, wallpaper: { kind: 'preset' as const, preset: 'dusk' as const }, style: { headingFont: 'lora', iconPack: 'glass' } } };
    const html = renderToStaticMarkup(createElement(CurrentSiteCard, { site, name: 'Keep my current site', checked: true, onPick: () => {} }));
    expect(html).toContain('aria-label="Keep my current site"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('data-wallpaper="dusk"');
    expect(html).toContain('Lora');
    // p1 and p2 share the Finder icon: it shows once.
    expect(html.match(/src="\/icons\/glass\/finder.webp"/g)).toHaveLength(1);
    expect(html).toContain('src="/icons/glass/preview.webp"');
  });
});
