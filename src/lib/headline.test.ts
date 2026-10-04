import { describe, expect, it } from 'vitest';
import { resolveHeadline } from './headline';

describe('resolveHeadline', () => {
  it('defaults to the original look', () => {
    expect(resolveHeadline(undefined, '#111')).toEqual({
      text: { color: '#111', fontFamily: 'var(--font-serif)', textShadow: undefined },
      scale: 1,
      justify: 'center',
      italicSmallLine: true,
      showName: true,
    });
  });

  it('applies colour, font, size (clamped), position, shadow, and toggles', () => {
    const r = resolveHeadline({ color: '#ff0000', font: 'mono', size: 400, position: 'bottom', shadow: true, italicSmallLine: false, showName: false }, '#111');
    expect(r.text.color).toBe('#ff0000');
    expect(r.text.fontFamily).toBe('var(--font-mono)');
    expect(r.text.textShadow).toBeTruthy();
    expect(r.scale).toBe(1.5);
    expect(r.justify).toBe('flex-end');
    expect(r.italicSmallLine).toBe(false);
    expect(r.showName).toBe(false);
  });

  it('treats a blank colour as “match the wallpaper”', () => {
    expect(resolveHeadline({ color: '  ' }, '#eee').text.color).toBe('#eee');
  });

  it('uses the Style headline font when given, over the older font option', () => {
    expect(resolveHeadline({ font: 'mono' }, '#111', undefined, 'var(--site-heading-font)').text.fontFamily).toBe('var(--site-heading-font)');
    expect(resolveHeadline({ font: 'mono' }, '#111', undefined, undefined).text.fontFamily).toBe('var(--font-mono)');
  });
});
