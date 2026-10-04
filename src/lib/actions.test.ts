import { describe, expect, it, vi } from 'vitest';
import { parseAction, runAction } from './actions';

describe('parseAction', () => {
  it('parses openApp actions', () => {
    expect(parseAction('openApp:about')).toEqual({ kind: 'openApp', appId: 'about' });
  });
  it('parses url actions, keeping everything after the first colon', () => {
    expect(parseAction('url:https://x.com/a?b=c')).toEqual({ kind: 'url', href: 'https://x.com/a?b=c' });
    expect(parseAction('url:mailto:me@x.com')).toEqual({ kind: 'url', href: 'mailto:me@x.com' });
  });
  it('returns none for empty or unknown actions', () => {
    expect(parseAction('openApp:')).toEqual({ kind: 'none' });
    expect(parseAction('url:')).toEqual({ kind: 'none' });
    expect(parseAction('')).toEqual({ kind: 'none' });
    expect(parseAction('launch:rocket')).toEqual({ kind: 'none' });
  });
});

describe('runAction', () => {
  it('calls openApp for openApp actions', () => {
    const openApp = vi.fn();
    runAction('openApp:resume', openApp);
    expect(openApp).toHaveBeenCalledWith('resume');
  });
  it('does nothing for unknown actions', () => {
    const openApp = vi.fn();
    runAction('nonsense', openApp);
    expect(openApp).not.toHaveBeenCalled();
  });
});

describe('describeAction / actionString', async () => {
  const { actionString, describeAction } = await import('./actions');
  it('round-trips each kind of action', () => {
    for (const a of ['openApp:mail-1', 'url:mailto:me@x.dev', 'url:https://x.dev', '']) {
      expect(actionString(describeAction(a))).toBe(a);
    }
  });
  it('reads mailto links as “email me”', () => {
    expect(describeAction('url:mailto:me@x.dev')).toEqual({ mode: 'email', address: 'me@x.dev' });
    expect(describeAction('garbage')).toEqual({ mode: 'none' });
  });
});
