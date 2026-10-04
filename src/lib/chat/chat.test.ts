import { describe, expect, it } from 'vitest';
import { starterApp } from '../editor/starters';
import { withDeepLinkFixture } from '../fixtures/deepLinkFixture';
import { seedSiteData } from '../seed';
import type { MessagesApp } from '../types';
import { chatLimitsFromEnv, memoryCounterStore, takeChatQuota } from './limits';
import { buildSystemPrompt, portfolioKnowledge } from './prompt';
import { MAX_HISTORY_TURNS, parseChatRequest } from './request';

const app = starterApp('messages', 'messages-1', 99) as MessagesApp;

describe('buildSystemPrompt', () => {
  it('includes the portfolio content, email, and persona', () => {
    const prompt = buildSystemPrompt(seedSiteData, { ...app, content: { ...app.content, persona: 'Say hi like a pirate.' } });
    expect(prompt).toContain('Helen Keller');
    expect(prompt).toContain('Master of Science');
    expect(prompt).toContain('you@example.com');
    expect(prompt).toContain('Say hi like a pirate.');
  });

  it('is identical for the same data (so it can be prompt-cached)', () => {
    expect(buildSystemPrompt(seedSiteData, app)).toBe(buildSystemPrompt(seedSiteData, app));
  });

  it('leaves out hidden apps', () => {
    const hidden = { ...seedSiteData, apps: seedSiteData.apps.map((a) => (a.id === 'about' ? { ...a, visible: false } : a)) };
    expect(portfolioKnowledge(hidden)).not.toContain('Helen Keller');
  });

  it('describes badges but never payment cards', () => {
    const base = withDeepLinkFixture(seedSiteData);
    const site = {
      ...base,
      apps: base.apps.map((a) => (a.type === 'wallet' ? { ...a, content: { ...a.content, cards: [{ label: 'Venmo', url: 'https://venmo.com/u/secret-handle' }] } } : a)),
    };
    const knowledge = portfolioKnowledge(site);
    expect(knowledge).toContain('Google Certified Educator — Google for Education');
    expect(knowledge).toContain('Level 1');
    expect(knowledge).not.toContain('secret-handle');
  });

  it('lists what can be shown, with instructions for the show tool', () => {
    const prompt = buildSystemPrompt(withDeepLinkFixture(seedSiteData), app);
    expect(prompt).toContain('<showable>');
    expect(prompt).toContain('open=badges item=apple-learning-coach — Apple Learning Coach (badge)');
    expect(prompt).toContain('show tool');
  });
});

describe('parseChatRequest', () => {
  it('accepts a normal conversation', () => {
    const r = parseChatRequest({ appId: 'm', messages: [{ role: 'user', content: 'Hi' }] });
    expect(r).toEqual({ ok: true, appId: 'm', conversationId: null, turns: [{ role: 'user', content: 'Hi' }] });
    const withId = parseChatRequest({ appId: 'm', conversationId: '3b2c9a1e-1111-4222-8333-944455556666', messages: [{ role: 'user', content: 'Hi' }] });
    expect(withId.ok && withId.conversationId).toBe('3b2c9a1e-1111-4222-8333-944455556666');
    const badId = parseChatRequest({ appId: 'm', conversationId: '../x', messages: [{ role: 'user', content: 'Hi' }] });
    expect(badId.ok && badId.conversationId).toBeNull();
  });

  it('rejects bad shapes, over-long messages, and a trailing assistant turn', () => {
    expect(parseChatRequest(null).ok).toBe(false);
    expect(parseChatRequest({ appId: 'm', messages: [{ role: 'system', content: 'x' }] }).ok).toBe(false);
    expect(parseChatRequest({ appId: 'm', messages: [{ role: 'user', content: 'x'.repeat(601) }] }).ok).toBe(false);
    expect(parseChatRequest({ appId: 'm', messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] }).ok).toBe(false);
  });

  it('keeps only recent history and starts it on a user turn', () => {
    const messages = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 === 0 ? 'user' : 'assistant', content: `m${i}` }));
    messages.push({ role: 'user', content: 'last' });
    const r = parseChatRequest({ appId: 'm', messages });
    if (!r.ok) throw new Error(r.error);
    expect(r.turns.length).toBeLessThanOrEqual(MAX_HISTORY_TURNS);
    expect(r.turns[0].role).toBe('user');
    expect(r.turns.at(-1)?.content).toBe('last');
  });
});

describe('takeChatQuota', () => {
  const limits = { perVisitorPerHour: 2, perSitePerDay: 3 };
  const now = new Date('2026-09-29T18:30:00Z');

  it('allows up to the per-visitor hourly limit', async () => {
    const store = memoryCounterStore();
    expect(await takeChatQuota(store, 'a', limits, now)).toEqual({ ok: true });
    expect(await takeChatQuota(store, 'a', limits, now)).toEqual({ ok: true });
    expect(await takeChatQuota(store, 'a', limits, now)).toEqual({ ok: false, reason: 'visitor' });
    // A new hour resets the visitor's allowance.
    expect(await takeChatQuota(store, 'a', limits, new Date('2026-09-29T19:01:00Z'))).toEqual({ ok: true });
  });

  it('enforces the site-wide daily cap across visitors', async () => {
    const store = memoryCounterStore();
    for (const v of ['a', 'b', 'c']) expect((await takeChatQuota(store, v, limits, now)).ok).toBe(true);
    expect(await takeChatQuota(store, 'd', limits, now)).toEqual({ ok: false, reason: 'site' });
  });

  it('reads limits from env with safe defaults', () => {
    expect(chatLimitsFromEnv({})).toEqual({ perVisitorPerHour: 15, perSitePerDay: 100 });
    expect(chatLimitsFromEnv({ CHAT_LIMIT_PER_DAY: '40', CHAT_LIMIT_PER_VISITOR_HOURLY: 'nope' })).toEqual({ perVisitorPerHour: 15, perSitePerDay: 40 });
  });
});
