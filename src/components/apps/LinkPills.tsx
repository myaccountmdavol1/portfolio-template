import type { LinkItem } from '@/lib/types';

export function LinkPills({ links }: { links: LinkItem[] }) {
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link, i) => {
        const external = /^https?:/i.test(link.url);
        return (
          <a
            key={i}
            href={link.url}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="rounded-full bg-[#1d1c1a] px-4 py-2.5 text-[13px] font-medium text-[#fbfaf7] hover:opacity-90"
          >
            {link.label}
            {external ? ' ↗' : ''}
          </a>
        );
      })}
    </div>
  );
}
