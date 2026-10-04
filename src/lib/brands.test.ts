import { describe, expect, it } from 'vitest';
import { handleFromUrl, paymentBrand, socialBrand, telHref } from './brands';

describe('socialBrand', () => {
  it('recognises the classic networks from their URLs', () => {
    expect(socialBrand('https://x.com/jordan').name).toBe('X');
    expect(socialBrand('https://twitter.com/jordan').name).toBe('X');
    expect(socialBrand('https://bsky.app/profile/jordan.bsky.social').name).toBe('Bluesky');
    expect(socialBrand('https://www.instagram.com/jordan/').name).toBe('Instagram');
    expect(socialBrand('https://discord.gg/abc').name).toBe('Discord');
    expect(socialBrand('https://www.reddit.com/user/jordan').name).toBe('Reddit');
    expect(socialBrand('https://www.tiktok.com/@jordan').name).toBe('TikTok');
    expect(socialBrand('https://m.facebook.com/jordan').name).toBe('Facebook');
    expect(socialBrand('https://mastodon.social/@jordan').name).toBe('Mastodon');
  });

  it('falls back to a generic link', () => {
    expect(socialBrand('https://example.com').id).toBe('other');
    expect(socialBrand('not a url').id).toBe('other');
  });
});

describe('paymentBrand', () => {
  it('recognises donation services, including GitHub Sponsors by path', () => {
    expect(paymentBrand('https://venmo.com/u/jordan').name).toBe('Venmo');
    expect(paymentBrand('https://paypal.me/jordan').name).toBe('PayPal');
    expect(paymentBrand('https://cash.app/$jordan').name).toBe('Cash App');
    expect(paymentBrand('https://github.com/sponsors/jordan').name).toBe('GitHub Sponsors');
    expect(paymentBrand('https://example.com/tip').name).toBe('Donate');
  });
});

describe('handleFromUrl / telHref', () => {
  it('pulls a handle from a profile link', () => {
    expect(handleFromUrl('https://x.com/jordan')).toBe('@jordan');
    expect(handleFromUrl('https://www.tiktok.com/@jordan')).toBe('@jordan');
    expect(handleFromUrl('https://cash.app/$jordan')).toBe('$jordan');
  });

  it('builds a tel: link from a formatted number', () => {
    expect(telHref('+1 (555) 123-4567')).toBe('tel:+15551234567');
    expect(telHref('555.123.4567 ext')).toBe('tel:5551234567');
    expect(telHref('')).toBe('');
  });
});

describe('real logos', () => {
  const urls = [
    'https://x.com/a', 'https://bsky.app/profile/a', 'https://instagram.com/a', 'https://threads.net/@a', 'https://facebook.com/a',
    'https://tiktok.com/@a', 'https://youtube.com/@a', 'https://linkedin.com/in/a', 'https://discord.gg/a', 'https://reddit.com/u/a',
    'https://twitch.tv/a', 'https://github.com/a', 'https://snapchat.com/add/a', 'https://pinterest.com/a', 'https://dribbble.com/a',
    'https://behance.net/a', 'https://medium.com/@a', 'https://a.substack.com', 'https://open.spotify.com/user/a', 'https://wa.me/1555',
    'https://t.me/a', 'https://mastodon.social/@a',
  ];
  it('every recognised social network has an SVG logo', () => {
    for (const u of urls) {
      const b = socialBrand(u);
      expect(b.id, u).not.toBe('other');
      expect(b.logo?.path.length, b.name).toBeGreaterThan(20);
    }
  });
  it('every recognised payment service has an SVG logo', () => {
    for (const u of ['https://venmo.com/u/a', 'https://paypal.me/a', 'https://cash.app/$a', 'https://ko-fi.com/a', 'https://buymeacoffee.com/a', 'https://github.com/sponsors/a', 'https://patreon.com/a', 'https://buy.stripe.com/x', 'https://gofundme.com/f/a']) {
      expect(paymentBrand(u).logo?.path.length, u).toBeGreaterThan(20);
    }
  });
});
