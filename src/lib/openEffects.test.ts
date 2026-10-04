import { describe, expect, it, vi } from 'vitest';
import { EMPTY_PROGRESS } from './achievements';
import { recordOpen, type OpenEffectDeps } from './openEffects';
import { seedSiteData } from './seed';

const fakeDeps = () => ({
  trackEvent: vi.fn<OpenEffectDeps['trackEvent']>(),
  markBubbleSeen: vi.fn<OpenEffectDeps['markBubbleSeen']>(),
  readProgress: vi.fn<OpenEffectDeps['readProgress']>(() => EMPTY_PROGRESS),
});
const app = { ...seedSiteData.apps[0], notification: { mode: 'dot' as const } };

describe('recordOpen', () => {
  it('counts an open toward achievements and clears its bubble', () => {
    const deps = fakeDeps();
    recordOpen(app, seedSiteData, 9, false, deps);
    expect(deps.trackEvent).toHaveBeenCalledWith({ type: 'open', appId: 'p1', totalApps: 9 });
    expect(deps.markBubbleSeen).toHaveBeenCalledWith('p1', 'dot:dot');
  });

  it('does neither for a silent open (the guided tour)', () => {
    const deps = fakeDeps();
    recordOpen(app, seedSiteData, 9, true, deps);
    expect(deps.trackEvent).not.toHaveBeenCalled();
    expect(deps.markBubbleSeen).not.toHaveBeenCalled();
  });
});
