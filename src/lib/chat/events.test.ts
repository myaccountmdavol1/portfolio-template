import { describe, expect, it } from 'vitest';
import { createEventReader, encodeEvent, type ChatEvent } from './events';

const text: ChatEvent = { type: 'text', text: 'Hi\nthere' };
const show: ChatEvent = { type: 'show', open: 'badges', item: 'x', label: 'X' };

describe('chat events', () => {
  it('encodes one JSON line per event (newlines inside text stay escaped)', () => {
    expect(encodeEvent(text)).toBe('{"type":"text","text":"Hi\\nthere"}\n');
  });

  it('reads events split across chunks', () => {
    const reader = createEventReader();
    const body = encodeEvent(text) + encodeEvent(show);
    const out = [...reader.push(body.slice(0, 7)), ...reader.push(body.slice(7, 40)), ...reader.push(body.slice(40)), ...reader.end()];
    expect(out).toEqual([text, show]);
  });

  it('reads a last line without a newline at the end', () => {
    const reader = createEventReader();
    expect(reader.push('{"type":"text","text":"a"}')).toEqual([]);
    expect(reader.end()).toEqual([{ type: 'text', text: 'a' }]);
  });

  it('skips malformed lines and unknown or incomplete events', () => {
    const reader = createEventReader();
    const out = reader.push('not json\n{"type":"other"}\n{"type":"show","open":"a"}\n{"type":"text","text":5}\n\n{"type":"text","text":"ok"}\n');
    expect(out).toEqual([{ type: 'text', text: 'ok' }]);
  });
});
