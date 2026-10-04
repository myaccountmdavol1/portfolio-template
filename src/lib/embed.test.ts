import { describe, expect, it } from 'vitest';
import { detectEmbed } from './embed';

describe('detectEmbed', () => {
  it('converts Spotify links', () => {
    expect(detectEmbed('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc')).toEqual({
      kind: 'spotify',
      embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M',
    });
    expect(detectEmbed('https://open.spotify.com/intl-de/track/4uLU6hMCjMI75M1A2tKUQC')).toEqual({
      kind: 'spotify',
      embedUrl: 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC',
    });
  });

  it('converts YouTube links (watch, short link, shorts)', () => {
    const expected = { kind: 'youtube', embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' };
    expect(detectEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toEqual(expected);
    expect(detectEmbed('https://youtu.be/dQw4w9WgXcQ')).toEqual(expected);
    expect(detectEmbed('https://youtube.com/shorts/dQw4w9WgXcQ')).toEqual(expected);
  });

  it('converts Google Slides links', () => {
    expect(detectEmbed('https://docs.google.com/presentation/d/ABC123/edit#slide=id.p')).toEqual({
      kind: 'google-slides',
      embedUrl: 'https://docs.google.com/presentation/d/ABC123/embed?start=false&loop=false&delayms=3000',
    });
  });

  it('converts Google Slides “Publish to web” links (/d/e/…/pub)', () => {
    expect(detectEmbed('https://docs.google.com/presentation/d/e/2PACX-1vQabc/pub?start=false&loop=false&delayms=3000')).toEqual({
      kind: 'google-slides',
      embedUrl: 'https://docs.google.com/presentation/d/e/2PACX-1vQabc/embed?start=false&loop=false&delayms=3000',
    });
  });

  it('converts Canva links', () => {
    expect(detectEmbed('https://www.canva.com/design/DAF1/tokenXYZ/view?utm_source=x')).toEqual({
      kind: 'canva',
      embedUrl: 'https://www.canva.com/design/DAF1/tokenXYZ/view?embed',
    });
    expect(detectEmbed('https://www.canva.com/design/DAF1/edit')).toEqual({
      kind: 'canva',
      embedUrl: 'https://www.canva.com/design/DAF1/view?embed',
    });
  });

  it('falls back to a generic iframe', () => {
    expect(detectEmbed('https://example.com')).toEqual({ kind: 'generic-iframe', embedUrl: 'https://example.com/' });
    expect(detectEmbed('not a url')).toEqual({ kind: 'generic-iframe', embedUrl: 'not a url' });
  });
});
