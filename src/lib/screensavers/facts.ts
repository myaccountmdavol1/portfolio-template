import { monthYear } from '../badges';
import { asRecord, sitePasses, visibleApps, type ScreensaverModule } from './module';
import type { SiteData } from '../types';

export interface SaverFact {
  label: string; // small heading in the accent colour
  fact: string; // the big line
  detail: string; // the small line under it
}

export interface FactsSettings {
  facts: SaverFact[];
}

export const MAX_FACTS = 8;

/** Facts from the site's own content: About Me's role, the badges, the Stats metrics. */
export function generatedFacts(site: SiteData): SaverFact[] {
  const apps = visibleApps(site);
  const out: SaverFact[] = [];
  const about = apps.find((a) => a.type === 'about');
  if (about?.type === 'about' && about.content.roleTitle.trim()) out.push({ label: 'Right now', fact: about.content.roleTitle.trim(), detail: site.site.ownerName.trim() });
  const passes = sitePasses(site).map((p) => p.pass);
  if (passes.length > 1) {
    const issuers = [...new Set(passes.map((p) => p.issuer.trim()).filter(Boolean))].slice(0, 4);
    out.push({ label: 'Credentials', fact: `${passes.length} badges and certifications`, detail: issuers.join(' · ') });
  }
  const newest = passes[0];
  if (newest) out.push({ label: 'Newest badge', fact: newest.title.trim(), detail: [newest.issuer.trim(), monthYear(newest.earned)].filter(Boolean).join(' · ') });
  const stats = apps.find((a) => a.type === 'stats');
  if (stats?.type === 'stats') {
    for (const m of stats.content.metrics) {
      if (m.value.trim() && m.label.trim()) out.push({ label: stats.content.heading.trim() || stats.title, fact: `${m.value.trim()} ${m.label.trim()}`, detail: stats.content.subheading.trim() });
    }
  }
  return out.slice(0, MAX_FACTS);
}

function readFacts(raw: unknown): SaverFact[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return raw.flatMap((f) => {
    const r = asRecord(f);
    return typeof r.fact === 'string' ? [{ label: str(r.label), fact: r.fact, detail: str(r.detail) }] : [];
  });
}

export const facts: ScreensaverModule<FactsSettings> = {
  id: 'facts',
  name: 'Fact of the Day',
  emptyNote: 'add a fact (or a role in About Me).',
  defaults: (site) => ({ facts: generatedFacts(site) }),
  read: (site, raw) => ({ facts: readFacts(asRecord(raw).facts) ?? generatedFacts(site) }),
  available: (_site, s) => s.facts.some((f) => f.fact.trim()),
};
