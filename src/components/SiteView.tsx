'use client';

import { Desktop } from '@/components/desktop/Desktop';
import { Phone } from '@/components/phone/Phone';
import { useIsPhone } from '@/hooks/useIsPhone';
import type { SiteData } from '@/lib/types';

/** What every visitor sees. Links (/?open=…) and the address bar work here, never in the editor. */
export function SiteView({ data, initialIsPhone }: { data: SiteData; initialIsPhone: boolean }) {
  const isPhone = useIsPhone(initialIsPhone);
  return isPhone ? <Phone data={data} linkSync /> : <Desktop data={data} linkSync />;
}
