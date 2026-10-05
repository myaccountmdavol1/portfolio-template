'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createHttpBackend, SignedOutError } from '@/lib/editor/httpBackend';
import { clearUnsavedMirror, readUnsavedMirror } from '@/lib/editor/unsavedMirror';
import {
  clearSavedWizard,
  initialAnswers,
  loadSavedWizard,
  nextStep,
  previousStep,
  PROGRESS_STEPS,
  resumeAnswers,
  resumeStep,
  saveWizard,
  STEP_TITLES,
  type SavedWizard,
  type WizardAnswers,
  type WizardStep,
} from '@/lib/setup/answers';
import { applyWizardAnswers } from '@/lib/setup/applyAnswers';
import { finishSetup, publishWizard } from '@/lib/setup/publish';
import { reviewRows } from '@/lib/setup/review';
import type { SiteData } from '@/lib/types';
import { HeadlineStep, LiveStep, PhotoStep, ReviewStep, StyleStep, WallpaperStep, WelcomeStep, YouStep } from './steps';
import { primaryButton, quietButton } from './ui';

// A session that ends mid-wizard: sign in again. The answers stay in this browser and resume after.
// A full reload on purpose: the session ended, so the whole app starts again at /admin.
// eslint-disable-next-line @next/next/no-location-assign-relative-destination
const toSignIn = () => window.location.assign('/admin?expired=1');

export interface SetupWizardProps {
  /** The live site: where the wizard starts when there is no draft. */
  published: SiteData;
  /** How uploads are stored on this site (GET /api/owner/session's `media`). */
  media: 'blob' | 'blob-presigned' | 'disk' | null;
}

function Card({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#ebe7df] p-4 text-[#1d1c1a] sm:p-6">
      <div className="w-full max-w-xl rounded-2xl bg-[#fbfaf7] p-6 shadow-[0_20px_50px_rgba(0,0,0,.12)] sm:p-8">{children}</div>
    </main>
  );
}

function Progress({ step }: { step: WizardStep }) {
  const current = PROGRESS_STEPS.findIndex((p) => p.step === step);
  if (current < 0) return null;
  return (
    <>
      <ol aria-label="Setup progress" className="m-0 mb-5 flex list-none gap-1.5 p-0">
        {PROGRESS_STEPS.map((p, i) => (
          <li
            key={p.step}
            aria-label={p.label}
            aria-current={i === current ? 'step' : undefined}
            className={`h-1.5 flex-1 rounded-full ${i <= current ? 'bg-[#1d1c1a]' : 'bg-black/10'}`}
          />
        ))}
      </ol>
      <p className="sr-only">
        Step {current + 1} of {PROGRESS_STEPS.length}
      </p>
    </>
  );
}

/** /setup: a few friendly questions for a new owner, then publish. Everything stays editable in the editor. */
export function SetupWizard({ published, media }: SetupWizardProps) {
  const backend = useMemo(() => createHttpBackend({ media, onUnauthorized: toSignIn }), [media]);
  const [start, setStart] = useState<SiteData | null>(null);
  const [wizard, setWizard] = useState<SavedWizard | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [fromReview, setFromReview] = useState(false);
  const [publishFailed, setPublishFailed] = useState(false);
  // Set when the site was published but marking setup as finished failed.
  const [finishFailed, setFinishFailed] = useState(false);
  const [siteUrl, setSiteUrl] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let live = true;
    backend.loadDraft().then(
      (draft) => {
        if (!live) return;
        // Unsaved editor edits, else the saved draft, else the live site: a half-edited draft is never thrown away.
        const data = readUnsavedMirror(window.localStorage, 'http') ?? draft ?? published;
        const saved = loadSavedWizard(window.localStorage);
        setStart(data);
        setWizard(saved ? { step: resumeStep(saved.step), answers: resumeAnswers(saved.answers, data) } : { step: 'welcome', answers: initialAnswers(data) });
        setSiteUrl(window.location.origin);
      },
      (err) => {
        if (!live || err instanceof SignedOutError) return; // signed out: already on the way to /admin
        console.error('Could not load the draft', err);
        setLoadFailed(true);
      },
    );
    return () => {
      live = false;
    };
  }, [backend, published, attempt]);

  // Kept in this browser once the owner has started, so leaving and coming back resumes; cleared when it's finished.
  useEffect(() => {
    if (wizard && wizard.step !== 'welcome' && wizard.step !== 'live') saveWizard(window.localStorage, wizard);
  }, [wizard]);

  // Each new step is announced: focus its heading.
  const step = wizard?.step;
  useEffect(() => {
    if (step && step !== 'welcome') heading.current?.focus();
  }, [step]);

  const update = useCallback((fn: (answers: WizardAnswers) => WizardAnswers) => setWizard((w) => w && { ...w, answers: fn(w.answers) }), []);
  // Any move resets "back to review"; only Edit on the review step sets it again, after moving.
  const go = (next: WizardStep) => {
    setFromReview(false);
    setWizard((w) => w && { ...w, step: next });
  };

  async function publish(data: SiteData) {
    go('publish');
    setPublishFailed(false);
    setFinishFailed(false);
    let published = false;
    try {
      await publishWizard(
        backend,
        data,
        async () => {
          published = true;
          await finishSetup({ onUnauthorized: toSignIn });
        },
        // The draft now holds these answers; a leftover unsaved mirror would shadow it.
        () => clearUnsavedMirror(window.localStorage, 'http'),
      );
      clearSavedWizard(window.localStorage);
      clearUnsavedMirror(window.localStorage, 'http');
      go('live');
    } catch (err) {
      if (err instanceof SignedOutError) return;
      console.error('Publish failed', err);
      setFinishFailed(published);
      setPublishFailed(true);
    }
  }

  if (!start || !wizard) {
    return (
      <Card>
        {loadFailed ? (
          <div className="flex flex-col items-center gap-3">
            <p role="alert" className="m-0 text-sm text-[#b3261e]">
              Couldn&rsquo;t load your site.
            </p>
            <button
              type="button"
              onClick={() => {
                setLoadFailed(false);
                setAttempt((a) => a + 1);
              }}
              className={quietButton}
            >
              Try again
            </button>
          </div>
        ) : (
          <p role="status" className="m-0 text-sm text-[#6b675f]">
            Loading your site&hellip;
          </p>
        )}
      </Card>
    );
  }

  const { answers } = wizard;
  const current = wizard.step;
  const applied = applyWizardAnswers(start, answers);
  const question = current !== 'welcome' && current !== 'review' && current !== 'publish' && current !== 'live';
  const title = current === 'publish' && publishFailed ? (finishFailed ? 'Almost done' : 'Couldn\u2019t publish') : STEP_TITLES[current];
  const skip = (
    <Link href="/?edit=1" className={quietButton}>
      Skip for now
    </Link>
  );
  const next = () => {
    if (!fromReview) return go(nextStep(current));
    go('review');
  };

  let body: ReactNode = null;
  switch (current) {
    case 'welcome':
      body = <WelcomeStep />;
      break;
    case 'you':
      body = <YouStep answers={answers} update={update} site={start.site} />;
      break;
    case 'photo':
      body = <PhotoStep answers={answers} update={update} upload={backend.upload} />;
      break;
    case 'headline':
      body = <HeadlineStep answers={answers} update={update} site={start.site} />;
      break;
    case 'wallpaper':
      body = <WallpaperStep answers={answers} update={update} site={start.site} upload={backend.upload} preview={applied.site} />;
      break;
    case 'style':
      body = <StyleStep update={update} preview={applied.site} />;
      break;
    case 'review':
      body = (
        <ReviewStep
          rows={reviewRows(applied, answers)}
          onEdit={(target) => {
            go(target);
            setFromReview(true);
          }}
        />
      );
      break;
    case 'publish':
      body = publishFailed ? (
        <p role="alert" className="m-0 text-sm text-[#b3261e]">
          {finishFailed
            ? 'Your site is live, but we couldn\u2019t mark setup as finished. Try again.'
            : 'Your site wasn\u2019t published. Your answers are saved in this browser \u2014 try again in a moment.'}
        </p>
      ) : (
        <p role="status" className="m-0 text-sm text-[#6b675f]">
          Saving and publishing your site&hellip;
        </p>
      );
      break;
    case 'live':
      body = <LiveStep url={siteUrl} />;
      break;
  }

  return (
    <Card>
      <Progress step={current} />
      <h1 ref={heading} tabIndex={-1} className={`m-0 font-serif text-3xl font-normal outline-none sm:text-4xl ${current === 'live' ? 'text-center' : ''}`}>
        {title}
      </h1>
      <div className="mt-4">{body}</div>

      {current === 'welcome' && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          {skip}
          <button type="button" onClick={() => go('you')} className={primaryButton}>
            Let&rsquo;s go
          </button>
        </div>
      )}

      {question && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => go(previousStep(current))} className={quietButton}>
            Back
          </button>
          <div className="flex flex-wrap gap-2">
            {skip}
            <button type="button" onClick={next} className={primaryButton}>
              {fromReview ? 'Back to review' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {current === 'review' && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => go(previousStep(current))} className={quietButton}>
            Back
          </button>
          <div className="flex flex-wrap gap-2">
            {skip}
            <button type="button" onClick={() => void publish(applied)} className={primaryButton}>
              Publish
            </button>
          </div>
        </div>
      )}

      {current === 'publish' && publishFailed && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => go('review')} className={quietButton}>
            Back to review
          </button>
          <button type="button" onClick={() => void publish(applied)} className={primaryButton}>
            Try again
          </button>
        </div>
      )}
    </Card>
  );
}
