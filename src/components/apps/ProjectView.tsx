import Image from 'next/image';
import type { ProjectApp } from '@/lib/types';
import { LinkPills } from './LinkPills';
import { RichTextView } from './RichTextView';

export function ProjectView({ app }: { app: ProjectApp }) {
  const c = app.content;
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="relative h-64 overflow-hidden rounded-lg" style={{ background: 'linear-gradient(135deg,#dfe9f5,#b9cde6)' }}>
        {c.coverUrl ? (
          <Image src={c.coverUrl} alt="" fill sizes="580px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center font-serif text-4xl text-white/90">{app.title}</div>
        )}
      </div>
      <div className="flex justify-between gap-3 font-mono text-[11px] uppercase tracking-wider text-[#6b675f]">
        <span>{c.tag}</span>
        <span>{c.year}</span>
      </div>
      <h2 className="m-0 font-serif text-4xl font-normal leading-none">{app.title}</h2>
      <RichTextView text={c.body} />
      {c.role && <div className="text-sm text-[#6b675f]">Role — {c.role}</div>}
      {c.gallery.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {c.gallery.map((g, i) => (
            <figure key={i} className="m-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-md">
                <Image src={g.url} alt={g.caption} fill sizes="(min-width: 640px) 280px, 45vw" className="object-cover" />
              </div>
              {g.caption && <figcaption className="mt-1 text-xs text-[#6b675f]">{g.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
      <LinkPills links={c.links} />
    </div>
  );
}
