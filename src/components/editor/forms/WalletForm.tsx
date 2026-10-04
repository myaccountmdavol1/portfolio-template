'use client';

import { useState } from 'react';
import { badgeLinkKind, mergePasses } from '@/lib/badges';
import { paymentBrand } from '@/lib/brands';
import { passColorFromImage, passColorFromUrl } from '@/lib/tone';
import type { BadgePass, WalletApp } from '@/lib/types';
import { useEditor } from '../EditorContext';
import { ColorField, ListEditor, Section, SelectField, smallButton, TextField, Toggle, UploadField } from '../fields';
import { useContentEditor } from './useContentEditor';

const newPass = (): BadgePass => ({ id: `pass-${Date.now().toString(36)}`, title: 'New badge', issuer: '' });

export function WalletForm({ app }: { app: WalletApp }) {
  const { set } = useContentEditor(app);
  const c = app.content;
  const passes = c.passes ?? [];
  return (
    <>
      <Section title="Wallet">
        <p className="m-0 text-[11px] leading-snug text-[#6b675f]">
          Your badges, microcredentials, and certificates as Apple Wallet passes. Rename the app with <strong>Name</strong> above (e.g. “Badges” or “Credentials”).
        </p>
        <TextField label="Heading" value={c.heading} onChange={(v) => set('heading', v)} />
        <TextField label="Message" multiline value={c.message} onChange={(v) => set('message', v)} />
        <SelectField
          label="Visitors first see"
          value={c.view ?? 'stack'}
          options={[
            { value: 'stack', label: 'The Wallet (stacked passes)' },
            { value: 'shelf', label: 'The shelf (a grid of badges)' },
            { value: 'timeline', label: 'The timeline (by year)' },
          ]}
          onChange={(view) => set('view', view, true)}
        />
        <Toggle label="Show as a widget (your newest badges)" checked={!!c.showAsWidget} onChange={(on) => set('showAsWidget', on, true)} />
      </Section>

      <CredlyImport passes={passes} onImport={(next) => set('passes', next, true)} />

      <Section title={`Badges (${passes.length})`}>
        <ListEditor<BadgePass>
          label="Badges"
          items={passes}
          onChange={(items, s) => set('passes', items, s)}
          create={newPass}
          itemTitle={(p) => `${p.title || 'Untitled'}${p.issuer ? ` — ${p.issuer}` : ''}`}
          addLabel="Add a badge"
          render={(p, update) => (
            <>
              <TextField label="Title" value={p.title} onChange={(title) => update({ ...p, title })} />
              <TextField label="Issued by" value={p.issuer} placeholder="Google for Education" onChange={(issuer) => update({ ...p, issuer })} />
              <TextField label="Group (optional)" value={p.category ?? ''} placeholder="Defaults to the issuer" onChange={(category) => update({ ...p, category: category || undefined })} hint="Badges with the same group share a filter chip, e.g. “AI & Tech” or “Leadership”." />
              <UploadField
                label="Badge image"
                value={p.imageUrl ?? ''}
                onChange={(url, file) => {
                  if (!url || !file) return update({ ...p, imageUrl: url || undefined });
                  // A new upload: colour the pass from the badge art.
                  void passColorFromImage(file).then((color) => update({ ...p, imageUrl: url, color: color ?? p.color }));
                }}
              />
              <UploadField label="Certificate (PDF)" folder="docs" accept="application/pdf" value={p.certificateUrl ?? ''} onChange={(url) => update({ ...p, certificateUrl: url || undefined })} />
              <TextField label="Verify link (optional)" type="url" value={p.verifyUrl ?? ''} placeholder="https://www.credly.com/badges/…" onChange={(verifyUrl) => update({ ...p, verifyUrl: verifyUrl || undefined })} hint="Where anyone can check it's real. Shows a Verify button and a QR code." />
              <TextField label="Earned" type="date" value={p.earned ?? ''} onChange={(earned) => update({ ...p, earned: earned || undefined })} />
              <TextField label="Expires (optional)" type="date" value={p.expires ?? ''} onChange={(expires) => update({ ...p, expires: expires || undefined })} />
              <TextField label="Description" multiline value={p.description ?? ''} onChange={(description) => update({ ...p, description: description || undefined })} />
              <TextField
                label="Skills (comma-separated)"
                value={(p.skills ?? []).join(', ')}
                onChange={(v) => {
                  const skills = v.split(',').map((s) => s.trim()).filter(Boolean);
                  update({ ...p, skills: skills.length ? skills : undefined });
                }}
              />
              <TextField label="Level (optional)" value={p.level ?? ''} placeholder="Advanced" onChange={(level) => update({ ...p, level: level || undefined })} />
              <TextField label="Credential ID (optional)" value={p.credentialId ?? ''} onChange={(credentialId) => update({ ...p, credentialId: credentialId || undefined })} />
              <UploadField label="Issuer logo (optional)" value={p.issuerLogoUrl ?? ''} onChange={(url) => update({ ...p, issuerLogoUrl: url || undefined })} />
              <ColorField label="Pass colour (optional)" value={p.color ?? '#0a84ff'} onChange={(color) => update({ ...p, color })} />
              {p.color && (
                <button type="button" onClick={() => update({ ...p, color: undefined })} className={`${smallButton} self-start`}>
                  Use the issuer’s colour
                </button>
              )}
            </>
          )}
        />
      </Section>

      <Section title="Support cards (optional)">
        <p className="m-0 text-[11px] text-[#6b675f]">Tip or donation links, shown under your badges. Leave empty to hide.</p>
        <TextField label="Heading" value={c.cardsHeading ?? ''} placeholder="Support my work" onChange={(v) => set('cardsHeading', v || undefined)} />
        <ListEditor
          label="Cards"
          items={c.cards}
          onChange={(items, s) => set('cards', items, s)}
          create={() => ({ label: '', url: 'https://' })}
          itemTitle={(card) => `${paymentBrand(card.url).name}${card.label ? ` — ${card.label}` : ''}`}
          addLabel="Add card"
          render={(card, update) => (
            <>
              <TextField
                label="Payment link"
                type="url"
                value={card.url}
                onChange={(url) => update({ ...card, url })}
                hint="Venmo, PayPal.me, Cash App, Ko-fi, Buy Me a Coffee, GitHub Sponsors, Patreon, Stripe, GoFundMe… it’s recognised automatically."
              />
              <TextField label="Card text (optional)" value={card.label} placeholder="Buy me a coffee" onChange={(label) => update({ ...card, label })} />
            </>
          )}
        />
      </Section>
    </>
  );
}

/** Paste a badge or certificate link — Credly profiles bring every badge; Accredible, Parchment, Skilljar, and Skillshop links bring one. */
const SOURCE_NAMES = { 'credly-profile': 'Credly', accredible: 'Accredible', openbadge: 'Parchment', skilljar: 'Skilljar', skillshop: 'Skillshop', canva: 'Canva' } as const;

function CredlyImport({ passes, onImport }: { passes: BadgePass[]; onImport: (next: BadgePass[]) => void }) {
  const editor = useEditor();
  const [profile, setProfile] = useState('');
  const [state, setState] = useState<{ kind: 'idle' | 'loading' } | { kind: 'done' | 'error'; message: string }>({ kind: 'idle' });

  async function run() {
    const kind = badgeLinkKind(profile);
    if (!kind) {
      setState({ kind: 'error', message: 'That link isn’t one we can read yet. Download the badge or certificate and drag it onto your Badges window.' });
      return;
    }
    setState({ kind: 'loading' });
    try {
      const res = await fetch(kind === 'credly-profile' ? `/api/credly?${new URLSearchParams({ profile })}` : `/api/badge-link?${new URLSearchParams({ url: profile.trim() })}`);
      const body = (await res.json()) as { passes?: BadgePass[]; copyImage?: boolean; error?: string };
      if (!res.ok || !body.passes) throw new Error(body.error ?? 'Import failed.');
      // Some sites' image links expire: keep a copy in your own storage.
      if (body.copyImage && editor) body.passes = await Promise.all(body.passes.map((p) => keepImage(p, editor.upload)));
      // Colour each new pass from its badge art (best effort).
      const colored = await Promise.all(body.passes.map(async (p) => (p.imageUrl && !p.color ? { ...p, color: await passColorFromUrl(p.imageUrl) } : p)));
      const { passes: next, added } = mergePasses(passes, colored.map((p) => (p.color ? p : { ...p, color: undefined })));
      onImport(next);
      const single = kind !== 'credly-profile';
      setState({ kind: 'done', message: added ? `Added ${added} badge${added === 1 ? '' : 's'} from ${SOURCE_NAMES[kind]}.` : single ? 'You already have this badge.' : 'You already have all of these badges.' });
      if (single && added) setProfile('');
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : 'Import failed.' });
    }
  }

  return (
    <Section title="Import from a link">
      <TextField label="Badge or certificate link" type="url" value={profile} placeholder="https://www.credly.com/users/your-name" onChange={setProfile} />
      <button type="button" disabled={state.kind === 'loading' || !profile.trim()} onClick={() => void run()} className={`${smallButton} self-start`}>
        {state.kind === 'loading' ? 'Importing…' : 'Import badges'}
      </button>
      {state.kind === 'done' && (
        <p role="status" className="m-0 text-xs text-[#1f7a35]">
          {state.message}
        </p>
      )}
      {state.kind === 'error' && (
        <p role="alert" className="m-0 text-xs text-[#b3261e]">
          {state.message}
        </p>
      )}
      <p className="m-0 text-[11px] leading-snug text-[#6b675f]">
        <strong>Credly:</strong> your public profile link brings in every badge. One at a time: <strong>Google for Education / Accredible</strong>, <strong>Parchment (ISTE, Badgr)</strong>, <strong>Skilljar</strong>, and <strong>Google Skillshop</strong> certificate links. Canva and others: download the certificate and drag it onto your Badges window. Badges you already have are skipped.
      </p>
    </Section>
  );
}

/** Saves a pass's image into the owner's storage (through our image route), and colours the pass from it. */
async function keepImage(pass: BadgePass, upload: (file: File, folder: 'images') => Promise<string>): Promise<BadgePass> {
  if (!pass.imageUrl) return pass;
  try {
    const res = await fetch(`/api/badge-link/image?${new URLSearchParams({ url: pass.imageUrl })}`);
    if (!res.ok) return { ...pass, imageUrl: undefined };
    const blob = await res.blob();
    const file = new File([blob], `${pass.id}.${blob.type.split('/')[1] || 'png'}`, { type: blob.type });
    const [imageUrl, color] = await Promise.all([upload(file, 'images'), passColorFromImage(blob)]);
    return { ...pass, imageUrl, ...(color ? { color } : {}) };
  } catch {
    return { ...pass, imageUrl: undefined }; // an expiring link is worse than none
  }
}
