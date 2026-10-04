import { afterEach, describe, expect, it, vi } from 'vitest';
import { iconInitials, lighten, loadHeadlineFont } from './siteIcon';

describe('lighten', () => {
  it('mixes a colour towards white', () => {
    expect(lighten('#000000', 0.5)).toBe('#808080');
    expect(lighten('#6f9bd1', 0)).toBe('#6f9bd1');
  });
  it('falls back for anything that isn’t a 6-digit hex colour', () => {
    expect(lighten('red')).toBe('#8fc0ec');
  });
});

describe('iconInitials', () => {
  it('uses up to two initials', () => {
    expect(iconInitials({ ownerName: 'Alex Rivera' })).toBe('AR');
    expect(iconInitials({ ownerName: 'Cher' })).toBe('C');
    expect(iconInitials({ ownerName: '' })).toBe('•');
  });
});

describe('loadHeadlineFont', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks Google Fonts for the given family, subset to the text', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(url);
        return urls.length === 1
          ? new Response("@font-face { src: url(https://fonts.gstatic.com/x.ttf) format('truetype'); }")
          : new Response(new Uint8Array([1, 2, 3]));
      }),
    );
    const font = await loadHeadlineFont('Hi', 'Playfair Display');
    expect(urls[0]).toBe('https://fonts.googleapis.com/css2?family=Playfair+Display&text=Hi');
    expect(urls[1]).toBe('https://fonts.gstatic.com/x.ttf');
    expect(font?.byteLength).toBe(3);
  });

  it('still defaults to Instrument Serif', async () => {
    const fetchMock = vi.fn(async () => new Response(''));
    vi.stubGlobal('fetch', fetchMock);
    expect(await loadHeadlineFont('Hi')).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('https://fonts.googleapis.com/css2?family=Instrument+Serif&text=Hi');
  });
});
