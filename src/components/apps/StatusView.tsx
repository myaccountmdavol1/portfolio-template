import type { StatusApp } from '@/lib/types';

/** An availability card, e.g. “👋 Open to work”. */
export function StatusCard({ app, size }: { app: StatusApp; size: 'widget' | 'window' }) {
  const c = app.content;
  const big = size === 'window';
  return (
    <div className={`flex h-full flex-col justify-between bg-white text-[#1d1d1f] ${big ? 'min-h-[220px] gap-6 p-8' : 'gap-2 p-4'}`}>
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none" style={{ background: c.color }} />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
        </span>
        <span className={`font-medium uppercase tracking-wide text-[#6e6e73] ${big ? 'text-sm' : 'text-[10px]'}`}>Status</span>
      </div>
      <div>
        <div className={`leading-none ${big ? 'text-6xl' : 'text-[32px]'}`} aria-hidden>
          {c.emoji}
        </div>
        <div className={`mt-2 font-semibold leading-tight ${big ? 'text-3xl' : 'text-[17px]'}`}>{c.headline}</div>
        <div className={`mt-1 text-[#6e6e73] ${big ? 'text-base' : 'text-[12px] leading-snug'}`}>{c.detail}</div>
      </div>
    </div>
  );
}

export function StatusView({ app }: { app: StatusApp }) {
  return <StatusCard app={app} size="window" />;
}
