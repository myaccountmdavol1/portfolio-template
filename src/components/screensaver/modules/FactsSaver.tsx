'use client';

import type { FactsSettings } from '@/lib/screensavers/facts';
import type { SaverProps } from '../saverProps';
import { useSequence } from '../useLoop';

const FACT_MS = 5000;

/** Like Word of the Day, but about the owner: one fact in big type, then the next. */
export function FactsSaver({ data, settings, reduced }: SaverProps<FactsSettings>) {
  const facts = settings.facts.filter((f) => f.fact.trim());
  const index = useSequence(facts.length, () => FACT_MS, !reduced);
  const fact = facts[index];
  if (!fact) return null;
  return (
    <div className="absolute inset-0 flex flex-col justify-center bg-[#0b0b0d] px-[9%]">
      <div key={index} className="saver-fact">
        {fact.label.trim() && (
          <p className="m-0 mb-3 text-[clamp(11px,1vw,14px)] font-semibold uppercase tracking-[.14em]" style={{ color: data.site.accent }}>
            {fact.label}
          </p>
        )}
        <p className="m-0 font-serif text-[clamp(36px,5vw,72px)] leading-[1.12]">{fact.fact}</p>
        {fact.detail.trim() && <p className="m-0 mt-4 text-[clamp(13px,1.2vw,18px)] text-white/55">{fact.detail}</p>}
      </div>
    </div>
  );
}
