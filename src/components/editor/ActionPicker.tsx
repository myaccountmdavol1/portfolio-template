'use client';

import { actionString, describeAction, type ActionChoice } from '@/lib/actions';
import { resolveApp, visibleAppsById } from '@/lib/apps';
import { useEditor } from './EditorContext';
import { SelectField, TextField } from './fields';

/** Choose what a button does — open one of your apps, email you, open a link — instead of typing an action. */
export function ActionPicker({ label, value, onChange }: { label: string; value: string; onChange: (action: string) => void }) {
  const editor = useEditor();
  if (!editor) return null;
  const apps = editor.data.apps.filter((a) => a.visible);
  const siteEmail = editor.data.site.email;
  const choice = describeAction(value);
  // Old hand-typed actions like "openApp:mail" show as the app they actually open.
  const appId = choice.mode === 'app' ? (resolveApp(visibleAppsById(editor.data.apps), choice.ref)?.id ?? '') : '';
  const set = (next: ActionChoice) => onChange(actionString(next));

  return (
    <div className="flex flex-col gap-2">
      <SelectField
        label={label}
        value={choice.mode}
        options={[
          { value: 'app', label: 'Open one of my apps' },
          { value: 'email', label: 'Email me' },
          { value: 'link', label: 'Open a link' },
          { value: 'none', label: 'Do nothing' },
        ]}
        onChange={(mode) => {
          if (mode === 'app') set({ mode, ref: appId || apps[0]?.id || '' });
          else if (mode === 'email') set({ mode, address: siteEmail });
          else if (mode === 'link') set({ mode, href: 'https://' });
          else set({ mode: 'none' });
        }}
      />
      {choice.mode === 'app' && (
        <SelectField
          label="Which app"
          value={appId}
          options={[...(appId ? [] : [{ value: '', label: 'Choose an app…' }]), ...apps.map((a) => ({ value: a.id, label: a.title }))]}
          onChange={(ref) => set({ mode: 'app', ref })}
        />
      )}
      {choice.mode === 'email' && <TextField label="Email address" type="email" value={choice.address} onChange={(address) => set({ mode: 'email', address })} />}
      {choice.mode === 'link' && <TextField label="Link" type="url" value={choice.href} onChange={(href) => set({ mode: 'link', href })} hint="https://…, tel:…, or sms:…" />}
    </div>
  );
}
