import type { EmbedKind } from './types';

export interface EmbedInfo {
  kind: EmbedKind;
  embedUrl: string;
}

const SPOTIFY_TYPES = ['track', 'album', 'playlist', 'episode', 'show', 'artist'];

/** Turns a normal share link into a URL that can be placed in an <iframe>. */
export function detectEmbed(rawUrl: string): EmbedInfo {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { kind: 'generic-iframe', embedUrl: rawUrl };
  }

  const host = url.hostname.replace(/^www\./, '');
  const parts = url.pathname.split('/').filter(Boolean);

  if (host === 'open.spotify.com') {
    const i = parts.findIndex((p) => SPOTIFY_TYPES.includes(p));
    if (i >= 0 && parts[i + 1]) {
      return { kind: 'spotify', embedUrl: `https://open.spotify.com/embed/${parts[i]}/${parts[i + 1]}` };
    }
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
    const id =
      host === 'youtu.be'
        ? parts[0]
        : (url.searchParams.get('v') ?? (parts[0] === 'shorts' || parts[0] === 'embed' ? parts[1] : undefined));
    if (id) return { kind: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
  }

  if (host === 'docs.google.com' && parts[0] === 'presentation' && parts[1] === 'd' && parts[2]) {
    const slideshow = 'start=false&loop=false&delayms=3000';
    // "Publish to web" links look like /presentation/d/e/2PACX…/pub; shared links like /presentation/d/<id>/edit.
    if (parts[2] === 'e' && parts[3]) {
      return { kind: 'google-slides', embedUrl: `https://docs.google.com/presentation/d/e/${parts[3]}/embed?${slideshow}` };
    }
    return { kind: 'google-slides', embedUrl: `https://docs.google.com/presentation/d/${parts[2]}/embed?${slideshow}` };
  }

  if (host === 'canva.com' && parts[0] === 'design' && parts[1]) {
    const viewIndex = parts.indexOf('view');
    const path = viewIndex >= 0 ? parts.slice(0, viewIndex + 1).join('/') : `design/${parts[1]}/view`;
    return { kind: 'canva', embedUrl: `https://www.canva.com/${path}?embed` };
  }

  return { kind: 'generic-iframe', embedUrl: url.toString() };
}
