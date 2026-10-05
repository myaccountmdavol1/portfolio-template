import { describe, expect, it } from 'vitest';
import { chatStatusLine, hostingLine, spotifyStatusLine } from './copy';

describe('Add-ons card copy', () => {
  it('says where chat stands', () => {
    expect(chatStatusLine({ state: 'off' })).toBe('Not set up');
    expect(chatStatusLine({ state: 'on', hint: 'abcd' })).toBe('Connected \u00b7 key ending \u2026abcd');
    expect(chatStatusLine({ state: 'env' })).toBe('Set by your hosting');
    expect(chatStatusLine({ state: 'reenter' })).toBe('Your setup code changed \u2014 enter your key again');
  });

  it('follows Spotify from not set up to connected', () => {
    expect(spotifyStatusLine({ state: 'off', connected: false })).toBe('Not set up');
    expect(spotifyStatusLine({ state: 'credentials', connected: false })).toBe('Keys saved \u2014 not connected yet');
    expect(spotifyStatusLine({ state: 'connected', connected: true })).toBe('Connected');
    expect(spotifyStatusLine({ state: 'env', connected: false })).toBe('Set by your hosting \u00b7 not connected yet');
    expect(spotifyStatusLine({ state: 'reenter', connected: true })).toBe('Your setup code changed \u2014 enter your keys again');
  });

  it('on hosting-only sites, names the variables and points to the README', () => {
    expect(hostingLine({ chat: true, spotify: false }, 'chat')).toBe('Set by your hosting');
    expect(hostingLine({ chat: true, spotify: false }, 'spotify')).toContain('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET');
    expect(hostingLine({ chat: false, spotify: false }, 'chat')).toContain('README');
  });
});
