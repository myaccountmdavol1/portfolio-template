'use client';

import Image from 'next/image';
import { useState } from 'react';
import { clamp } from '@/lib/geometry';
import type { CredentialGroup, CredentialItem, CredentialsApp } from '@/lib/types';

const EDU_BACKGROUNDS = [
  'linear-gradient(150deg,#3a7bd5,#1d4f9c)',
  'linear-gradient(150deg,#7b5cff,#4b2fc9)',
  'linear-gradient(150deg,#1d1d1f,#3a3a3c)',
];

interface Selected {
  item: CredentialItem;
  group: CredentialGroup;
}

export function CredentialsView({ app }: { app: CredentialsApp }) {
  const { education, groups } = app.content;
  const [selected, setSelected] = useState<Selected | null>(null);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="flex flex-col gap-8 p-5 text-[#1d1d1f] sm:p-7">
      {education.length > 0 && (
        <section className="flex flex-col gap-3.5">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#0a84ff]">Featured</div>
            <h2 className="m-0 text-[26px] font-bold tracking-tight">Education</h2>
          </div>
          <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {education.map((e, i) => (
              <div
                key={i}
                className="flex min-h-[240px] flex-col gap-2.5 rounded-[18px] p-5 text-white shadow-lg"
                style={{ background: EDU_BACKGROUNDS[i % EDU_BACKGROUNDS.length] }}
              >
                <div className="text-[11px] font-bold uppercase tracking-widest opacity-80">{e.step}</div>
                <div className="text-5xl font-bold leading-none tracking-tight">{e.abbr}</div>
                <div className="text-[17px] font-semibold leading-snug text-balance">{e.title}</div>
                <div className="mt-auto flex flex-col gap-2">
                  {e.inProgress && (
                    <div className="flex flex-col gap-1.5">
                      <span className="self-start rounded-full bg-[#ff9f0a] px-2.5 py-1 text-[11px] font-bold tracking-wide text-[#1d1d1f]">
                        IN PROGRESS
                      </span>
                      <span
                        role="progressbar"
                        aria-label={`${e.title} progress`}
                        aria-valuenow={e.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="block h-1.5 overflow-hidden rounded-full bg-white/20"
                      >
                        <span className="block h-full rounded-full bg-[#ff9f0a]" style={{ width: `${clamp(e.progress, 0, 100)}%` }} />
                      </span>
                    </div>
                  )}
                  <div className="text-xs opacity-80">
                    {e.school} · {e.year}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {groups.length > 0 && (
        <section className="flex flex-col gap-6 border-t border-black/10 pt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="m-0 text-[21px] font-bold">Continuous Learning</h2>
            <span className="text-[13px] text-[#6e6e73]">{total} badges &amp; certifications</span>
          </div>
          {groups.map((group, gi) => (
            <div key={gi} className="flex flex-col gap-1">
              <h3 className="m-0 text-[15px] font-semibold">
                {group.name} <span className="font-normal text-[#8e8e93]">· {group.items.length}</span>
              </h3>
              <div className="grid gap-x-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                {group.items.map((item, ii) => (
                  <button
                    key={ii}
                    type="button"
                    onClick={() => setSelected({ item, group })}
                    className="grid cursor-pointer grid-cols-[60px_minmax(0,1fr)] items-center gap-3 border-b border-black/10 py-2.5 text-left hover:bg-black/5"
                  >
                    <BadgeTile item={item} background={group.color} size={60} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[13px] font-semibold leading-snug">{item.name}</span>
                      <span className="text-[11px] text-[#6e6e73]">{item.issuer}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {selected && <CredentialDetail selected={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function BadgeTile({ item, background, size }: { item: CredentialItem; background: string; size: number }) {
  const radius = Math.round(size * 0.22);
  if (item.imageUrl) {
    return (
      <Image
        src={item.imageUrl}
        alt=""
        width={size}
        height={size}
        className="object-cover"
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex items-center justify-center font-bold text-white"
      style={{ width: size, height: size, borderRadius: radius, background, fontSize: Math.round(size * 0.24) }}
    >
      {item.short}
    </span>
  );
}

function CredentialDetail({ selected, onClose }: { selected: Selected; onClose: () => void }) {
  const { item, group } = selected;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        onClick={(e) => e.stopPropagation()}
        className="flex w-[420px] max-w-full flex-col gap-4 rounded-[18px] bg-white p-6 text-[#1d1d1f] shadow-2xl"
      >
        <div className="flex items-center gap-4">
          <BadgeTile item={item} background={group.color} size={84} />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xl font-bold leading-tight">{item.name}</span>
            <span className="text-[13px] text-[#6e6e73]">{item.issuer}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 border-y border-black/10 py-2.5 text-center">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8e8e93]">Category</div>
            <div className="mt-1 text-sm font-semibold">{group.name}</div>
          </div>
          <div className="border-l border-black/10">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8e8e93]">Earned</div>
            <div className="mt-1 text-sm font-semibold">{item.year}</div>
          </div>
        </div>
        <p className="m-0 text-sm leading-relaxed text-[#3a3a3c] text-pretty">{item.desc}</p>
        <div className="flex justify-end gap-2.5">
          {item.verifyUrl && (
            <a
              href={item.verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[#0a84ff]/10 px-4 py-2 text-[13px] font-semibold text-[#0a84ff]"
            >
              Verify credential ↗
            </a>
          )}
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="cursor-pointer rounded-full bg-[#0a84ff] px-[18px] py-2 text-[13px] font-semibold text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
