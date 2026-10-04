import Image from 'next/image';
import { Check, User } from 'lucide-react';
import type { AboutApp, AboutContent } from '@/lib/types';
import { LinkPills } from './LinkPills';
import { RichTextView } from './RichTextView';

export function AboutView({ app }: { app: AboutApp }) {
  const c = app.content;
  return (
    <div className="flex flex-col gap-6 p-5">
      <div className="flex flex-wrap items-center gap-6">
        <div className="mx-auto min-w-[180px] flex-[0_1_240px] rounded-xl border border-black/10 bg-white p-2.5">
          <AboutMedia media={c.media} />
        </div>
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5">
          <div className="font-mono text-[11px] uppercase tracking-wider text-[#6b675f]">Current role</div>
          <h2 className="m-0 font-serif text-[32px] font-normal leading-tight text-balance">{c.roleTitle}</h2>
          <RichTextView text={c.bio} />
        </div>
      </div>

      {(c.lists.length > 0 || c.quote) && (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {c.lists.map((list, i) => (
            <div key={i} className="flex flex-col gap-3.5 rounded-xl border border-[#ece4cf] bg-[#fffdf6] px-5 py-4">
              <h3 className="m-0 text-lg font-semibold text-[#2b2618]">{list.heading}</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm text-[#2b2618]">
                {list.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <span
                      aria-hidden
                      className="mt-px flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-[#e2ab2c] text-white"
                    >
                      <Check size={11} strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {c.quote && (
            <figure className="m-0 flex flex-col justify-center gap-2.5 rounded-xl bg-[#fde7b0] p-5">
              <blockquote className="m-0 font-serif text-[28px] leading-tight text-balance text-[#2b2618]">
                “{c.quote.text}”
              </blockquote>
              <figcaption className="text-[13px] font-semibold text-[#5a4a1f]">— {c.quote.author}</figcaption>
            </figure>
          )}
        </div>
      )}

      <LinkPills links={c.contactLinks} />
    </div>
  );
}

function AboutMedia({ media }: { media: AboutContent['media'] }) {
  if (!media.url) {
    return (
      <div aria-hidden className="flex aspect-square w-full items-center justify-center rounded-md bg-[#e8e4dc] text-[#8a857b]">
        <User size={64} strokeWidth={1.2} />
      </div>
    );
  }
  if (media.kind === 'video') {
    return (
      <video src={media.url} autoPlay muted loop playsInline aria-label="About video" className="block h-auto w-full rounded-md" />
    );
  }
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-md">
      <Image src={media.url} alt="" fill sizes="(min-width: 768px) 240px, 50vw" className="object-cover" />
    </div>
  );
}
