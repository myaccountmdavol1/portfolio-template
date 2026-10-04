'use client';

import { useEffect, useState } from 'react';
import type { SiteVersion } from '@/lib/editor/backend';
import type { SiteData } from '@/lib/types';
import { Modal, modalButton } from './Modal';

interface VersionHistoryProps {
  load: () => Promise<SiteVersion[]>;
  onRestore: (data: SiteData) => void;
  onClose: () => void;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function summary(data: SiteData): string {
  const apps = data.apps.filter((a) => a.visible).length;
  return `${apps} app${apps === 1 ? '' : 's'} · ${data.site.ownerName}’s Portfolio`;
}

/** Every Publish is kept; restoring one puts it in the draft (undoable), live only after the next Publish. */
export function VersionHistory({ load, onRestore, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<SiteVersion[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    load().then(setVersions, (err) => {
      console.error('Could not load versions', err);
      setFailed(true);
    });
  }, [load]);

  return (
    <Modal title="Version history" onClose={onClose} width={520}>
      <p className="m-0 mb-3 text-xs text-[#6b675f]">
        A copy is saved every time you publish. Restoring one loads it into your draft — nothing changes on your live site until you Publish, and ⌘Z undoes it.
      </p>
      {failed && (
        <p role="alert" className="m-0 text-xs text-[#b3261e]">
          Couldn’t load your versions. Check your connection and try again.
        </p>
      )}
      {!failed && versions === null && <p className="m-0 text-xs text-[#6b675f]">Loading…</p>}
      {versions?.length === 0 && <p className="m-0 text-xs text-[#6b675f]">No versions yet — one is saved the first time you publish.</p>}
      {versions && versions.length > 0 && (
        <ul aria-label="Versions" className="m-0 flex list-none flex-col gap-1.5 p-0">
          {versions.map((v, i) => (
            <li key={v.id} className="flex items-center gap-3 rounded-lg border border-black/10 bg-white px-3 py-2">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13px] font-medium">
                  {when(v.publishedAt)}
                  {i === 0 && <span className="ml-2 rounded-full bg-[#30d158]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#1f7a36]">Live now</span>}
                </span>
                <span className="truncate text-[11px] text-[#6b675f]">{summary(v.data)}</span>
              </span>
              <button
                type="button"
                aria-label={`Restore ${when(v.publishedAt)}`}
                onClick={() => {
                  if (!window.confirm(`Load the version from ${when(v.publishedAt)} into your draft?\n\nYour live site won’t change until you Publish, and you can undo this.`)) return;
                  onRestore(v.data);
                }}
                className={modalButton}
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
