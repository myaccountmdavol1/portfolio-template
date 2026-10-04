'use client';

import { helloLines, type HelloSettings } from '@/lib/screensavers/hello';
import type { SaverProps } from '../saverProps';
import { useSequence } from '../useLoop';

const WORD_MS = 3300;
const LAST_MS = 4200;

/** “hello” handwritten in the accent colour, cycling through languages, ending on the owner's line. */
export function HelloSaver({ data, settings, reduced }: SaverProps<HelloSettings>) {
  const lines = helloLines(settings);
  const lastIndex = lines.length - 1;
  const hasFinal = settings.finalLine.trim() !== '';
  const duration = (i: number) => (hasFinal && i === lastIndex ? LAST_MS : WORD_MS);
  const index = useSequence(lines.length, duration, !reduced);
  const shown = reduced ? lastIndex : index;
  const text = lines[shown];
  if (!text) return null;
  const accent = data.site.accent;
  const fontSize = Math.min(120, Math.round(1500 / Math.max(4, text.length)));
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: `radial-gradient(circle at 50% 40%, color-mix(in srgb, ${accent} 22%, #000) 0%, #050505 75%)` }}>
      <svg viewBox="0 0 900 260" className="h-[60%] w-[86%] overflow-visible">
        <text
          key={shown}
          x="450"
          y="175"
          textAnchor="middle"
          className={reduced ? undefined : 'saver-hello-word'}
          style={{
            fontFamily: 'var(--font-handwriting), cursive',
            fontSize,
            stroke: accent,
            fill: accent,
            fillOpacity: reduced ? 0.95 : undefined,
            strokeWidth: 2.4,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            animationDuration: `${duration(shown)}ms`,
          }}
        >
          {text}
        </text>
      </svg>
    </div>
  );
}
