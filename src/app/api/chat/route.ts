import { createHash } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { chatLimitsFromEnv, memoryCounterStore, takeChatQuota, type CounterStore } from '@/lib/chat/limits';
import { encodeEvent, type ChatEvent, type ShowEvent } from '@/lib/chat/events';
import { buildSystemPrompt } from '@/lib/chat/prompt';
import { parseChatRequest } from '@/lib/chat/request';
import { resolveShow } from '@/lib/chat/show';
import { showableTargets, showTool } from '@/lib/chat/showable';
import { getPublishedSite } from '@/lib/getSiteData';
import { getStore } from '@/lib/store';

// Server-only. The API key never reaches the browser.

// Opus 5 is the default; set CHAT_MODEL (e.g. claude-haiku-4-5) in the environment to trade quality for cost.
const MODEL = process.env.CHAT_MODEL || 'claude-opus-5';
const MAX_REPLY_TOKENS = 400; // a few sentences — also bounds the cost of every reply

let fallbackStore: CounterStore | null = null;
function counterStore(): CounterStore {
  const store = getStore();
  if (store) return store.counters;
  fallbackStore ??= memoryCounterStore(); // local dev without a backend: per-server-instance only
  return fallbackStore;
}

function visitorKey(request: Request): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  // Hashed so no raw IP addresses are ever stored.
  return createHash('sha256').update(`portfolio-chat:${ip}`).digest('hex').slice(0, 24);
}

const json = (status: number, body: { error: string; code?: string }) => Response.json(body, { status });

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return json(503, { error: 'Chat isn’t set up on this site yet.', code: 'unconfigured' });

  const parsed = parseChatRequest(await request.json().catch(() => null));
  if (!parsed.ok) return json(400, { error: parsed.error });

  const data = await getPublishedSite();
  const app = data.apps.find((a) => a.id === parsed.appId && a.visible);
  if (!app || app.type !== 'messages') return json(404, { error: 'This chat starts working once the site is published.' });

  const quota = await takeChatQuota(counterStore(), visitorKey(request), chatLimitsFromEnv()).catch((err: unknown) => {
    console.error('Chat rate limit check failed', err);
    return { ok: false as const, reason: 'site' as const }; // fail closed: never spend without a working limit
  });
  if (!quota.ok) {
    const contact = data.site.email ? ` Email me at ${data.site.email}!` : '';
    return json(429, {
      error: quota.reason === 'visitor' ? `You’ve sent a lot of messages — give it a little while.${contact}` : `I’ve hit my chat limit for today.${contact}`,
      code: 'rate_limited',
    });
  }

  const tool = showTool(showableTargets(data));
  const system = buildSystemPrompt(data, app);
  const client = new Anthropic();
  // The first turn may call show (at most one); the follow-up after a show may only write text.
  const firstChoice: Anthropic.Beta.BetaToolChoice = { type: 'auto', disable_parallel_tool_use: true };
  const ask = (messages: Anthropic.Beta.BetaMessageParam[], toolChoice: Anthropic.Beta.BetaToolChoice = firstChoice) =>
    client.beta.messages.stream({
      model: MODEL,
      max_tokens: MAX_REPLY_TOKENS,
      // Chat replies don't need deep reasoning; low effort keeps them quick and cheap.
      output_config: { effort: 'low' },
      // If a safety classifier declines, Anthropic retries on its recommended fallback model instead of failing.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // The show tool lets a reply open an app, badge or photo; at most one per reply.
      ...(tool ? { tools: [tool], tool_choice: toolChoice } : {}),
      // The portfolio is the same for every visitor, so cache it (and the tool before it): repeat questions pay ~10% for this part.
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages,
    });
  let stream = ask(parsed.turns);

  const encoder = new TextEncoder();
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let reply = '';
      let shown: ShowEvent | null = null;
      // Once the visitor has gone, the controller is closed: writing to it would throw.
      const send = (event: ChatEvent) => {
        if (!cancelled) controller.enqueue(encoder.encode(encodeEvent(event)));
      };
      /** Streams one model turn's text to the visitor and returns the finished message. */
      const relay = async (current: typeof stream) => {
        for await (const event of current) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            reply += event.delta.text;
            send({ type: 'text', text: event.delta.text });
          }
        }
        return current.finalMessage();
      };
      try {
        let final = await relay(stream);
        const call = final.stop_reason === 'refusal' ? undefined : final.content.find((b) => b.type === 'tool_use' && b.name === 'show');
        if (call && call.type === 'tool_use') {
          shown = resolveShow(data, call.input);
          if (shown) send(shown);
          else console.warn('Chat: dropped a show the site can’t open', call.input);
          if (!reply.trim() && !cancelled) {
            // It showed something before saying anything: one more turn for the sentence. The API rejects
            // whitespace-only text blocks, so those are dropped from the echoed turn; everything else stays in order.
            const echoed = final.content.filter((b) => b.type !== 'text' || b.text.trim());
            stream = ask(
              [
                ...parsed.turns,
                { role: 'assistant', content: echoed },
                { role: 'user', content: [{ type: 'tool_result', tool_use_id: call.id, content: shown ? 'Shown to the visitor.' : 'That couldn’t be shown.', ...(shown ? {} : { is_error: true }) }] },
              ],
              { type: 'none' }, // text only: it can't show a second thing
            );
            final = await relay(stream);
          }
        }
        if (final.stop_reason === 'refusal' || !reply.trim()) {
          // Something already opened: don't contradict it with a refusal.
          const fallback = reply.trim() ? '' : shown ? 'Here it is!' : 'I can’t help with that one — ask me about my work or how to get in touch!';
          if (fallback) {
            reply += fallback;
            send({ type: 'text', text: fallback });
          }
        }
        // Save the exchange so the owner can read it in the editor. Never let logging break the reply.
        const store = getStore();
        if (parsed.conversationId && store) {
          const question = parsed.turns[parsed.turns.length - 1].content;
          const saved = shown ? `${reply}\n→ showed ${shown.label}` : reply;
          await store.chatLogs.append(parsed.conversationId, app.id, question, saved).catch((err: unknown) =>
            console.error('Could not save chat log', err),
          );
        }
      } catch (err) {
        if (err instanceof Anthropic.RateLimitError) console.error('Anthropic rate limit hit', err.message);
        else if (err instanceof Anthropic.AuthenticationError) console.error('Invalid ANTHROPIC_API_KEY');
        else if (err instanceof Anthropic.APIError) console.error(`Anthropic API error ${err.status}`, err.message);
        else console.error('Chat stream failed', err);
        if (!reply.trim()) send({ type: 'text', text: 'Sorry — I couldn’t answer just now. Try again in a moment?' });
      } finally {
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
      stream.abort(); // visitor closed the chat: stop generating (and paying for) the reply
    },
  });

  return new Response(body, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } });
}
