'use client';

import { Play } from 'lucide-react';
import { BounceForm } from '@/components/screensaver/modules/BounceForm';
import { DriftForm } from '@/components/screensaver/modules/DriftForm';
import { FactsForm } from '@/components/screensaver/modules/FactsForm';
import { FlurryForm } from '@/components/screensaver/modules/FlurryForm';
import { HelloForm } from '@/components/screensaver/modules/HelloForm';
import { MemoriesForm } from '@/components/screensaver/modules/MemoriesForm';
import { requestSaverPreview } from '@/components/screensaver/useScreensaver';
import { updateSite } from '@/lib/editor/mutations';
import { DEFAULT_HINT, DEFAULT_PASSWORD, resolveLock, type LockNotificationId } from '@/lib/screensavers/lock';
import { resolveModule, SCREENSAVER_MODULES } from '@/lib/screensavers/registry';
import { isModuleId, MAX_IDLE_MINUTES, MIN_IDLE_MINUTES, MODULE_IDS, screensaverSettings } from '@/lib/screensavers/settings';
import type { HotCorner, LockSettings, ScreensaverModuleId, ScreensaverSettings, SiteData } from '@/lib/types';
import { useEditor } from '../EditorContext';
import { NumberField, Section, SelectField, smallButton, TextField, Toggle, UploadField } from '../fields';

const note = 'm-0 text-[11px] leading-snug text-[#6b675f]';

const CORNERS: { value: HotCorner; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
];

const NOTIFICATIONS: [LockNotificationId, string][] = [
  ['missedCall', 'Missed call (they let the incoming call ring out)'],
  ['newestBadge', 'Your newest badge'],
  ['guestbook', 'The newest guestbook note'],
  ['nowPlaying', 'Now Playing (only while Spotify is playing)'],
];

type SetModule = (id: ScreensaverModuleId, patch: { on?: boolean; settings?: unknown }, key?: string) => void;

/** The screen saver (which modules, when, the hot corner) and the lock screen after it, with Previews. */
export function ScreensaverSection() {
  const editor = useEditor();
  if (!editor) return null;
  const { data, apply } = editor;
  const saver = screensaverSettings(data.site);
  const lock = resolveLock(data);
  const stored = data.site.screensaver;
  const storedLock = stored?.lock;
  // Each reads the latest draft inside apply, so quick successive edits never overwrite each other.
  const setSaver = (patch: Partial<ScreensaverSettings>, key?: string) => apply((d) => updateSite(d, { screensaver: { ...d.site.screensaver, ...patch } }), key);
  const setLock = (patch: Partial<LockSettings>, key?: string) =>
    apply((d) => updateSite(d, { screensaver: { ...d.site.screensaver, lock: { ...d.site.screensaver?.lock, ...patch } } }), key);
  const setNotification = (id: LockNotificationId, on: boolean) =>
    apply((d) => updateSite(d, { screensaver: { ...d.site.screensaver, lock: { ...d.site.screensaver?.lock, notifications: { ...d.site.screensaver?.lock?.notifications, [id]: on } } } }));
  const setModule: SetModule = (id, patch, key) =>
    apply((d) => {
      const modules = d.site.screensaver?.modules ?? {};
      return updateSite(d, { screensaver: { ...d.site.screensaver, modules: { ...modules, [id]: { ...modules[id], ...patch } } } });
    }, key);
  const passwordOn = storedLock?.password !== null;

  return (
    <Section title="Screen Saver & Lock Screen">
      <p className={note}>
        When a visitor leaves the desktop alone, a screen saver made from your content plays. Any key or mouse move shows the lock screen, and Guest (or your password) brings the desktop back exactly as it was. Links: /?lock=1 and /?screensaver=hello.
      </p>
      <Toggle label="Screen saver" checked={saver.enabled} onChange={(enabled) => setSaver({ enabled })} />
      <NumberField
        label="Start after (minutes, 1–30)"
        min={MIN_IDLE_MINUTES}
        max={MAX_IDLE_MINUTES}
        value={typeof stored?.idleMinutes === 'number' ? stored.idleMinutes : saver.idleMinutes}
        onChange={(idleMinutes) => setSaver({ idleMinutes }, 'site:screensaver:idle')}
      />
      <SelectField label="Hot corner" value={saver.hotCorner} options={CORNERS} onChange={(hotCorner) => setSaver({ hotCorner })} />
      <p className={note}>Resting the pointer in that corner for a second starts it straight away.</p>
      <SelectField
        label="Always show"
        value={saver.pinned ?? ''}
        options={[{ value: '', label: 'Shuffle' }, ...MODULE_IDS.map((id) => ({ value: id, label: SCREENSAVER_MODULES[id].name }))]}
        onChange={(v) => setSaver({ pinned: isModuleId(v) ? v : null })}
      />
      {MODULE_IDS.map((id) => (
        <ModuleRow key={id} id={id} data={data} setModule={setModule} />
      ))}

      <h4 className="m-0 mt-1 text-xs font-semibold text-[#3d3a35]">Lock screen</h4>
      <Toggle label="Lock screen after the screen saver" checked={storedLock?.enabled !== false} onChange={(enabled) => setLock({ enabled })} />
      <TextField label="Name on the lock screen" value={storedLock?.ownerName ?? ''} placeholder={data.site.ownerName} onChange={(ownerName) => setLock({ ownerName: ownerName || undefined }, 'site:screensaver:lockName')} />
      <UploadField label="Lock screen picture" value={storedLock?.avatarUrl ?? ''} onChange={(url) => setLock({ avatarUrl: url || undefined })} />
      <p className={note}>Empty: your About Me photo{lock.avatarUrl ? '' : ' (your initials until you add one)'}.</p>
      {/* With no password Guest is the only way in, so it's forced on (the note below says why). */}
      <Toggle label="Guest can unlock" checked={lock.guest} disabled={lock.password === null} onChange={(guest) => setLock({ guest })} />
      <Toggle label="Password on your tile" checked={passwordOn} onChange={(on) => setLock({ password: on ? DEFAULT_PASSWORD : null })} />
      {passwordOn && (
        <>
          <TextField label="Password" value={storedLock?.password ?? DEFAULT_PASSWORD} onChange={(password) => setLock({ password }, 'site:screensaver:password')} hint="Not case-sensitive; spaces at either end are ignored. Leave it empty for no password." />
          <TextField label="Hint" value={storedLock?.hint ?? DEFAULT_HINT} onChange={(hint) => setLock({ hint }, 'site:screensaver:hint')} />
        </>
      )}
      <p className={note}>
        A playful easter egg, not security: anyone can find the password in your site’s data. Guessing it earns the secret “Password guru” achievement.
        {lock.password === null ? ' With no password, Guest is always shown.' : ''}
      </p>
      <div role="group" aria-label="While you were away" className="flex flex-col gap-2">
        <div className="text-xs font-medium text-[#3d3a35]">While you were away</div>
        {NOTIFICATIONS.map(([id, label]) => (
          <Toggle key={id} label={label} checked={lock.notifications[id]} onChange={(on) => setNotification(id, on)} />
        ))}
        <p className={note}>Only real ones show: nothing is made up for an empty site.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => requestSaverPreview({ kind: 'screensaver' })} className={smallButton}>
          <Play size={12} aria-hidden /> Preview screen saver
        </button>
        <button type="button" onClick={() => requestSaverPreview({ kind: 'lock' })} className={smallButton}>
          <Play size={12} aria-hidden /> Preview lock screen
        </button>
      </div>
      <p className={`${note} -mt-1`}>Previews play in the desktop preview here (phones only have the lock screen). Move the mouse or press a key to wake the screen saver.</p>
    </Section>
  );
}

/** One module: its switch, what's wrong if it has nothing to show, its settings, Preview and Reset. */
function ModuleRow({ id, data, setModule }: { id: ScreensaverModuleId; data: SiteData; setModule: SetModule }) {
  const m = resolveModule(data, id);
  const change = (settings: unknown, structural?: boolean) => setModule(id, { settings }, structural ? undefined : `site:screensaver:${id}`);
  return (
    <div role="group" aria-label={m.name} className="flex flex-col gap-2 rounded-md border border-black/10 bg-white p-2">
      <Toggle label={m.name} checked={m.on} onChange={(on) => setModule(id, { on })} />
      {!m.available && <p className="m-0 text-[11px] font-medium text-[#c0362c]">Skipped: {SCREENSAVER_MODULES[id].emptyNote}</p>}
      {m.on && <ModuleForm id={id} data={data} onChange={change} />}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!m.available} onClick={() => requestSaverPreview({ kind: 'screensaver', moduleId: id })} className={smallButton}>
          <Play size={12} aria-hidden /> Preview
        </button>
        {m.custom && (
          <button type="button" onClick={() => setModule(id, { settings: undefined })} className={smallButton}>
            Reset to generated
          </button>
        )}
      </div>
    </div>
  );
}

function ModuleForm({ id, data, onChange }: { id: ScreensaverModuleId; data: SiteData; onChange: (settings: unknown, structural?: boolean) => void }) {
  switch (id) {
    case 'hello':
      return <HelloForm data={data} settings={resolveModule(data, 'hello').settings} onChange={onChange} />;
    case 'drift':
      return <DriftForm data={data} settings={resolveModule(data, 'drift').settings} onChange={onChange} />;
    case 'memories':
      return <MemoriesForm data={data} settings={resolveModule(data, 'memories').settings} onChange={onChange} />;
    case 'facts':
      return <FactsForm data={data} settings={resolveModule(data, 'facts').settings} onChange={onChange} />;
    case 'flurry':
      return <FlurryForm data={data} settings={resolveModule(data, 'flurry').settings} onChange={onChange} />;
    case 'bounce':
      return <BounceForm data={data} settings={resolveModule(data, 'bounce').settings} onChange={onChange} />;
  }
}
