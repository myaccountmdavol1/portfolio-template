import { isValidConversationId } from './log';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export const MAX_MESSAGE_CHARS = 600;
export const MAX_HISTORY_TURNS = 12;

export type ParsedChatRequest =
  | { ok: true; appId: string; conversationId: string | null; turns: ChatTurn[] }
  | { ok: false; error: string };

/** Validates the browser's request and keeps only the recent history the model needs. */
export function parseChatRequest(body: unknown): ParsedChatRequest {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request' };
  const { appId, messages, conversationId } = body as { appId?: unknown; messages?: unknown; conversationId?: unknown };
  if (typeof appId !== 'string' || !appId) return { ok: false, error: 'Missing appId' };
  if (!Array.isArray(messages) || messages.length === 0) return { ok: false, error: 'No messages' };
  const turns: ChatTurn[] = [];
  for (const m of messages) {
    if (!m || typeof m !== 'object') return { ok: false, error: 'Invalid message' };
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return { ok: false, error: 'Invalid message' };
    const text = content.trim();
    if (!text) continue;
    if (text.length > MAX_MESSAGE_CHARS) return { ok: false, error: `Messages can be at most ${MAX_MESSAGE_CHARS} characters` };
    turns.push({ role, content: text });
  }
  const recent = turns.slice(-MAX_HISTORY_TURNS);
  while (recent.length > 0 && recent[0].role !== 'user') recent.shift(); // the API needs a user turn first
  if (recent.length === 0 || recent[recent.length - 1].role !== 'user') return { ok: false, error: 'The last message must be from the visitor' };
  return { ok: true, appId, conversationId: isValidConversationId(conversationId) ? conversationId : null, turns: recent };
}
