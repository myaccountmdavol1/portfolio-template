'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import {
  ANTHROPIC_KEYS_URL,
  chatStatusLine,
  hostingLine,
  SETUP_CODE_NEEDED,
  SPOTIFY_DASHBOARD_URL,
  spotifyStatusLine,
} from '@/lib/addons/copy';
import type { AddonsResponse } from '@/lib/addons/types';
import { useEditor } from '../EditorContext';
import { inputClass, Section, smallButton } from '../fields';
import type { AddonsApi } from '../useAddons';

const help = 'm-0 text-[11px] leading-snug text-[#6b675f]';
const link = 'text-[#0a84ff] underline';

/** Site settings, Add-ons: Claude chat and Spotify Now Playing. A saved key is never shown again. */
export function AddonsSection() {
  const addons = useEditor()?.addons;
  if (!addons) return null;
  return (
    <Section title="Add-ons">
      <p className={help}>Optional extras. Each key is checked when you save it and kept on your site&rsquo;s server only &mdash; never in your published site.</p>
      {!addons.editable ? (
        <HostingOnly addons={addons} />
      ) : addons.status ? (
        <>
          {!addons.status.canStore && !(addons.status.chat.state === 'env' && addons.status.spotify.state === 'env') && <p className="m-0 text-[11px] leading-snug text-[#b3261e]">{SETUP_CODE_NEEDED}</p>}
          <ChatCard addons={addons} status={addons.status} />
          <SpotifyCard addons={addons} status={addons.status} />
        </>
      ) : addons.loadError ? (
        <div className="flex items-center gap-2">
          <p role="alert" className="m-0 flex-1 text-[11px] text-[#b3261e]">
            {addons.loadError}
          </p>
          <button type="button" onClick={addons.reload} className={smallButton}>
            Retry
          </button>
        </div>
      ) : (
        <p className={help}>Loading&hellip;</p>
      )}
    </Section>
  );
}

function Card({ title, status, children }: { title: string; status: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={title} className="flex flex-col gap-2 rounded-md border border-black/10 bg-white/60 p-2.5">
      <span className="text-xs font-semibold text-[#3d3a35]">{title}</span>
      <p data-testid="addon-status" role="status" className="m-0 text-[11px] font-medium text-[#3d3a35]">
        {status}
      </p>
      {children}
    </div>
  );
}

function SecretInput({ label, name, value, onChange, secret = true }: { label: string; name: string; value: string; onChange: (v: string) => void; secret?: boolean }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-[#3d3a35]">
        {label}
      </label>
      <input
        id={id}
        type={secret ? 'password' : 'text'}
        value={value}
        name={name}
        autoComplete={secret ? 'new-password' : 'off'}
        data-1p-ignore
        data-lpignore="true"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

/** Save and Remove share one busy flag and one error line per card. */
function useAction(addons: AddonsApi) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function act(fn: Parameters<AddonsApi['run']>[0]): Promise<boolean> {
    setBusy(true);
    setError(null);
    const failed = await addons.run(fn);
    setBusy(false);
    setError(failed);
    return failed === null;
  }
  return { busy, error, act };
}

function ErrorLine({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="m-0 text-[11px] text-[#b3261e]">
      {error}
    </p>
  ) : null;
}

function ChatCard({ addons, status }: { addons: AddonsApi; status: AddonsResponse }) {
  const [key, setKey] = useState('');
  const { busy, error, act } = useAction(addons);
  const { state } = status.chat;
  return (
    <Card title="Claude chat" status={chatStatusLine(status.chat)}>
      <p className={help}>Lets visitors ask your Messages apps about your work. Until it&rsquo;s connected, Messages apps are hidden from visitors.</p>
      {state !== 'env' && (
        <>
          <ol className={`${help} m-0 list-decimal pl-4`}>
            <li>
              Get a key at{' '}
              <a href={ANTHROPIC_KEYS_URL} target="_blank" rel="noopener noreferrer" className={link}>
                console.anthropic.com &rarr; API keys
              </a>
              .
            </li>
            <li>Paste it here and check it.</li>
          </ol>
          <SecretInput label="Claude API key" name="claude-api-key" value={key} onChange={setKey} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !key.trim() || !status.canStore}
              onClick={() => void act((c) => c.saveChat(key)).then((ok) => ok && setKey(''))}
              className={smallButton}
            >
              {busy ? 'Checking\u2026' : 'Check & save'}
            </button>
            {(state === 'on' || state === 'reenter') && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm('Remove your Claude key? Messages apps are hidden from visitors until you add one again.')) void act((c) => c.remove('chat'));
                }}
                className={smallButton}
              >
                Remove
              </button>
            )}
          </div>
        </>
      )}
      <ErrorLine error={error} />
    </Card>
  );
}

function SpotifyCard({ addons, status }: { addons: AddonsApi; status: AddonsResponse }) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [copied, setCopied] = useState<'ok' | 'failed' | null>(null);
  const { busy, error, act } = useAction(addons);
  const { state } = status.spotify;
  // The confirmation fades back; the timer is cleared on unmount.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  const canConnect = state === 'credentials' || state === 'connected' || state === 'env';
  return (
    <Card title="Spotify Now Playing" status={spotifyStatusLine(status.spotify)}>
      <p className={help}>Shows what you&rsquo;re listening to in Control Center. Spotify asks you to reconnect about every 6 months.</p>
      {state !== 'env' && (
        <>
          <ol className={`${help} m-0 list-decimal pl-4`}>
            <li>
              Create an app at{' '}
              <a href={SPOTIFY_DASHBOARD_URL} target="_blank" rel="noopener noreferrer" className={link}>
                developer.spotify.com
              </a>{' '}
              and add this redirect URI:
            </li>
          </ol>
          <div className="flex items-center gap-2">
            <code data-testid="spotify-redirect-uri" className="min-w-0 flex-1 truncate rounded bg-black/5 px-1.5 py-1 text-[11px]">
              {status.redirectUri}
            </code>
            <button
              type="button"
              aria-label={'Copy redirect URI'}
              onClick={() => {
                if (!navigator.clipboard) return setCopied('failed');
                void navigator.clipboard.writeText(status.redirectUri).then(() => setCopied('ok'), () => setCopied('failed'));
              }}
              className={smallButton}
            >
              {copied === 'ok' ? 'Copied \u2713' : 'Copy'}
            </button>
            <span role="status" className={copied === 'failed' ? 'text-[11px] text-[#b3261e]' : 'sr-only'}>
              {copied === 'ok' ? 'Copied' : copied === 'failed' ? 'Couldn\u2019t copy \u2014 select it and copy by hand.' : ''}
            </span>
          </div>
          <SecretInput label="Client ID" name="spotify-client-id" value={clientId} onChange={setClientId} secret={false} />
          <SecretInput label="Client secret" name="spotify-client-secret" value={clientSecret} onChange={setClientSecret} />
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {state !== 'env' && (
          <button
            type="button"
            disabled={busy || !clientId.trim() || !clientSecret.trim() || !status.canStore}
            onClick={() =>
              void act((c) => c.saveSpotify(clientId, clientSecret)).then((ok) => {
                if (!ok) return;
                setClientId('');
                setClientSecret('');
              })
            }
            className={smallButton}
          >
            {busy ? 'Checking\u2026' : 'Check & save'}
          </button>
        )}
        {canConnect && (
          <a href="/api/spotify/login" target="_blank" rel="noopener noreferrer" className={smallButton}>
            {status.spotify.connected ? 'Reconnect Spotify \u2197' : 'Connect Spotify \u2197'}
          </a>
        )}
        {state !== 'env' && state !== 'off' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Remove your Spotify keys? Now Playing disappears until you set it up again.')) void act((c) => c.remove('spotify'));
            }}
            className={smallButton}
          >
            Remove
          </button>
        )}
      </div>
      <ErrorLine error={error} />
      {canConnect && !status.spotify.connected && (
        <button type="button" onClick={addons.reload} className={`${smallButton} self-start`}>
          I&rsquo;ve connected &mdash; refresh
        </button>
      )}
    </Card>
  );
}

/** Firebase sites and local mode: keys come from the hosting's variables only. */
function HostingOnly({ addons }: { addons: AddonsApi }) {
  return (
    <>
      <Card title="Claude chat" status={hostingLine(addons.hosting, 'chat')}>
        <p className={help}>Lets visitors ask your Messages apps about your work. Until it&rsquo;s set, Messages apps are hidden from visitors.</p>
      </Card>
      <Card title="Spotify Now Playing" status={hostingLine(addons.hosting, 'spotify')}>
        {addons.hosting.spotify && (
          <a href="/api/spotify/login" target="_blank" rel="noopener noreferrer" className={`${smallButton} self-start`}>
            Connect Spotify &#8599;
          </a>
        )}
        <p className={help}>Spotify asks you to reconnect about every 6 months &mdash; use the same button.</p>
        <p className={help}>
          In the Spotify dashboard, the app&rsquo;s redirect URI is:{' '}
          <code data-testid="spotify-redirect-uri" className="break-all rounded bg-black/5 px-1.5 py-1 text-[11px]">
            {`${window.location.origin}/api/spotify/callback`}
          </code>
        </p>
      </Card>
    </>
  );
}
