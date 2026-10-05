import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEventReader, type ChatEvent } from '@/lib/chat/events';

// The route with a fake model: each `stream()` call returns the next scripted turn.

const streamMock = vi.hoisted(() => vi.fn());
const h = vi.hoisted(() => ({ store: null as unknown, apiKeys: [] as (string | null | undefined)[] }));

vi.mock('@anthropic-ai/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@anthropic-ai/sdk')>();
  // Real error classes (the route checks them with instanceof); only the network call is faked.
  class FakeAnthropic extends actual.default {
    constructor(options?: { apiKey?: string | null }) {
      super({ apiKey: 'test-key' });
      h.apiKeys.push(options?.apiKey);
      this.beta.messages.stream = streamMock;
    }
  }
  return { ...actual, default: FakeAnthropic };
});

vi.mock('@/lib/getSiteData', async () => {
  const { starterApp } = await import('@/lib/editor/starters');
  const { withDeepLinkFixture } = await import('@/lib/fixtures/deepLinkFixture');
  const { seedSiteData } = await import('@/lib/seed');
  const site = withDeepLinkFixture(seedSiteData);
  const withChat = { ...site, apps: [...site.apps, starterApp('messages', 'm-1', 99)] };
  return { getPublishedSite: async () => withChat };
});

vi.mock('@/lib/store', () => ({ getStore: () => h.store }));

const { POST } = await import('./route');
const { encryptSecret } = await import('@/lib/addons/secrets');
const { memoryCounterStore } = await import('@/lib/chat/limits');

interface Block {
  type: string;
  [key: string]: unknown;
}

/** A scripted model turn: streams text deltas, then resolves to a message with the given blocks. */
function turn(blocks: Block[], stopReason = blocks.some((b) => b.type === 'tool_use') ? 'tool_use' : 'end_turn') {
  const events = blocks.flatMap((b, index) =>
    b.type === 'text' && typeof b.text === 'string' && b.text ? [{ type: 'content_block_delta', index, delta: { type: 'text_delta', text: b.text } }] : [],
  );
  return {
    async *[Symbol.asyncIterator]() {
      yield* events;
    },
    finalMessage: async () => ({ id: 'msg', type: 'message', role: 'assistant', model: 'test', content: blocks, stop_reason: stopReason }),
    abort: vi.fn(),
  };
}

const text = (t: string): Block => ({ type: 'text', text: t, citations: null });
const showCall = (input: Record<string, unknown>, id = 'toolu_1'): Block => ({ type: 'tool_use', id, name: 'show', input });

async function chat(question: string): Promise<ChatEvent[]> {
  const res = await POST(
    new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: 'm-1', messages: [{ role: 'user', content: question }] }),
    }),
  );
  expect(res.status).toBe(200);
  const reader = createEventReader();
  return [...reader.push(await res.text()), ...reader.end()];
}

const requestOf = (call: number) => streamMock.mock.calls[call][0] as Record<string, unknown> & { messages: { role: string; content: unknown }[] };
const textOf = (events: ChatEvent[]) => events.flatMap((e) => (e.type === 'text' ? [e.text] : [])).join('');
const shows = (events: ChatEvent[]) => events.filter((e) => e.type === 'show');

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.CHAT_LIMIT_PER_VISITOR_HOURLY = '1000';
  streamMock.mockReset();
  h.store = null;
  h.apiKeys = [];
});
afterEach(() => vi.unstubAllEnvs());

const ask = (question: string) =>
  POST(
    new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: 'm-1', messages: [{ role: 'user', content: question }] }),
    }),
  );

describe('POST /api/chat: which key', () => {
  it('passes the hosting key to the client explicitly', async () => {
    streamMock.mockReturnValueOnce(turn([text('Hi!')]));
    await chat('Hello');
    expect(h.apiKeys).toEqual(['test-key']);
  });

  it('uses the key saved in Add-ons when the hosting sets none', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('SETUP_CODE', 'chat-route-setup-code');
    const sealed = encryptSecret('sk-ant-saved', 'chat-route-setup-code');
    h.store = { addons: { get: async () => ({ anthropicKey: sealed, updatedAt: 'x' }) }, counters: memoryCounterStore(), chatLogs: { append: async () => {} } };
    streamMock.mockReturnValueOnce(turn([text('Hi!')]));
    await chat('Hello');
    expect(h.apiKeys).toEqual(['sk-ant-saved']);
  });

  it('answers 503 unconfigured with no key anywhere, before calling the model', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const res = await ask('Hello');
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: 'unconfigured' });
    expect(streamMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/chat', () => {
  it('streams text, then the show, in one model call', async () => {
    streamMock.mockReturnValueOnce(turn([text('Here is my coach badge.'), showCall({ open: 'badges', item: 'apple-learning-coach' })]));
    const events = await chat('Show me your Apple badge');
    expect(events).toEqual([
      { type: 'text', text: 'Here is my coach badge.' },
      { type: 'show', open: 'badges', item: 'apple-learning-coach', label: 'Apple Learning Coach' },
    ]);
    expect(streamMock).toHaveBeenCalledTimes(1);
    expect(requestOf(0).tool_choice).toEqual({ type: 'auto', disable_parallel_tool_use: true });
    expect(requestOf(0).tools).toHaveLength(1);
  });

  it('asks once more, text only, when it showed before saying anything', async () => {
    const first = [showCall({ open: 'badges', item: 'apple-learning-coach' })];
    streamMock.mockReturnValueOnce(turn(first)).mockReturnValueOnce(turn([text('That’s my Apple Learning Coach badge.')]));
    const events = await chat('Open your Apple badge');
    expect(streamMock).toHaveBeenCalledTimes(2);
    const followUp = requestOf(1);
    expect(followUp.tool_choice).toEqual({ type: 'none' });
    expect(followUp.tools).toHaveLength(1); // the history holds a tool_use block
    expect(followUp.messages.slice(-2)).toEqual([
      { role: 'assistant', content: first },
      { role: 'user', content: [expect.objectContaining({ type: 'tool_result', tool_use_id: 'toolu_1' })] },
    ]);
    expect(events).toEqual([
      { type: 'show', open: 'badges', item: 'apple-learning-coach', label: 'Apple Learning Coach' },
      { type: 'text', text: 'That’s my Apple Learning Coach badge.' },
    ]);
  });

  it('treats whitespace before the show as no text, and leaves it out of the echoed turn', async () => {
    const call = showCall({ open: 'badges', item: 'apple-learning-coach' });
    streamMock.mockReturnValueOnce(turn([text('\n\n'), call])).mockReturnValueOnce(turn([text('My coach badge!')]));
    const events = await chat('Open your Apple badge');
    expect(streamMock).toHaveBeenCalledTimes(2);
    const echoed = requestOf(1).messages.at(-2);
    expect(echoed).toEqual({ role: 'assistant', content: [call] });
    expect(textOf(events)).toBe('\n\nMy coach badge!');
    expect(shows(events)).toHaveLength(1);
  });

  it('says “Here it is!” when the follow-up has no words for something it opened', async () => {
    streamMock.mockReturnValueOnce(turn([showCall({ open: 'badges', item: 'apple-learning-coach' })])).mockReturnValueOnce(turn([]));
    const events = await chat('Just open it');
    expect(shows(events)).toHaveLength(1);
    expect(events.at(-1)).toEqual({ type: 'text', text: 'Here it is!' });
    expect(textOf(events)).not.toContain('can’t help');
  });

  it('drops a show the site can’t open', async () => {
    streamMock.mockReturnValueOnce(turn([text('Opening it now.'), showCall({ open: 'nope' })]));
    const events = await chat('Open the thing');
    expect(shows(events)).toHaveLength(0);
    expect(textOf(events)).toBe('Opening it now.');
    expect(streamMock).toHaveBeenCalledTimes(1);
  });
});
