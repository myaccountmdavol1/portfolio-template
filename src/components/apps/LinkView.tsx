import { detectEmbed, type EmbedInfo } from '@/lib/embed';
import type { LinkApp } from '@/lib/types';

const SERVICE_NAME: Partial<Record<EmbedInfo['kind'], string>> = {
  canva: 'Canva',
  'google-slides': 'Google Slides',
  youtube: 'YouTube',
  spotify: 'Spotify',
};

export function LinkView({ app }: { app: LinkApp }) {
  const { url, mode } = app.content;
  const hasUrl = /^https?:\/\/./.test(url) && url !== 'https://example.com/';
  const embed = detectEmbed(url);
  const service = SERVICE_NAME[embed.kind];
  // Slides, Canva designs, and videos are 16:9; Spotify and other pages fill the space they're given.
  const widescreen = embed.kind === 'youtube' || embed.kind === 'google-slides' || embed.kind === 'canva';

  if (mode === 'embed' && !hasUrl) {
    return <p className="m-0 p-10 text-center text-sm text-[#6e6e73]">Nothing to show yet — add a public share link in the editor.</p>;
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {mode === 'embed' &&
        (widescreen ? (
          <div className="relative w-full overflow-hidden rounded-lg bg-black/5" style={{ aspectRatio: '16 / 9' }}>
            <iframe
              src={embed.embedUrl}
              title={app.title}
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        ) : (
          <iframe
            src={embed.embedUrl}
            title={app.title}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            // Grows to fill the window or phone sheet (a taller Spotify player lists more tracks).
            className="w-full flex-1 rounded-lg border-0"
            style={{ minHeight: embed.kind === 'spotify' ? 352 : '65vh' }}
          />
        ))}
      <a href={url} target="_blank" rel="noopener noreferrer" className="self-start text-[13px] font-medium text-[#0a84ff] hover:underline">
        {service ? `Open in ${service} ↗` : 'Open in a new tab ↗'}
      </a>
    </div>
  );
}
