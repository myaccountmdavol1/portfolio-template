'use client';

import { Play } from 'lucide-react';
import { AppIcon } from '@/components/AppIcon';
import { requestTourPreview } from '@/components/tour/useTour';
import { CONTROL_CENTER_TILES, shownTiles } from '@/lib/controlCenter';
import { deepLinkParams, resolveDeepLink } from '@/lib/deepLink';
import { updateApp, updateSite } from '@/lib/editor/mutations';
import { DEFAULT_SECONDS, defaultTour, MAX_CAPTION, MAX_SECONDS, MIN_SECONDS, tourChoices, type TourChoice } from '@/lib/tour';
import type { HeadlineStyle, MenuBarPart, MenuItem, SiteSettings, TourSettings, TourStop } from '@/lib/types';
import { ActionPicker } from '../ActionPicker';
import { useEditor } from '../EditorContext';
import { ColorField, LinkListEditor, ListEditor, NumberField, Section, SelectField, smallButton, TextField, Toggle, UploadField } from '../fields';
import { ScreensaverSection } from './ScreensaverSection';

const MENU_BAR_PARTS: [MenuBarPart, string][] = [
  ['name', 'Portfolio title (“…’s Portfolio”)'],
  ['search', 'Spotlight search'],
  ['controlCenter', 'Control Center (Dark Mode)'],
  ['date', 'Date'],
  ['clock', 'Time'],
];

export function SiteForm() {
  const editor = useEditor();
  if (!editor) return null;
  const { data, apply } = editor;
  const site = data.site;
  // Reads the latest site inside apply, so quick successive edits never overwrite each other.
  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K], structural = false) =>
    apply((d) => updateSite(d, { [key]: value }), structural ? undefined : `site:${String(key)}`);
  const setNested = <K extends 'headline' | 'incomingCall' | 'seo'>(key: K, patch: Partial<SiteSettings[K]>, field: string) =>
    apply((d) => updateSite(d, { [key]: { ...d.site[key], ...patch } }), `site:${key}:${field}`);

  return (
    <>
      <Section title="You">
        <TextField label="Your name" value={site.ownerName} onChange={(v) => set('ownerName', v)} />
        <TextField label="Email" type="email" value={site.email} onChange={(v) => set('email', v)} />
        <LinkListEditor label="Social links" items={site.socialLinks} onChange={(items, s) => set('socialLinks', items, s)} />
      </Section>

      <Section title="Headline">
        <Toggle label="Show headline" checked={site.headline.show} onChange={(show) => setNested('headline', { show }, 'show')} />
        <Toggle label="Also show it on the phone wallpaper" checked={site.headline.showOnPhone ?? false} onChange={(showOnPhone) => setNested('headline', { showOnPhone }, 'showOnPhone')} />
        <TextField label="Small line" value={site.headline.line1} onChange={(line1) => setNested('headline', { line1 }, 'line1')} />
        <TextField label="Big line" value={site.headline.line2} onChange={(line2) => setNested('headline', { line2 }, 'line2')} />
        <HeadlineLook />
      </Section>

      <Section title="Look">
        <button type="button" onClick={editor.openWallpaperPicker} className={`${smallButton} self-start`}>
          Change wallpaper…
        </button>
        <SelectField
          label="Default appearance"
          value={site.appearance ?? 'light'}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'auto', label: 'Match the visitor’s device' },
          ]}
          onChange={(v) => set('appearance', v, true)}
        />
        <p className="m-0 text-[11px] text-[#6b675f]">Visitors can still switch with Dark Mode in Control Center.</p>
        <ColorField label="Accent colour" value={site.accent} onChange={(v) => set('accent', v)} />
        <UploadField label="Site icon (favicon)" value={site.iconUrl ?? ''} onChange={(url) => set('iconUrl', url || undefined, true)} />
        <p className="m-0 text-[11px] text-[#6b675f]">Optional. Leave empty to use a Mac-style tile with your initials in your accent colour. Shows in browser tabs and on iPhone home screens after you Publish.</p>
        <Toggle label="24-hour clock" checked={site.clock24} onChange={(v) => set('clock24', v, true)} />
      </Section>

      <Section title="Menu bar">
        <ListEditor<MenuItem>
          label="Menu items"
          items={site.menuBar.items}
          onChange={(items, s) => set('menuBar', { ...site.menuBar, items }, s)}
          create={() => ({ label: 'New item', action: '' })}
          itemTitle={(m) => m.label}
          addLabel="Add menu item"
          render={(m, update) => (
            <>
              <TextField label="Label" value={m.label} onChange={(label) => update({ ...m, label })} />
              <ActionPicker label="When clicked" value={m.action} onChange={(action) => update({ ...m, action })} />
            </>
          )}
        />
        <SelectField
          label="Menu bar logo"
          value={site.menuBar.logo?.kind ?? 'dot'}
          options={[
            { value: 'dot', label: 'Dot in your accent colour' },
            { value: 'icon', label: 'An icon or image' },
            { value: 'none', label: 'Nothing' },
          ]}
          onChange={(kind) => {
            if (kind === 'icon') {
              // Choosing “icon” opens the picker; the logo changes once one is picked.
              editor.openIconPicker({ kind: 'menuBarLogo' });
              return;
            }
            set('menuBar', { ...site.menuBar, logo: { kind } }, true);
          }}
        />
        {site.menuBar.logo?.kind === 'icon' && (
          <div className="flex items-center gap-2">
            <AppIcon icon={site.menuBar.logo.icon} size={28} variant="tile" />
            <button type="button" onClick={() => editor.openIconPicker({ kind: 'menuBarLogo' })} className={smallButton}>
              Change icon…
            </button>
          </div>
        )}
        <p className="m-0 mt-1 text-xs font-medium text-[#3d3a35]">Show in the menu bar</p>
        {MENU_BAR_PARTS.map(([part, label]) => {
          const off = site.menuBar.hide ?? [];
          return (
            <Toggle
              key={part}
              label={label}
              checked={!off.includes(part)}
              onChange={(show) => set('menuBar', { ...site.menuBar, hide: show ? off.filter((p) => p !== part) : [...off, part] }, true)}
            />
          );
        })}
      </Section>

      <Section title="Incoming call">
        <Toggle label="Show the incoming call" checked={site.incomingCall.enabled} onChange={(enabled) => setNested('incomingCall', { enabled }, 'enabled')} />
        <TextField label="Caller name" value={site.incomingCall.callerName} onChange={(callerName) => setNested('incomingCall', { callerName }, 'callerName')} />
        <NumberField label="Delay (seconds)" min={0} value={site.incomingCall.delaySec} onChange={(delaySec) => setNested('incomingCall', { delaySec }, 'delaySec')} />
        <ActionPicker label="When answered" value={site.incomingCall.answerAction} onChange={(answerAction) => setNested('incomingCall', { answerAction }, 'answerAction')} />
        <UploadField label="Caller photo" value={site.incomingCall.imageUrl ?? ''} onChange={(url) => setNested('incomingCall', { imageUrl: url || undefined }, 'imageUrl')} />
        <UploadField
          label="FaceTime intro video"
          folder="videos"
          accept="video/*"
          value={site.incomingCall.videoUrl ?? ''}
          onChange={(url) => setNested('incomingCall', { videoUrl: url || undefined }, 'videoUrl')}
        />
        <p className="m-0 text-[11px] text-[#6b675f]">With a video, answering opens FaceTime and plays it (up to 100MB — short is best). Hanging up then does “When answered”.</p>
      </Section>

      <TourSection />

      <ScreensaverSection />

      <Section title="Control Center">
        <p className="m-0 text-[11px] leading-snug text-[#6b675f]">
          The tiles visitors see when they open Control Center (the two switches, top right). A switched-off tile’s effect is off for everyone too.
        </p>
        {CONTROL_CENTER_TILES.map(([tile, label]) => {
          const shown = shownTiles(site);
          const setShown = (on: boolean) => {
            // Everything hidden today (including the older Now Playing switch), then this one tile on or off.
            const hidden = CONTROL_CENTER_TILES.map(([t]) => t).filter((t) => !shown.has(t) && t !== tile);
            const next = on ? hidden : [...hidden, tile];
            apply((d) =>
              updateSite(d, {
                controlCenter: { ...d.site.controlCenter, hide: next },
                // The older Now Playing switch now lives here.
                ...(tile === 'nowPlaying' ? { nowPlaying: undefined } : {}),
              }),
            );
          };
          return <Toggle key={tile} label={label} checked={shown.has(tile)} onChange={setShown} />;
        })}
        <p className="m-0 text-[11px] leading-snug text-[#6b675f]">
          Now Playing stays hidden until Spotify is connected. With SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET set in Vercel (redirect URI{' '}
          <code>{`${window.location.origin}/api/spotify/callback`}</code>), click{' '}
          <a href="/api/spotify/login" target="_blank" rel="noopener noreferrer" className="text-[#0a84ff] underline">
            Connect Spotify ↗
          </a>
          . Spotify asks you to reconnect about every 6 months — use the same link.
        </p>
      </Section>

      <Section title="404 page">
        <p className="m-0 text-[11px] text-[#6b675f]">
          What visitors see at a broken link: your app icons fly in and form “404”. Click an icon, or try the Konami code (↑↑↓↓←→←→BA)…
        </p>
        <TextField
          label="Message"
          value={site.notFound?.message ?? ''}
          placeholder="Oops! This page wandered off."
          onChange={(message) => set('notFound', { ...site.notFound, message: message || undefined })}
        />
        <UploadField label="Background image" value={site.notFound?.imageUrl ?? ''} onChange={(url) => set('notFound', { ...site.notFound, imageUrl: url || undefined }, true)} />
        <Toggle label="Include the Beach Ball Run game" checked={site.notFound?.game !== false} onChange={(game) => set('notFound', { ...site.notFound, game }, true)} />
        <a href="/this-page-does-not-exist" target="_blank" rel="noopener noreferrer" className={`${smallButton} self-start`}>
          Open the 404 page ↗
        </a>
        <p className="m-0 -mt-1 text-[11px] text-[#6b675f]">Shows your published site — Publish first to see changes.</p>
      </Section>

      <Section title="Search & sharing">
        <TextField label="Page title" value={site.seo.title} onChange={(title) => setNested('seo', { title }, 'title')} />
        <TextField label="Description" multiline value={site.seo.description} onChange={(description) => setNested('seo', { description }, 'description')} />
        <UploadField label="Share image" value={site.seo.ogImageUrl ?? ''} onChange={(url) => setNested('seo', { ogImageUrl: url || undefined }, 'ogImageUrl')} />
      </Section>

      <Section title="All apps">
        {data.apps.map((app) => (
          <div key={app.id} className="flex items-center gap-2 text-[13px]">
            <button type="button" onClick={() => editor.select({ kind: 'app', appId: app.id })} className="min-w-0 flex-1 cursor-pointer truncate text-left hover:underline">
              {app.title}
            </button>
            <label className="flex items-center gap-1 text-xs text-[#6b675f]">
              <input type="checkbox" aria-label={`${app.title} visible`} checked={app.visible} onChange={(e) => apply((d) => updateApp(d, app.id, { visible: e.target.checked }))} className="accent-[#0a84ff]" />
              Visible
            </label>
          </div>
        ))}
      </Section>
    </>
  );
}

/** Colour, font, size, position, and more for the headline on the wallpaper. */
function HeadlineLook() {
  const editor = useEditor();
  if (!editor) return null;
  const style = editor.data.site.headline.style ?? {};
  const setStyle = (patch: Partial<HeadlineStyle>, field: string, structural = false) =>
    editor.apply(
      (d) => updateSite(d, { headline: { ...d.site.headline, style: { ...d.site.headline.style, ...patch } } }),
      structural ? undefined : `site:headline:style:${field}`,
    );
  return (
    <div className="flex flex-col gap-2.5 rounded-md border border-black/10 bg-white/60 p-2.5">
      <span className="text-xs font-medium text-[#3d3a35]">Style</span>
      <SelectField
        label="Font"
        value={style.font ?? 'serif'}
        options={[
          { value: 'serif', label: 'Serif (elegant)' },
          { value: 'sans', label: 'Sans-serif (clean)' },
          { value: 'mono', label: 'Monospace (techy)' },
        ]}
        onChange={(font) => setStyle({ font }, 'font', true)}
      />
      <div>
        <label htmlFor="headline-size" className="mb-1 flex justify-between text-xs font-medium text-[#3d3a35]">
          <span>Size</span>
          <span className="tabular-nums text-[#6b675f]">{style.size ?? 100}%</span>
        </label>
        <input id="headline-size" type="range" min={50} max={150} step={5} value={style.size ?? 100} onChange={(e) => setStyle({ size: Number(e.target.value) }, 'size')} className="w-full accent-[#0a84ff]" />
      </div>
      <SelectField
        label="Position"
        value={style.position ?? 'center'}
        options={[
          { value: 'top', label: 'Top' },
          { value: 'center', label: 'Middle' },
          { value: 'bottom', label: 'Bottom' },
        ]}
        onChange={(position) => setStyle({ position }, 'position', true)}
      />
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <ColorField label="Colour" value={style.color ?? ''} onChange={(color) => setStyle({ color }, 'color')} />
        </div>
        {style.color && (
          <button type="button" onClick={() => setStyle({ color: '' }, 'color', true)} className={`${smallButton} mb-0.5`}>
            Auto
          </button>
        )}
      </div>
      <p className="m-0 -mt-1 text-[11px] text-[#6b675f]">Leave the colour empty (Auto) to match the wallpaper, including Dark Mode.</p>
      <Toggle label="Soft shadow (helps on photo wallpapers)" checked={style.shadow ?? false} onChange={(shadow) => setStyle({ shadow }, 'shadow', true)} />
      <Toggle label="Italic small line" checked={style.italicSmallLine !== false} onChange={(italicSmallLine) => setStyle({ italicSmallLine }, 'italic', true)} />
      <Toggle label="Show my name under it" checked={style.showName !== false} onChange={(showName) => setStyle({ showName }, 'showName', true)} />
    </div>
  );
}

/** The guided tour: its button, autoplay, and the stops it plays (generated until the owner changes them). */
function TourSection() {
  const editor = useEditor();
  if (!editor) return null;
  const { data, apply } = editor;
  const tour = data.site.tour;
  const stops = tour?.stops ?? defaultTour(data);
  const choices = tourChoices(data);
  // Reads the latest tour inside apply, so quick successive edits never overwrite each other.
  const setTour = (patch: Partial<TourSettings>, key?: string) =>
    apply((d) => updateSite(d, { tour: { ...d.site.tour, stops: d.site.tour?.stops ?? null, ...patch } }), key);

  return (
    <Section title="Tour">
      <p className="m-0 text-[11px] leading-snug text-[#6b675f]">
        A pointer glides to each stop, opens it and shows your caption, then ends on a card with your contact buttons. Visitors start it from the button, the menu bar, or a link to /?tour=1.
      </p>
      <Toggle label="Show the tour button" checked={tour?.showButton !== false} onChange={(showButton) => setTour({ showButton })} />
      <Toggle label="Autoplay for first-time visitors" checked={tour?.autoplay === true} onChange={(autoplay) => setTour({ autoplay })} />
      <Toggle label="Moving the mouse stops the tour" checked={tour?.stopOnMove !== false} onChange={(stopOnMove) => setTour({ stopOnMove })} />
      <p className="m-0 text-[11px] text-[#6b675f]">Off: visitors keep their cursor and get Pause/Stop buttons; a click or key still stops it.</p>
      <p className="m-0 text-[11px] text-[#6b675f]">Autoplay waits for 4 seconds without any clicks, scrolling or keys, and never plays for someone arriving on a link to one app.</p>
      <ListEditor<TourStop>
        label="Tour stops"
        items={stops}
        onChange={(items, structural) => setTour({ stops: items }, structural ? undefined : 'site:tour:stops')}
        create={() => ({ open: choices[0]?.open ?? '', caption: 'Something worth seeing', seconds: DEFAULT_SECONDS })}
        itemTitle={(s) => s.caption}
        addLabel="Add stop"
        render={(s, update) => <TourStopFields stop={s} choices={choices} onChange={update} />}
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => requestTourPreview()} className={smallButton}>
          <Play size={12} aria-hidden /> Preview tour
        </button>
        {tour?.stops && (
          <button type="button" onClick={() => setTour({ stops: null })} className={smallButton}>
            Reset to default
          </button>
        )}
      </div>
      <p className="m-0 -mt-1 text-[11px] text-[#6b675f]">Preview plays it here. Move the mouse or press a key to stop it.</p>
    </Section>
  );
}

/** One stop: which app (and badge or photo), its caption, and how long it stays open. */
function TourStopFields({ stop, choices, onChange }: { stop: TourStop; choices: TourChoice[]; onChange: (next: TourStop) => void }) {
  const editor = useEditor();
  if (!editor) return null;
  const target = resolveDeepLink(editor.data, stop.open, stop.item || undefined);
  const params = target ? deepLinkParams(editor.data, target) : null;
  const open = params?.open ?? stop.open;
  const choice = choices.find((c) => c.open === open);
  const appOptions = [...(choice ? [] : [{ value: stop.open, label: 'Missing app — pick another' }]), ...choices.map((c) => ({ value: c.open, label: c.label }))];
  return (
    <>
      {!target && <p className="m-0 text-[11px] font-medium text-[#c0362c]">Skipped: this app is hidden or no longer exists.</p>}
      <SelectField label="App" value={open} options={appOptions} onChange={(next) => onChange({ ...stop, open: next, item: undefined })} />
      {choice && choice.items.length > 0 && (
        <SelectField
          label="Show inside it"
          value={params?.item ?? ''}
          options={[{ value: '', label: 'Just the app' }, ...choice.items.map((i) => ({ value: i.item, label: i.label }))]}
          onChange={(item) => onChange({ ...stop, item: item || undefined })}
        />
      )}
      <TextField label="Caption" value={stop.caption} hint={`${stop.caption.length}/${MAX_CAPTION}`} onChange={(caption) => onChange({ ...stop, caption: caption.slice(0, MAX_CAPTION) })} />
      <NumberField label="Seconds (3–12)" min={MIN_SECONDS} max={MAX_SECONDS} value={stop.seconds ?? DEFAULT_SECONDS} onChange={(seconds) => onChange({ ...stop, seconds })} />
    </>
  );
}
