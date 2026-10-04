import { handleFromUrl, socialBrand } from '@/lib/brands';
import type { SocialApp } from '@/lib/types';
import { BrandMark } from './BrandMark';

/** Social: every profile as a brand-coloured tile. */
export function SocialView({ app }: { app: SocialApp }) {
  const links = app.content.links.filter((l) => l.url);
  return (
    <div className="flex min-h-[300px] flex-col gap-4 bg-white p-5 text-[#1d1d1f]">
      <h2 className="m-0 text-2xl font-bold">{app.content.heading}</h2>
      {links.length === 0 && <p className="m-0 text-sm text-[#6e6e73]">No profiles yet.</p>}
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5 p-0">
        {links.map((link, i) => {
          const brand = socialBrand(link.url);
          const dark = brand.id === 'snapchat';
          return (
            <li key={link.url + i}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`keep-colors flex items-center gap-3 rounded-xl p-3 shadow-sm transition-transform hover:-translate-y-0.5 ${dark ? 'text-black' : 'text-white'}`}
                style={{ background: brand.color }}
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white/20">
                  <BrandMark brand={brand} size={20} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold">{brand.name}</span>
                  <span className="truncate text-xs opacity-85">{link.label || handleFromUrl(link.url)}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
