import { describe, expect, it } from 'vitest';
import { guessIsPhone } from './device';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID_PHONE = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const ANDROID_TABLET = 'Mozilla/5.0 (Linux; Android 14; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const MAC_CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

describe('guessIsPhone', () => {
  it('detects phones from the user agent', () => {
    expect(guessIsPhone(IPHONE, null)).toBe(true);
    expect(guessIsPhone(ANDROID_PHONE, null)).toBe(true);
  });
  it('treats tablets and desktops as not phones', () => {
    expect(guessIsPhone(ANDROID_TABLET, null)).toBe(false);
    expect(guessIsPhone(MAC_CHROME, null)).toBe(false);
  });
  it('trusts the Sec-CH-UA-Mobile client hint', () => {
    expect(guessIsPhone(null, '?1')).toBe(true);
    expect(guessIsPhone(MAC_CHROME, '?0')).toBe(false);
  });
  it('defaults to desktop with no information', () => {
    expect(guessIsPhone(null, null)).toBe(false);
  });
});
