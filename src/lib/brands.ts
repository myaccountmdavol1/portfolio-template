// Recognises social and payment links from their URL, so the owner just pastes links.
// Logos come from Simple Icons (https://simpleicons.org, CC0 — only the imported ones are bundled).
import {
  siBehance,
  siBluesky,
  siBuymeacoffee,
  siCashapp,
  siDiscord,
  siDribbble,
  siFacebook,
  siGithub,
  siGithubsponsors,
  siGofundme,
  siInstagram,
  siKofi,
  siMastodon,
  siMedium,
  siPatreon,
  siPaypal,
  siPinterest,
  siReddit,
  siSnapchat,
  siSpotify,
  siStripe,
  siSubstack,
  siTelegram,
  siThreads,
  siTiktok,
  siTwitch,
  siVenmo,
  siWhatsapp,
  siX,
  siYoutube,
  siZelle,
} from 'simple-icons';

/** An SVG logo: a single path, drawn in `currentColor`. */
export interface BrandLogo {
  path: string;
  viewBox: string;
}

const si = (icon: { path: string }): BrandLogo => ({ path: icon.path, viewBox: '0 0 24 24' });

// LinkedIn asked Simple Icons to remove its logo, so this one comes from CLorant/readme-social-icons
// (MIT License, Copyright (c) 2024 Lóránt Czibik — https://github.com/CLorant/readme-social-icons).
const LINKEDIN: BrandLogo = {
  viewBox: '0 0 16 16',
  path: 'M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z',
};

export interface Brand {
  id: string;
  name: string;
  color: string; // CSS background
  glyph: string; // fallback mark when there's no logo
  logo?: BrandLogo;
}

const SOCIAL: (Brand & { hosts: string[] })[] = [
  { id: 'x', name: 'X', color: '#000000', glyph: '𝕏', logo: si(siX), hosts: ['x.com', 'twitter.com'] },
  { id: 'bluesky', name: 'Bluesky', color: '#1185fe', glyph: '🦋', logo: si(siBluesky), hosts: ['bsky.app'] },
  { id: 'instagram', name: 'Instagram', color: 'linear-gradient(45deg,#f58529,#dd2a7b 50%,#8134af)', glyph: '◎', logo: si(siInstagram), hosts: ['instagram.com'] },
  { id: 'threads', name: 'Threads', color: '#000000', glyph: '@', logo: si(siThreads), hosts: ['threads.net', 'threads.com'] },
  { id: 'facebook', name: 'Facebook', color: '#1877f2', glyph: 'f', logo: si(siFacebook), hosts: ['facebook.com', 'fb.com'] },
  { id: 'tiktok', name: 'TikTok', color: '#010101', glyph: '♪', logo: si(siTiktok), hosts: ['tiktok.com'] },
  { id: 'youtube', name: 'YouTube', color: '#ff0000', glyph: '▶', logo: si(siYoutube), hosts: ['youtube.com', 'youtu.be'] },
  { id: 'linkedin', name: 'LinkedIn', color: '#0a66c2', glyph: 'in', logo: LINKEDIN, hosts: ['linkedin.com'] },
  { id: 'discord', name: 'Discord', color: '#5865f2', glyph: '◉', logo: si(siDiscord), hosts: ['discord.gg', 'discord.com'] },
  { id: 'reddit', name: 'Reddit', color: '#ff4500', glyph: '👽', logo: si(siReddit), hosts: ['reddit.com'] },
  { id: 'twitch', name: 'Twitch', color: '#9146ff', glyph: '⌁', logo: si(siTwitch), hosts: ['twitch.tv'] },
  { id: 'github', name: 'GitHub', color: '#24292f', glyph: '⌥', logo: si(siGithub), hosts: ['github.com'] },
  { id: 'snapchat', name: 'Snapchat', color: '#fffc00', glyph: '👻', logo: si(siSnapchat), hosts: ['snapchat.com'] },
  { id: 'pinterest', name: 'Pinterest', color: '#e60023', glyph: 'P', logo: si(siPinterest), hosts: ['pinterest.com'] },
  { id: 'dribbble', name: 'Dribbble', color: '#ea4c89', glyph: '⚽', logo: si(siDribbble), hosts: ['dribbble.com'] },
  { id: 'behance', name: 'Behance', color: '#1769ff', glyph: 'Bē', logo: si(siBehance), hosts: ['behance.net'] },
  { id: 'medium', name: 'Medium', color: '#000000', glyph: 'M', logo: si(siMedium), hosts: ['medium.com'] },
  { id: 'substack', name: 'Substack', color: '#ff6719', glyph: '✉', logo: si(siSubstack), hosts: ['substack.com'] },
  { id: 'spotify', name: 'Spotify', color: '#1db954', glyph: '♫', logo: si(siSpotify), hosts: ['spotify.com'] },
  { id: 'whatsapp', name: 'WhatsApp', color: '#25d366', glyph: '✆', logo: si(siWhatsapp), hosts: ['wa.me', 'whatsapp.com'] },
  { id: 'telegram', name: 'Telegram', color: '#26a5e4', glyph: '✈', logo: si(siTelegram), hosts: ['t.me', 'telegram.me'] },
];

const PAYMENT: (Brand & { hosts: string[] })[] = [
  { id: 'venmo', name: 'Venmo', color: 'linear-gradient(135deg,#3d95ce,#008cff)', glyph: 'V', logo: si(siVenmo), hosts: ['venmo.com'] },
  { id: 'paypal', name: 'PayPal', color: 'linear-gradient(135deg,#003087,#009cde)', glyph: 'P', logo: si(siPaypal), hosts: ['paypal.me', 'paypal.com'] },
  { id: 'cashapp', name: 'Cash App', color: 'linear-gradient(135deg,#00d632,#00b82b)', glyph: '$', logo: si(siCashapp), hosts: ['cash.app'] },
  { id: 'kofi', name: 'Ko-fi', color: 'linear-gradient(135deg,#29abe0,#13c3ff)', glyph: '☕', logo: si(siKofi), hosts: ['ko-fi.com'] },
  { id: 'buymeacoffee', name: 'Buy Me a Coffee', color: 'linear-gradient(135deg,#ffdd00,#ffb800)', glyph: '☕', logo: si(siBuymeacoffee), hosts: ['buymeacoffee.com'] },
  { id: 'github-sponsors', name: 'GitHub Sponsors', color: 'linear-gradient(135deg,#bf3989,#8250df)', glyph: '♥', logo: si(siGithubsponsors), hosts: ['github.com/sponsors'] },
  { id: 'patreon', name: 'Patreon', color: 'linear-gradient(135deg,#ff424d,#e0323c)', glyph: 'P', logo: si(siPatreon), hosts: ['patreon.com'] },
  { id: 'stripe', name: 'Stripe', color: 'linear-gradient(135deg,#635bff,#4f46e5)', glyph: 'S', logo: si(siStripe), hosts: ['buy.stripe.com', 'donate.stripe.com'] },
  { id: 'zelle', name: 'Zelle', color: 'linear-gradient(135deg,#6d1ed4,#5a13b3)', glyph: 'Z', logo: si(siZelle), hosts: ['zellepay.com', 'enroll.zellepay.com'] },
  { id: 'gofundme', name: 'GoFundMe', color: 'linear-gradient(135deg,#02a95c,#00864a)', glyph: '♥', logo: si(siGofundme), hosts: ['gofundme.com'] },
];

const OTHER: Brand = { id: 'other', name: 'Link', color: 'linear-gradient(135deg,#636366,#3a3a3c)', glyph: '🔗' };

function match(list: (Brand & { hosts: string[] })[], rawUrl: string): Brand | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const hostPath = `${host}${url.pathname.toLowerCase()}`;
  const found = list.find((b) => b.hosts.some((h) => (h.includes('/') ? hostPath.startsWith(h) : host === h || host.endsWith(`.${h}`))));
  if (!found) return null;
  const { hosts: _hosts, ...brand } = found;
  return brand;
}

export function socialBrand(url: string): Brand {
  if (/^https:\/\/[^/]*mastodon|^https:\/\/[^/]+\/@[\w.]+$/i.test(url) && !match(SOCIAL, url)) {
    return { id: 'mastodon', name: 'Mastodon', color: '#6364ff', glyph: '🐘', logo: si(siMastodon) };
  }
  return match(SOCIAL, url) ?? OTHER;
}

export function paymentBrand(url: string): Brand {
  return match(PAYMENT, url) ?? { ...OTHER, name: 'Donate', glyph: '♥' };
}

/** "@jordan" style handle from a profile URL, for the tile's second line. */
export function handleFromUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const first = url.pathname.split('/').filter(Boolean).at(-1) ?? '';
    if (!first) return url.hostname.replace(/^www\./, '');
    return first.startsWith('@') || first.startsWith('$') ? first : `@${first}`;
  } catch {
    return '';
  }
}

/** Visible, clickable phone numbers: keep digits and a leading +. */
export function telHref(number: string): string {
  const cleaned = number.trim().replace(/(?!^\+)[^\d]/g, '');
  return cleaned ? `tel:${cleaned}` : '';
}
