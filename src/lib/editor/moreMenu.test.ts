import { describe, expect, it } from 'vitest';
import { moreMenuEntries } from './moreMenu';

describe('moreMenuEntries', () => {
  it('offers Run setup again on Vercel-backend sites, after Version history', () => {
    expect(moreMenuEntries('http', true).map((e) => e.label)).toEqual([
      'Clean Up Desktop Icons',
      'Media library\u2026',
      'Version history\u2026',
      'Run setup again\u2026',
      'Discard draft changes\u2026',
      'Sign out',
    ]);
  });

  it('never on Firebase sites or in local mode, where there is no /setup', () => {
    expect(moreMenuEntries('firebase', true).map((e) => e.id)).not.toContain('setup');
    expect(moreMenuEntries('local', false).map((e) => e.id)).not.toContain('setup');
    expect(moreMenuEntries('local', false).at(-1)?.label).toBe('Leave the editor');
  });
});
