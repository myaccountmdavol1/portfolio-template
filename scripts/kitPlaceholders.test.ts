import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { KIT_PLACEHOLDERS, KITS_LICENSE, placeholderSvg } from './kitPlaceholders';

describe('placeholderSvg', () => {
  it('draws a card in the kit’s colour with a glyph and the words Replace me', () => {
    const card = KIT_PLACEHOLDERS.find((c) => c.file === 'teacher-classroom-1.svg')!;
    const svg = placeholderSvg(card);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750"')).toBe(true);
    expect(svg).toContain('>Replace me</text>');
    expect(svg).toContain('>Your classroom</text>');
    expect(svg).toContain('lucide-school');
    expect(svg).toMatch(/stop-color="#[0-9a-f]{6}"/);
  });

  it('escapes the caption', () => {
    const card = { ...KIT_PLACEHOLDERS[0], caption: 'Q&A <b> "x"' };
    const svg = placeholderSvg(card);
    expect(svg).toContain('>Q&amp;A &lt;b&gt; &quot;x&quot;</text>');
    expect(svg).not.toContain('<b>');
  });

  it('draws headshots square', () => {
    const card = KIT_PLACEHOLDERS.find((c) => c.file === 'teacher-headshot.svg')!;
    expect(placeholderSvg(card)).toContain('viewBox="0 0 800 800"');
  });
});

describe('public/kits', () => {
  it('has every placeholder, generated, and nothing else but the licence', () => {
    const files = readdirSync('public/kits').sort();
    expect(files).toEqual([...KIT_PLACEHOLDERS.map((c) => c.file), 'LICENSE.md'].sort());
    for (const card of KIT_PLACEHOLDERS) {
      const svg = readFileSync(`public/kits/${card.file}`, 'utf8');
      expect(svg, card.file).toContain('>Replace me</text>');
      expect(svg, card.file).toContain(`>${card.caption}</text>`);
      expect(svg, `${card.file} is stale: run npm run kits:generate`).toBe(placeholderSvg(card));
    }
  });

  it('credits Lucide', () => {
    expect(existsSync('public/kits/LICENSE.md')).toBe(true);
    expect(readFileSync('public/kits/LICENSE.md', 'utf8')).toContain('Lucide, ISC licence');
    expect(readFileSync('public/kits/LICENSE.md', 'utf8')).toBe(KITS_LICENSE);
  });

  it('has unique file names', () => {
    expect(new Set(KIT_PLACEHOLDERS.map((c) => c.file)).size).toBe(KIT_PLACEHOLDERS.length);
  });
});
