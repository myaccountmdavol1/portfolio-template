import type { StatsApp } from '@/lib/types';

const STEP_COLORS = ['#0a84ff', '#5e5ce6', '#34c759', '#ff9f0a', '#ff375f', '#64d2ff', '#bf5af2'];

export function StatsView({ app }: { app: StatsApp }) {
  const { heading, subheading, steps, metrics, chart } = app.content;
  const max = chart ? Math.max(1, ...chart.bars.map((b) => b.value)) : 1;

  return (
    <div className="flex flex-col gap-7 p-5 text-[#1d1d1f] sm:p-7">
      <header>
        <h2 className="m-0 text-[26px] font-bold tracking-tight">{heading}</h2>
        {subheading && <p className="m-0 mt-1 text-sm text-[#6e6e73]">{subheading}</p>}
      </header>

      {metrics.length > 0 && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {metrics.map((m, i) => (
            <div key={i} className="rounded-xl bg-[#0a84ff]/10 p-4">
              <div className="text-[32px] font-bold leading-none tracking-tight tabular-nums">{m.value}</div>
              <div className="mt-1.5 text-xs text-[#6e6e73]">{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {steps.length > 0 && (
        <ol className="m-0 flex list-none flex-col gap-1 p-0">
          {steps.map((s, i) => (
            <li key={i} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-xl px-2 py-2.5">
              <span
                aria-hidden
                className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ background: STEP_COLORS[i % STEP_COLORS.length] }}
              >
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-semibold">{s.name}</span>
                <span className="text-[13px] leading-normal text-[#3a3a3c]">{s.desc}</span>
              </div>
            </li>
          ))}
        </ol>
      )}

      {chart && chart.bars.length > 0 && (
        <figure className="m-0 flex flex-col gap-2">
          <figcaption className="text-[13px] font-semibold">{chart.title}</figcaption>
          <div className="flex h-40 items-end gap-3.5 px-1.5">
            {chart.bars.map((b, i) => (
              <div key={i} className="flex h-full flex-1 flex-col gap-1">
                <span className="text-center text-xs font-bold tabular-nums">{b.value}</span>
                <div className="flex min-h-0 flex-1 items-end">
                  <span
                    className="block w-full rounded-md bg-[#0a84ff]"
                    style={{ height: `${(Math.max(0, b.value) / max) * 100}%` }}
                  />
                </div>
                <span className="text-center text-[11px] font-medium text-[#6e6e73]">{b.label}</span>
              </div>
            ))}
          </div>
        </figure>
      )}
    </div>
  );
}
