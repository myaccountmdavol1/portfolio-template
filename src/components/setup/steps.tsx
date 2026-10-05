'use client';

import { UserRound } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FontPicker } from '@/components/editor/FontPicker';
import { IconPackPicker } from '@/components/editor/IconPackPicker';
import { useUploader } from '@/components/editor/useUpload';
import { WallpaperChooser } from '@/components/editor/WallpaperChooser';
import type { EditorBackend } from '@/lib/editor/backend';
import { prepareImage } from '@/lib/editor/imageResize';
import { resolveSiteFonts } from '@/lib/fonts';
import { withName, withTitle, type WizardAnswers, type WizardStep } from '@/lib/setup/answers';
import { KEEP_CURRENT, KIT_WARNING, withKit, type KitQuestion } from '@/lib/setup/kit';
import type { ReviewRow } from '@/lib/setup/review';
import { CLASSIC_ID, STARTER_KITS } from '@/lib/starterKits';
import type { SiteData, SiteSettings, SiteStyle } from '@/lib/types';
import { CurrentSiteCard, KitCard } from './KitCard';
import { SetupPreview } from './SetupPreview';
import { outlineButton, primaryButton, quietButton, setupField, setupLabel } from './ui';

/** Changes the answers from the latest ones (an upload finishing later never overwrites newer typing). */
export type UpdateAnswers = (fn: (answers: WizardAnswers) => WizardAnswers) => void;

const hint = 'm-0 text-left text-xs text-[#6b675f]';

export function WelcomeStep({ offerKits }: { offerKits: boolean }) {
  return (
    <p className="m-0 text-sm leading-relaxed text-[#6b675f]">
      A few quick questions &mdash; {offerKits ? 'what describes you, ' : ''}your name, a photo, a headline, a wallpaper and a style &mdash; and your site is
      ready to share. You can change all of it later in the editor.
    </p>
  );
}

export function KitStep({
  answers,
  update,
  start,
  preview,
  question,
}: {
  answers: WizardAnswers;
  update: UpdateAnswers;
  start: SiteData;
  preview: SiteSettings;
  question: KitQuestion;
}) {
  const again = question === 'again';
  // No pick keeps the site as it is: on a first run that's the sample (Classic); on a re-run, the owner's own site.
  const picked = answers.kit ?? (again ? 'current' : CLASSIC_ID);
  return (
    <div className="flex flex-col gap-4 text-left">
      <SetupPreview site={preview} />
      <div role="radiogroup" aria-label="Starting point" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {again && <CurrentSiteCard site={start} name={KEEP_CURRENT} checked={picked === 'current'} onPick={() => update((a) => withKit(a, undefined, start))} />}
        {STARTER_KITS.map((kit) => (
          <KitCard
            key={kit.id}
            kit={kit}
            checked={picked === kit.id}
            warning={again ? KIT_WARNING : undefined}
            onPick={() => update((a) => withKit(a, kit.id, start, again))}
          />
        ))}
      </div>
      <p className={hint}>Each one starts your site with sample apps marked &ldquo;Replace me&rdquo;. You can change everything later in the editor.</p>
    </div>
  );
}

export function YouStep({ answers, update, site }: { answers: WizardAnswers; update: UpdateAnswers; site: SiteSettings }) {
  return (
    <div className="flex flex-col gap-3">
      <label className={setupLabel}>
        Your name
        <input
          value={answers.name}
          placeholder={site.ownerName}
          autoComplete="name"
          onChange={(e) => {
            const name = e.target.value;
            update((a) => withName(a, name));
          }}
          className={setupField}
        />
      </label>
      <label className={setupLabel}>
        Site title
        <input
          value={answers.title}
          placeholder={site.seo.title}
          onChange={(e) => {
            const title = e.target.value;
            update((a) => withTitle(a, title));
          }}
          className={setupField}
        />
      </label>
      <p className={hint}>The title shows in browser tabs and search results.</p>
    </div>
  );
}

export function PhotoStep({ answers, update, upload }: { answers: WizardAnswers; update: UpdateAnswers; upload: EditorBackend['upload'] }) {
  const uploader = useUploader(upload, 'images', (url) => update((a) => ({ ...a, photoUrl: url })), prepareImage);
  return (
    <div className="flex flex-col items-center gap-3">
      {answers.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- any uploaded URL, before it is published
        <img src={answers.photoUrl} alt="Your photo" className="h-32 w-32 rounded-full border border-black/10 object-cover" />
      ) : (
        <span aria-hidden className="flex h-32 w-32 items-center justify-center rounded-full bg-black/5 text-[#6b675f]">
          <UserRound size={56} />
        </span>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        <label className={`${outlineButton} has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#0a84ff]`}>
          {uploader.state === 'uploading' ? 'Uploading\u2026' : answers.photoUrl ? 'Choose another\u2026' : 'Choose a photo\u2026'}
          <input
            type="file"
            accept="image/*"
            aria-label="Upload your photo"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void uploader.upload(file);
            }}
          />
        </label>
        {answers.photoUrl && (
          <button type="button" onClick={() => update((a) => ({ ...a, photoUrl: '' }))} className={quietButton}>
            Remove
          </button>
        )}
      </div>
      {uploader.state === 'error' && (
        <p role="alert" className="m-0 text-center text-xs text-[#b3261e]">
          Upload failed.{' '}
          <button type="button" onClick={uploader.retry} className="cursor-pointer underline">
            Retry
          </button>{' '}
          &mdash; or skip this step and add a photo later.
        </p>
      )}
      <p className={`${hint} text-center`}>It goes in your About Me window. You can skip this step.</p>
    </div>
  );
}

export function HeadlineStep({ answers, update, site }: { answers: WizardAnswers; update: UpdateAnswers; site: SiteSettings }) {
  const field = (label: string, key: 'headline1' | 'headline2' | 'bio', placeholder: string) => (
    <label className={setupLabel}>
      {label}
      <input
        value={answers[key]}
        placeholder={placeholder}
        onChange={(e) => {
          const value = e.target.value;
          update((a) => ({ ...a, [key]: value, ...(key === 'bio' ? {} : { headlineEdited: true }) }));
        }}
        className={setupField}
      />
    </label>
  );
  return (
    <div className="flex flex-col gap-3">
      {field('Headline, first line', 'headline1', site.headline.line1)}
      {field('Headline, second line', 'headline2', site.headline.line2)}
      {field('One-line bio', 'bio', site.seo.description)}
      <p className={hint}>The headline is the big text on your desktop. The bio goes in your About Me window and in search results.</p>
    </div>
  );
}

export function WallpaperStep({
  answers,
  update,
  site,
  upload,
  preview,
}: {
  answers: WizardAnswers;
  update: UpdateAnswers;
  site: SiteSettings;
  upload: EditorBackend['upload'];
  /** The site with every answer so far. */
  preview: SiteSettings;
}) {
  return (
    <div className="flex flex-col gap-4 text-left">
      <SetupPreview site={preview} />
      <WallpaperChooser current={answers.wallpaper ?? site.wallpaper} upload={upload} onPick={(wallpaper) => update((a) => ({ ...a, wallpaper }))} />
    </div>
  );
}

export function StyleStep({ update, preview }: { update: UpdateAnswers; preview: SiteSettings }) {
  const { heading, body } = resolveSiteFonts(preview);
  const pick = (patch: SiteStyle) => update((a) => ({ ...a, style: { ...a.style, ...patch } }));
  return (
    <div className="flex flex-col gap-4 text-left">
      <SetupPreview site={preview} />
      <div className="grid gap-3 sm:grid-cols-2">
        <FontPicker label="Headline font" value={heading.id} onChange={(headingFont) => pick({ headingFont })} />
        <FontPicker label="Body font" value={body.id} onChange={(bodyFont) => pick({ bodyFont })} />
      </div>
      <IconPackPicker value={preview.style?.iconPack} onChange={(iconPack) => pick({ iconPack })} />
    </div>
  );
}

export function ReviewStep({ rows, onEdit }: { rows: ReviewRow[]; onEdit: (step: WizardStep) => void }) {
  return (
    <dl className="m-0 divide-y divide-black/10 rounded-xl border border-black/10 bg-white">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3 px-3 py-2.5 text-left text-sm">
          <dt className="w-24 flex-none text-xs font-medium text-[#6b675f]">{row.label}</dt>
          <dd className="m-0 flex min-w-0 flex-1 items-center gap-3">
            <span className="min-w-0 flex-1">
              <span title={row.value} className="block truncate">
                {row.value}
              </span>
              {row.warning && <span className="block text-xs font-medium text-[#b3261e]">{row.warning}</span>}
            </span>
            <button
              type="button"
              aria-label={`Edit ${row.label}`}
              onClick={() => onEdit(row.step)}
              className="cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium text-[#0a84ff] hover:bg-black/5"
            >
              Edit
            </button>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** `tour`: Start editing shows the editor tour (the first run); a re-run from the editor goes straight back to it. */
export function LiveStep({ url, tour }: { url: string; tour: boolean }) {
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  // The confirmation fades back to idle; the timer is cleared on unmount.
  useEffect(() => {
    if (copied !== 'copied') return;
    const t = setTimeout(() => setCopied('idle'), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
  }
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="m-0 text-sm text-[#6b675f]">Everyone can see it now at</p>
      <a href={url} target="_blank" rel="noreferrer" className="break-all text-lg font-medium text-[#0a84ff] underline-offset-2 hover:underline">
        {url.replace(/^https?:\/\//, '')}
      </a>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => void copy()} className={outlineButton}>
          Copy link
        </button>
        <Link href={tour ? '/?edit=1&welcome=1' : '/?edit=1'} className={primaryButton}>
          Start editing
        </Link>
      </div>
      <p className="m-0 mt-1 max-w-sm text-xs text-[#6b675f]">Want a chat assistant or Now Playing? Turn them on in Site settings &rarr; Add-ons.</p>
      <p aria-live="polite" className={copied === 'copied' ? 'm-0 text-xs text-[#6b675f]' : 'sr-only'}>
        {copied === 'copied' ? 'Copied \u2713' : ''}
      </p>
      {copied === 'failed' && (
        <p role="alert" className="m-0 text-xs text-[#b3261e]">
          Couldn&rsquo;t copy. Select the link above instead.
        </p>
      )}
    </div>
  );
}
