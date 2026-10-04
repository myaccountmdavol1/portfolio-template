'use client';

import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import type { UploadFolder } from '@/lib/editor/backend';
import type { LinkItem } from '@/lib/types';
import { useEditor } from './EditorContext';
import { useUpload } from './useUpload';

// Small, controlled form controls for the inspector. Every onChange fires per keystroke; the forms
// pass a coalescing key to `apply`, so one field's typing is a single undo step.

export const inputClass =
  'w-full rounded-md border border-black/15 bg-white px-2 py-1.5 text-[13px] text-[#1d1c1a] outline-none focus:border-[#0a84ff]';
export const smallButton =
  'inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-md border border-black/15 bg-white px-2.5 text-xs font-medium hover:bg-black/5 disabled:cursor-default disabled:opacity-50';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-black/10 px-4 py-3.5">
      <h3 className="m-0 mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#6b675f]">{title}</h3>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-[#3d3a35]">
      {children}
    </label>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  hint?: string;
  type?: 'text' | 'url' | 'email' | 'date';
}

export function TextField({ label, value, onChange, multiline, placeholder, hint, type = 'text' }: TextFieldProps) {
  const id = useId();
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? (
        <textarea id={id} value={value} placeholder={placeholder} rows={3} onChange={(e) => onChange(e.target.value)} className={`${inputClass} resize-y`} />
      ) : (
        <input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      )}
      {hint && <p className="m-0 mt-1 text-[11px] text-[#6b675f]">{hint}</p>}
    </div>
  );
}

export function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const id = useId();
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        id={id}
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className={inputClass}
      />
    </div>
  );
}

export function Toggle({ label, checked, onChange, disabled = false }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center justify-between gap-3 text-[13px] ${disabled ? 'cursor-default opacity-55' : 'cursor-pointer'}`}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#0a84ff]" />
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={inputClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label} picker`} value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-black/15 bg-white" />
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      </div>
    </div>
  );
}

interface ListEditorProps<T> {
  label: string;
  items: T[];
  /** `structural` is true for add/remove/reorder, so those always get their own undo step. */
  onChange: (items: T[], structural: boolean) => void;
  create: () => T;
  render: (item: T, update: (next: T) => void, index: number) => ReactNode;
  itemTitle: (item: T, index: number) => string;
  addLabel?: string;
}

export function ListEditor<T>({ label, items, onChange, create, render, itemTitle, addLabel = 'Add' }: ListEditorProps<T>) {
  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy, true);
  };
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <div className="text-xs font-medium text-[#3d3a35]">{label}</div>
      {items.map((item, i) => (
        <div key={i} className="rounded-md border border-black/10 bg-white">
          <div className="flex items-center gap-1 border-b border-black/5 px-2 py-1">
            <span className="min-w-0 flex-1 truncate text-xs text-[#6b675f]">{itemTitle(item, i) || `Item ${i + 1}`}</span>
            <button type="button" aria-label={`Move item ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)} className="cursor-pointer rounded p-1 hover:bg-black/5 disabled:opacity-30">
              <ArrowUp size={12} aria-hidden />
            </button>
            <button type="button" aria-label={`Move item ${i + 1} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)} className="cursor-pointer rounded p-1 hover:bg-black/5 disabled:opacity-30">
              <ArrowDown size={12} aria-hidden />
            </button>
            <button type="button" aria-label={`Remove item ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i), true)} className="cursor-pointer rounded p-1 text-[#c0362c] hover:bg-black/5">
              <Trash2 size={12} aria-hidden />
            </button>
          </div>
          <div className="flex flex-col gap-2 p-2">{render(item, (next) => onChange(items.map((it, j) => (j === i ? next : it)), false), i)}</div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, create()], true)} className={`${smallButton} self-start`}>
        + {addLabel}
      </button>
    </div>
  );
}

export function LinkListEditor({ label, items, onChange }: { label: string; items: LinkItem[]; onChange: (items: LinkItem[], structural: boolean) => void }) {
  return (
    <ListEditor
      label={label}
      items={items}
      onChange={onChange}
      create={() => ({ label: 'New link', url: 'https://' })}
      itemTitle={(l) => l.label}
      addLabel="Add link"
      render={(l, update) => (
        <>
          <TextField label="Label" value={l.label} onChange={(v) => update({ ...l, label: v })} />
          <TextField label="URL" type="url" value={l.url} onChange={(v) => update({ ...l, url: v })} hint="https://…, mailto:…, or tel:…" />
        </>
      )}
    />
  );
}

export function StringListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[], structural: boolean) => void }) {
  return (
    <ListEditor
      label={label}
      items={items}
      onChange={onChange}
      create={() => ''}
      itemTitle={(s) => s}
      render={(s, update) => <TextField label="Text" value={s} onChange={update} />}
    />
  );
}

interface UploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string, file: File | null) => void;
  folder?: UploadFolder;
  accept?: string;
  /** Runs on the chosen file before it uploads (e.g. shrinking a photo). */
  prepare?: (file: File) => Promise<File>;
}

/** Upload a file (or paste a URL). Shows a preview, and a per-file error with Retry. */
export function UploadField({ label, value, onChange, folder = 'images', accept = 'image/*', prepare }: UploadFieldProps) {
  const uploader = useUpload(folder, (url, file) => onChange(url, file), prepare);
  const editor = useEditor();
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[#3d3a35]">{label}</span>
      {value && folder === 'images' && (
        // eslint-disable-next-line @next/next/no-img-element -- preview of any URL, including data: URLs
        <img src={value} alt="" className="h-24 w-full rounded-md border border-black/10 object-cover" />
      )}
      {value && folder === 'audio' && <audio src={value} controls className="w-full" />}
      {value && folder === 'videos' && <video src={value} muted playsInline controls className="h-32 w-full rounded-md border border-black/10 bg-black object-contain" />}
      <div className="flex flex-wrap gap-1.5">
        <label className={smallButton}>
          {uploader.state === 'uploading' ? 'Uploading…' : value ? 'Replace…' : 'Upload…'}
          <input
            type="file"
            accept={accept}
            aria-label={`Upload ${label}`}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void uploader.upload(file);
            }}
          />
        </label>
        {editor && (
          <button type="button" onClick={() => editor.openMediaLibrary({ folder, onPick: (url) => onChange(url, null) })} className={smallButton}>
            Choose from library…
          </button>
        )}
        {value && (
          <button type="button" onClick={() => onChange('', null)} className={smallButton}>
            Remove
          </button>
        )}
      </div>
      {uploader.state === 'error' && (
        <p role="alert" className="m-0 text-xs text-[#b3261e]">
          Upload failed.{' '}
          <button type="button" onClick={uploader.retry} className="cursor-pointer underline">
            Retry
          </button>
        </p>
      )}
      <TextField label={`${label} URL`} type="url" value={value.startsWith('data:') ? '' : value} placeholder={value.startsWith('data:') ? 'Uploaded file' : 'or paste a link'} onChange={(v) => onChange(v, null)} />
    </div>
  );
}
