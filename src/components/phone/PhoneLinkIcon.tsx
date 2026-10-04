'use client';

import { AppIcon } from '@/components/AppIcon';
import { useEditor } from '@/components/editor/EditorContext';
import type { DockEntry } from '@/lib/types';

/** A desktop-dock link (Mail, LinkedIn…) shown as a home-screen shortcut. In Edit mode a tap selects it instead. */
export function PhoneLinkIcon({ entry, dockIndex, ink, inkShadow }: { entry: Extract<DockEntry, { kind: 'url' }>; dockIndex: number; ink: string; inkShadow?: string }) {
  const editor = useEditor();
  const selected = editor?.selection?.kind === 'dock' && editor.selection.index === dockIndex;
  return (
    <a
      href={entry.url}
      target={/^(mailto|tel|sms):/i.test(entry.url) ? undefined : '_blank'}
      rel="noopener noreferrer"
      aria-label={entry.label}
      onClick={(e) => {
        if (!editor) return;
        e.preventDefault();
        editor.select({ kind: 'dock', index: dockIndex });
      }}
      className={`flex min-w-0 flex-col items-center gap-1.5 ${selected ? 'rounded-[18px] outline outline-2 outline-offset-2 outline-[#0a84ff]' : ''}`}
    >
      <AppIcon icon={entry.iconUrl ? { kind: 'image', url: entry.iconUrl } : { kind: 'builtin', name: 'globe' }} size={60} variant="tile" />
      <span className="max-w-full truncate text-[11px] font-medium" style={{ color: ink, textShadow: inkShadow }}>
        {entry.label}
      </span>
    </a>
  );
}
