'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { resolveModule } from '@/lib/screensavers/registry';
import type { ScreensaverModuleId, SiteData } from '@/lib/types';
import { useReducedMotion } from './useReducedMotion';

// Each module's code downloads only the first time it plays. (next/dynamic needs its options as an object literal.)
const HelloSaver = dynamic(() => import('./modules/HelloSaver').then((m) => m.HelloSaver), { ssr: false, loading: () => null });
const DriftSaver = dynamic(() => import('./modules/DriftSaver').then((m) => m.DriftSaver), { ssr: false, loading: () => null });
const MemoriesSaver = dynamic(() => import('./modules/MemoriesSaver').then((m) => m.MemoriesSaver), { ssr: false, loading: () => null });
const FactsSaver = dynamic(() => import('./modules/FactsSaver').then((m) => m.FactsSaver), { ssr: false, loading: () => null });
const FlurrySaver = dynamic(() => import('./modules/FlurrySaver').then((m) => m.FlurrySaver), { ssr: false, loading: () => null });
const BounceSaver = dynamic(() => import('./modules/BounceSaver').then((m) => m.BounceSaver), { ssr: false, loading: () => null });

interface ScreensaverProps {
  data: SiteData;
  moduleId: ScreensaverModuleId;
  onCorner: () => void;
}

/** The full-screen screen saver. Waking it is handled by useScreensaver (any key, press or real mouse move). */
export function Screensaver({ data, moduleId, onCorner }: ScreensaverProps) {
  const reduced = useReducedMotion();
  const common = { data, reduced, onCorner };
  let content: ReactNode = null;
  switch (moduleId) {
    case 'hello':
      content = <HelloSaver {...common} settings={resolveModule(data, 'hello').settings} />;
      break;
    case 'drift':
      content = <DriftSaver {...common} settings={resolveModule(data, 'drift').settings} />;
      break;
    case 'memories':
      content = <MemoriesSaver {...common} settings={resolveModule(data, 'memories').settings} />;
      break;
    case 'facts':
      content = <FactsSaver {...common} settings={resolveModule(data, 'facts').settings} />;
      break;
    case 'flurry':
      content = <FlurrySaver {...common} settings={resolveModule(data, 'flurry').settings} />;
      break;
    case 'bounce':
      content = <BounceSaver {...common} settings={resolveModule(data, 'bounce').settings} />;
      break;
  }
  return (
    <div data-testid="screensaver" data-module={moduleId} className="fixed inset-0 z-[9800] cursor-none select-none overflow-hidden bg-black text-white">
      <div aria-hidden className="absolute inset-0">
        {content}
      </div>
      <p role="status" className="sr-only">
        Screen saver — press any key
      </p>
    </div>
  );
}
