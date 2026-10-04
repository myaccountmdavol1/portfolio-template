// The chat reply travels as NDJSON: one JSON event per line — reply text as it streams, and at most one "show".

export interface ShowEvent {
  type: 'show';
  open: string;
  item?: string;
  label: string;
}

export type ChatEvent = { type: 'text'; text: string } | ShowEvent;

export const encodeEvent = (event: ChatEvent): string => `${JSON.stringify(event)}\n`;

function isChatEvent(value: unknown): value is ChatEvent {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  if (e.type === 'text') return typeof e.text === 'string';
  if (e.type === 'show') return typeof e.open === 'string' && typeof e.label === 'string' && (e.item === undefined || typeof e.item === 'string');
  return false;
}

function parseLine(line: string): ChatEvent[] {
  if (!line.trim()) return [];
  try {
    const value: unknown = JSON.parse(line);
    return isChatEvent(value) ? [value] : [];
  } catch {
    return [];
  }
}

/** Splits a streamed body into events, holding a partial last line until the rest arrives. Bad lines are skipped. */
export function createEventReader() {
  let buffer = '';
  return {
    push(chunk: string): ChatEvent[] {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      return lines.flatMap(parseLine);
    },
    end(): ChatEvent[] {
      const rest = buffer;
      buffer = '';
      return parseLine(rest);
    },
  };
}
