import { readProgress, trackEvent } from './gameEvents';
import { bubbleFor, bubbleSignature, markBubbleSeen } from './notifications';
import type { PortfolioApp, SiteData } from './types';

export interface OpenEffectDeps {
  trackEvent: typeof trackEvent;
  markBubbleSeen: typeof markBubbleSeen;
  readProgress: typeof readProgress;
}

const browser: OpenEffectDeps = { trackEvent, markBubbleSeen, readProgress };

/**
 * What opening an app counts for: a step toward the achievements, and clearing its notification bubble.
 * A silent open (the guided tour) does neither, so watching never unlocks Explorer, Seen it all, Platinum or the finale.
 */
export function recordOpen(app: PortfolioApp, data: SiteData, totalApps: number, silent = false, deps: OpenEffectDeps = browser): void {
  if (silent) return;
  deps.trackEvent({ type: 'open', appId: app.id, totalApps });
  deps.markBubbleSeen(app.id, bubbleSignature(app, bubbleFor(app, data, deps.readProgress())));
}
