import type { ChatStatus, HostingAddons, SpotifyStatus } from './types';

// The words on the Add-ons cards, kept here so they're tested and the same everywhere.

export const NOT_CONNECTED_NOTE = 'Not connected \u2014 add your key in Site settings \u2192 Add-ons';
export const HOSTING_NOT_CONNECTED_NOTE = 'Not connected \u2014 chat is turned on by adding ANTHROPIC_API_KEY in your hosting settings (see Add-ons in the README)';
export const SETUP_CODE_NEEDED = 'Keys are encrypted with your setup code, so this site needs SETUP_CODE (at least 12 characters) in its hosting settings before you can save one.';
export const ANTHROPIC_KEYS_URL = 'https://console.anthropic.com/settings/keys';
export const SPOTIFY_DASHBOARD_URL = 'https://developer.spotify.com/dashboard';

export function chatStatusLine(chat: ChatStatus): string {
  switch (chat.state) {
    case 'env':
      return 'Set by your hosting';
    case 'on':
      return `Connected \u00b7 key ending \u2026${chat.hint ?? ''}`;
    case 'reenter':
      return 'Your setup code changed \u2014 enter your key again';
    default:
      return 'Not set up';
  }
}

export function spotifyStatusLine(spotify: SpotifyStatus): string {
  switch (spotify.state) {
    case 'env':
      return spotify.connected ? 'Set by your hosting \u00b7 connected' : 'Set by your hosting \u00b7 not connected yet';
    case 'connected':
      return 'Connected';
    case 'credentials':
      return 'Keys saved \u2014 not connected yet';
    case 'reenter':
      return 'Your setup code changed \u2014 enter your keys again';
    default:
      return 'Not set up';
  }
}

/** Firebase sites and local mode: the editor can't save keys, so it says what the hosting sets. */
export function hostingLine(hosting: HostingAddons, addon: 'chat' | 'spotify'): string {
  if (hosting[addon]) return 'Set by your hosting';
  const vars = addon === 'chat' ? 'ANTHROPIC_API_KEY' : 'SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET';
  return `Not set up. On this site it\u2019s turned on by adding ${vars} in your hosting settings \u2014 see Add-ons in the README.`;
}
