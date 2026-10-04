import { describe, expect, it } from 'vitest';
import { composeLinks, parseContact } from './contact';

describe('parseContact', () => {
  it('accepts a complete message', () => {
    expect(parseContact({ appId: 'm', name: ' Ada ', email: 'ada@x.dev', subject: 'Hi', message: 'Hello!' })).toEqual({
      ok: true,
      message: { appId: 'm', name: 'Ada', email: 'ada@x.dev', subject: 'Hi', message: 'Hello!' },
    });
  });

  it('needs a name, a valid email, and a message', () => {
    expect(parseContact({ appId: 'm', name: '', email: 'a@b.co', message: 'x' }).ok).toBe(false);
    expect(parseContact({ appId: 'm', name: 'A', email: 'nope', message: 'x' }).ok).toBe(false);
    expect(parseContact({ appId: 'm', name: 'A', email: 'a@b.co', message: '  ' }).ok).toBe(false);
    expect(parseContact({ appId: 'm', name: 'A', email: 'a@b.co', message: 'x'.repeat(5001) }).ok).toBe(false);
  });
});

describe('composeLinks', () => {
  it('builds Gmail, Outlook, and mailto links', () => {
    const l = composeLinks('me@x.dev', 'Hi & bye', 'Line 1\nLine 2');
    expect(new URL(l.gmail).searchParams.get('su')).toBe('Hi & bye');
    expect(new URL(l.outlook).searchParams.get('to')).toBe('me@x.dev');
    expect(l.mailto).toBe('mailto:me@x.dev?subject=Hi%20%26%20bye&body=Line%201%0ALine%202');
    expect(composeLinks('me@x.dev', '', '').mailto).toBe('mailto:me@x.dev');
  });
});
