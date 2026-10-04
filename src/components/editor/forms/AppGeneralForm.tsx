'use client';

import { AppIcon } from '@/components/AppIcon';
import { isInDock, isOnDesktop, setDesktopWidgetSize, setInDock, setOnDesktop, updateApp } from '@/lib/editor/mutations';
import { setPhoneWidgetSize } from '@/lib/editor/phoneMutations';
import { buildPhoneLayout, canBeWidget, widgetSizeOfSlot } from '@/lib/phoneLayout';
import { APP_TYPE_LABELS } from '@/lib/editor/starters';
import { supportsAutoNotification } from '@/lib/notifications';
import type { AppNotification, PortfolioApp, WidgetSize } from '@/lib/types';
import { useEditor } from '../EditorContext';
import { NumberField, Section, SelectField, smallButton, TextField, Toggle } from '../fields';

const SIZE_OPTIONS: { value: WidgetSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium (wide)' },
  { value: 'large', label: 'Large' },
];

/** Name, icon, and where the app appears — shared by every app type. */
export function AppGeneralForm({ app }: { app: PortfolioApp }) {
  const editor = useEditor();
  if (!editor) return null;
  const { data, apply } = editor;
  const desktopWidget = data.layout.desktop.widgets.find((p) => p.appId === app.id);
  const phoneSlot = buildPhoneLayout(data.apps, data.layout).pages.flat().find((s) => s.appId === app.id);
  const phoneSize = canBeWidget(app) && phoneSlot ? widgetSizeOfSlot(phoneSlot.size) : null;
  return (
    <Section title={APP_TYPE_LABELS[app.type]}>
      <TextField label="Name" value={app.title} onChange={(title) => apply((d) => updateApp(d, app.id, { title }), `${app.id}:title`)} />
      <div className="flex items-center gap-3">
        <AppIcon icon={app.icon} size={44} variant="tile" />
        <button type="button" onClick={() => editor.openIconPicker({ kind: 'app', appId: app.id })} className={smallButton}>
          Change icon…
        </button>
      </div>
      <Toggle label="Visible" checked={app.visible} onChange={(visible) => apply((d) => updateApp(d, app.id, { visible }))} />
      <Toggle label="On the desktop" checked={isOnDesktop(data, app.id)} onChange={(on) => apply((d) => setOnDesktop(d, app.id, on))} />
      {desktopWidget && (
        <SelectField
          label="Widget size on the desktop"
          value={desktopWidget.size ?? (app.type === 'note' ? 'medium' : 'small')}
          options={SIZE_OPTIONS}
          onChange={(size) => apply((d) => setDesktopWidgetSize(d, app.id, size))}
        />
      )}
      {phoneSize && (
        <SelectField label="Widget size on the phone" value={phoneSize} options={SIZE_OPTIONS} onChange={(size) => apply((d) => setPhoneWidgetSize(d, app.id, size))} />
      )}
      <Toggle label="In the dock" checked={isInDock(data, app.id)} onChange={(on) => apply((d) => setInDock(d, app.id, on))} />
      <NotificationSetting app={app} onChange={(notification) => apply((d) => updateApp(d, app.id, { notification }))} />
      <div className="flex gap-1.5 pt-1">
        <button type="button" onClick={() => editor.runAppAction('duplicate', app.id)} className={smallButton}>
          Duplicate
        </button>
        <button type="button" onClick={() => editor.runAppAction('delete', app.id)} className={`${smallButton} text-[#c0362c]`}>
          Delete…
        </button>
      </div>
    </Section>
  );
}

/** The red bubble on this app's icon: off, a dot, a number, or (for Wallet and Game Center) an automatic count. */
function NotificationSetting({ app, onChange }: { app: PortfolioApp; onChange: (n: AppNotification | undefined) => void }) {
  const n = app.notification;
  const auto = supportsAutoNotification(app);
  const autoLabel = app.type === 'wallet' ? 'Automatic — how many badges' : 'Automatic — achievements left to find';
  return (
    <>
      <SelectField
        label="Notification badge"
        value={n?.mode ?? 'off'}
        options={[
          { value: 'off', label: 'Off' },
          { value: 'dot', label: 'A red dot' },
          { value: 'number', label: 'A number' },
          ...(auto ? [{ value: 'auto', label: autoLabel }] : []),
        ]}
        onChange={(mode) => onChange(mode === 'off' ? undefined : mode === 'number' ? { mode, count: n?.mode === 'number' ? n.count : 1 } : { mode: mode as 'dot' | 'auto' })}
      />
      {n?.mode === 'number' && <NumberField label="Number on the badge" min={1} value={n.count} onChange={(count) => onChange({ mode: 'number', count: Math.max(1, count) })} />}
      {n && <p className="m-0 -mt-1 text-[11px] text-[#6b675f]">Each visitor’s badge disappears once they open the app.</p>}
    </>
  );
}
