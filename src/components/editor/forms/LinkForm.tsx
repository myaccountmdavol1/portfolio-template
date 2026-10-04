'use client';

import { updateApp } from '@/lib/editor/mutations';
import { detectEmbed } from '@/lib/embed';
import type { CatalogIconSlug } from '@/lib/types';
import { useEditor } from '../EditorContext';
import type { EmbedKind, LinkApp } from '@/lib/types';
import { Section, SelectField, smallButton, TextField } from '../fields';

// Links to these services can use the service's own icon with one click.
const SERVICE_ICON: Partial<Record<EmbedKind, { slug: CatalogIconSlug; name: string }>> = {
  spotify: { slug: 'spotify', name: 'Spotify' },
  canva: { slug: 'canva', name: 'Canva' },
  'google-slides': { slug: 'google-slides', name: 'Google Slides' },
};

// Services that can't be embedded, recognised by their web address instead.
const HOST_ICON: [RegExp, { slug: CatalogIconSlug; name: string }][] = [[/(^|\.)netflix\.com$/i, { slug: 'netflix', name: 'Netflix' }]];

function suggestedIcon(url: string): { slug: CatalogIconSlug; name: string } | undefined {
  const byEmbed = SERVICE_ICON[detectEmbed(url).kind];
  if (byEmbed) return byEmbed;
  try {
    const host = new URL(url).hostname;
    return HOST_ICON.find(([pattern]) => pattern.test(host))?.[1];
  } catch {
    return undefined;
  }
}
import { useContentEditor } from './useContentEditor';

const EMBED_NAMES: Record<EmbedKind, string> = {
  spotify: 'Spotify player',
  youtube: 'YouTube video',
  'google-slides': 'Google Slides presentation',
  canva: 'Canva design',
  'generic-iframe': 'Web page (some sites refuse to be embedded)',
};

/** Where to find the right link, per service — the most common reason an embed stays blank. */
/** `hint` comes from the app's icon, so a fresh Canva/Slides preset shows its instructions before any link is pasted. */
function Help({ url, hint }: { url: string; hint?: string }) {
  const kind = detectEmbed(url).kind;
  const box = 'm-0 rounded-md border border-black/10 bg-white p-2.5 text-[11px] leading-relaxed text-[#3d3a35]';
  if (kind === 'canva' || /canva\.(com|link)/i.test(url) || (!url && hint === 'canva')) {
    return (
      <div className={box}>
        <strong>Canva:</strong> open your design → <strong>Share</strong> → <strong>More</strong> → <strong>Embed</strong> → copy the <strong>Smart embed link</strong> and paste it above. (Turning on Embed makes the design viewable by anyone with the link.)
        {/\/edit/.test(url) && <span className="mt-1 block text-[#b3261e]">This looks like your private editing link — visitors won’t be able to see it. Use the Smart embed link instead.</span>}
        {/canva\.link/i.test(url) && <span className="mt-1 block text-[#b3261e]">Short canva.link links can’t be embedded — use the Smart embed link from Share → Embed.</span>}
      </div>
    );
  }
  if (kind === 'google-slides' || /docs\.google\.com\/presentation/i.test(url) || (!url && hint === 'google-slides')) {
    return (
      <div className={box}>
        <strong>Google Slides:</strong> either <strong>File → Share → Publish to web</strong> (best — always works) and copy the link, or <strong>Share</strong> → set General access to <strong>Anyone with the link</strong> and copy that link.
      </div>
    );
  }
  return null;
}

export function LinkForm({ app }: { app: LinkApp }) {
  const { set } = useContentEditor(app);
  const editor = useEditor();
  const c = app.content;
  const suggested = c.url ? suggestedIcon(c.url) : undefined;
  const usingIt = app.icon.kind === 'catalog' && app.icon.slug === suggested?.slug;
  return (
    <Section title="Link">
      <TextField label="URL" type="url" value={c.url} placeholder="Paste a public share link" onChange={(v) => set('url', v)} />
      <Help url={c.url} hint={app.icon.kind === 'catalog' ? app.icon.slug : undefined} />
      {suggested && !usingIt && (
        <button
          type="button"
          onClick={() => editor?.apply((d) => updateApp(d, app.id, { icon: { kind: 'catalog', slug: suggested.slug } }))}
          className={`${smallButton} self-start`}
        >
          Use the {suggested.name} icon
        </button>
      )}
      <SelectField
        label="When opened"
        value={c.mode}
        options={[
          { value: 'open', label: 'Open in a new tab' },
          { value: 'embed', label: 'Show inside a window' },
        ]}
        onChange={(mode) => set('mode', mode, true)}
      />
      {c.mode === 'embed' && c.url && <p className="m-0 text-xs text-[#6b675f]">Detected: {EMBED_NAMES[detectEmbed(c.url).kind]}</p>}
    </Section>
  );
}
