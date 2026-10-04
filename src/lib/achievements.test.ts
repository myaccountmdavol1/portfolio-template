import { describe, expect, it } from 'vitest';
import { applyGameEvent, EMPTY_PROGRESS, type GameEvent, type Progress } from './achievements';

const run = (events: GameEvent[]) =>
  events.reduce<{ p: Progress; unlocked: string[] }>(
    (acc, e) => {
      const r = applyGameEvent(acc.p, e);
      return { p: r.progress, unlocked: [...acc.unlocked, ...r.newlyUnlocked.map((a) => a.id)] };
    },
    { p: EMPTY_PROGRESS, unlocked: [] },
  );
const open = (appId: string, totalApps = 10): GameEvent => ({ type: 'open', appId, totalApps });

describe('applyGameEvent', () => {
  it('unlocks the first-app, explorer, and seen-it-all achievements as apps are opened', () => {
    expect(run([open('a')]).unlocked).toEqual(['first-app']);
    expect(run(['a', 'b', 'c', 'd', 'e'].map((id) => open(id))).unlocked).toEqual(['first-app', 'explorer']);
    expect(run(['a', 'b', 'c'].map((id) => open(id, 3))).unlocked).toEqual(['first-app', 'seen-it-all']);
  });

  it('counts each app once and unlocks each achievement once', () => {
    const r = run([open('a'), open('a'), open('a'), { type: 'chat' }, { type: 'chat' }]);
    expect(r.p.opened).toEqual(['a']);
    expect(r.unlocked).toEqual(['first-app', 'chatty']);
  });

  it('returns the same progress object when nothing changes', () => {
    const once = applyGameEvent(EMPTY_PROGRESS, { type: 'sudo' }).progress;
    expect(applyGameEvent(once, { type: 'sudo' }).progress).toBe(once);
  });
});

describe('which achievements a site offers', async () => {
  const { achievementStatuses, activeAchievements } = await import('./achievements');
  const { seedSiteData } = await import('./seed');
  const { starterApp } = await import('./editor/starters');
  const ids = (d: typeof seedSiteData) => activeAchievements(d).map((a) => a.id);

  it('drops achievements for apps the site doesn’t have', () => {
    const active = ids(seedSiteData);
    expect(active).not.toContain('hacker'); // no Terminal in the sample site
    expect(active).not.toContain('chatty');
    expect(active).toContain('searcher');
    const withTerminal = { ...seedSiteData, apps: [...seedSiteData.apps, starterApp('terminal', 'terminal-1', 99)] };
    expect(ids(withTerminal)).toContain('hacker');
  });

  it('swaps Night owl for Early bird when the site starts dark', () => {
    expect(ids(seedSiteData)).toContain('night-owl');
    const dark = { ...seedSiteData, site: { ...seedSiteData.site, appearance: 'dark' as const } };
    expect(ids(dark)).toContain('early-bird');
    expect(ids(dark)).not.toContain('night-owl');
  });

  it('respects achievements the owner switched off, and explains unavailable ones', () => {
    const gc = { ...starterApp('gamecenter', 'gc', 99), content: { tagline: '', disabledAchievements: ['searcher'] } };
    const data = { ...seedSiteData, apps: [...seedSiteData.apps, gc] } as typeof seedSiteData;
    expect(ids(data)).not.toContain('searcher');
    expect(achievementStatuses(data).find((s) => s.achievement.id === 'hacker')?.reason).toBe('needs a Terminal app');
  });
});

describe('secret achievements', async () => {
  const { ACHIEVEMENTS, achievementStatuses, activeAchievements, applyGameEvent, EMPTY_PROGRESS, secretAchievements } = await import('./achievements');
  const { seedSiteData } = await import('./seed');
  const { starterApp } = await import('./editor/starters');

  it('Lost & found is a bonus: offered with a Game Center, never needed for Platinum', () => {
    expect(secretAchievements(seedSiteData)).toEqual([]); // no Game Center in the sample site
    const withGc = { ...seedSiteData, apps: [...seedSiteData.apps, starterApp('gamecenter', 'gc', 99)] };
    expect(secretAchievements(withGc).map((a) => a.id)).toEqual(['lost', 'tour', 'corner', 'password']);
    expect(activeAchievements(withGc).map((a) => a.id)).not.toContain('lost');
  });

  it('Took the tour is a bonus too: it unlocks on its own and never counts towards Platinum', () => {
    const withGc = { ...seedSiteData, apps: [...seedSiteData.apps, starterApp('gamecenter', 'gc', 99)] };
    expect(applyGameEvent(EMPTY_PROGRESS, { type: 'tour' }).newlyUnlocked.map((a) => a.id)).toEqual(['tour']);
    expect(activeAchievements(withGc).map((a) => a.id)).not.toContain('tour');
  });

  it('Took the tour is unavailable (and not offered) when the site has no tour stops', () => {
    const withGc = { ...seedSiteData, apps: [...seedSiteData.apps, starterApp('gamecenter', 'gc', 99)] };
    const noStops = { ...withGc, site: { ...withGc.site, tour: { stops: [] } } } as typeof seedSiteData;
    const status = (d: typeof seedSiteData) => achievementStatuses(d).find((s) => s.achievement.id === 'tour');
    expect(status(withGc)).toMatchObject({ available: true, reason: null });
    expect(status(noStops)).toMatchObject({ available: false, reason: 'needs at least one tour stop' });
    expect(secretAchievements(noStops).map((a) => a.id)).toEqual(['lost', 'corner', 'password']);
  });

  it('each secret says where it’s found', () => {
    const hints = Object.fromEntries(ACHIEVEMENTS.filter((a) => a.secret).map((a) => [a.id, a.hint]));
    expect(hints).toEqual({
      lost: 'found on your 404 page',
      tour: 'for watching the guided tour to the end',
      corner: 'found in the Bouncing initials screen saver (an exact corner hit)',
      password: 'found on the lock screen (its hint gives the password away)',
    });
  });

  it('Corner shot and Password guru are bonuses that follow the screen saver settings', () => {
    const withGc = { ...seedSiteData, apps: [...seedSiteData.apps, starterApp('gamecenter', 'gc', 99)] };
    const reason = (d: typeof seedSiteData, id: string) => achievementStatuses(d).find((s) => s.achievement.id === id)?.reason;
    const saver = (screensaver: NonNullable<typeof seedSiteData.site.screensaver>) => ({ ...withGc, site: { ...withGc.site, screensaver } });
    expect(applyGameEvent(EMPTY_PROGRESS, { type: 'corner' }).newlyUnlocked.map((a) => a.id)).toEqual(['corner']);
    expect(applyGameEvent(EMPTY_PROGRESS, { type: 'password' }).newlyUnlocked.map((a) => a.id)).toEqual(['password']);
    expect(activeAchievements(withGc).map((a) => a.id)).not.toContain('corner');
    expect(activeAchievements(withGc).map((a) => a.id)).not.toContain('password');
    expect([reason(withGc, 'corner'), reason(withGc, 'password')]).toEqual([null, null]);
    expect(reason(saver({ enabled: false }), 'corner')).toBe('the screen saver is switched off');
    expect(reason(saver({ enabled: false }), 'password')).toBe('the lock screen is switched off');
    expect(reason(saver({ modules: { bounce: { on: false } } }), 'corner')).toBe('the Bouncing initials screen saver is switched off');
    expect(reason(saver({ modules: { bounce: { settings: { text: ' ' } } } }), 'corner')).toBe('the Bouncing initials screen saver has no text');
    expect(reason(saver({ pinned: 'facts' }), 'corner')).toBe('the screen saver always shows Fact of the Day');
    expect(reason(saver({ lock: { enabled: false } }), 'password')).toBe('the lock screen is switched off');
    expect(reason(saver({ lock: { password: null } }), 'password')).toBe('the lock screen has no password');
  });

  it('keeps the finish time when a later achievement unlocks', () => {
    const finished = { ...EMPTY_PROGRESS, startedAt: 1, finishedAt: 2 };
    const { progress } = applyGameEvent(finished, { type: 'lost' });
    expect(progress).toMatchObject({ startedAt: 1, finishedAt: 2, unlocked: ['lost'] });
  });
});
