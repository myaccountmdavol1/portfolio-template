import { describe, expect, it } from 'vitest';
import { parseCurrentlyPlaying, parseRecentlyPlayed } from './nowPlaying';

const track = {
  name: 'September',
  artists: [{ name: 'Earth, Wind & Fire' }],
  album: { images: [{ url: 'big.jpg', width: 640 }, { url: 'mid.jpg', width: 300 }, { url: 'tiny.jpg', width: 64 }] },
  external_urls: { spotify: 'https://open.spotify.com/track/x' },
};

describe('Spotify Now Playing', () => {
  it('reads the playing track, with a small-but-crisp cover', () => {
    expect(parseCurrentlyPlaying({ is_playing: true, currently_playing_type: 'track', item: track })).toEqual({
      isPlaying: true,
      title: 'September',
      artist: 'Earth, Wind & Fire',
      albumArt: 'mid.jpg',
      url: 'https://open.spotify.com/track/x',
    });
  });

  it('ignores paused tracks, podcasts, and ads', () => {
    expect(parseCurrentlyPlaying({ is_playing: false, currently_playing_type: 'track', item: track })).toBeNull();
    expect(parseCurrentlyPlaying({ is_playing: true, currently_playing_type: 'episode' })).toBeNull();
    expect(parseCurrentlyPlaying(null)).toBeNull();
  });

  it('falls back to the last played track', () => {
    const last = parseRecentlyPlayed({ items: [{ track, played_at: '2026-09-30T09:00:00.000Z' }] });
    expect(last).toMatchObject({ isPlaying: false, title: 'September', playedAt: '2026-09-30T09:00:00.000Z' });
    expect(parseRecentlyPlayed({ items: [] })).toBeNull();
  });
});
