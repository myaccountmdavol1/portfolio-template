import { asRecord, firstName, stringList, type ScreensaverModule } from './module';
import type { SiteData } from '../types';

export interface HelloSettings {
  words: string[];
  finalLine: string; // written last; '' = none
}

export const HELLO_WORDS = ['hello', 'hola', 'bonjour', 'ciao', 'hallo', 'olá'];

/** The lines Hello writes, in order: the words, then the last line (blanks skipped). */
export function helloLines(s: HelloSettings): string[] {
  return [...s.words, s.finalLine].map((w) => w.trim()).filter(Boolean);
}

function helloDefaults(site: SiteData): HelloSettings {
  const first = firstName(site.site.ownerName);
  return { words: [...HELLO_WORDS], finalLine: first ? `I’m ${first}.` : '' };
}

export const hello: ScreensaverModule<HelloSettings> = {
  id: 'hello',
  name: 'Hello',
  emptyNote: 'add a word or a last line.',
  defaults: helloDefaults,
  read: (site, raw) => {
    const d = helloDefaults(site);
    const r = asRecord(raw);
    return { words: stringList(r.words) ?? d.words, finalLine: typeof r.finalLine === 'string' ? r.finalLine : d.finalLine };
  },
  available: (_site, s) => helloLines(s).length > 0,
};
