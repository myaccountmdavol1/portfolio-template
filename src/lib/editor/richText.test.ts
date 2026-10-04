import { describe, expect, it } from 'vitest';
import { richTextToText, sameRichText, textToRichText } from './richText';

describe('rich text ⇄ text', () => {
  const rich = {
    blocks: [
      { type: 'paragraph' as const, text: 'Intro.' },
      { type: 'heading' as const, text: 'What I learned' },
      { type: 'paragraph' as const, text: 'Line one\nline two' },
    ],
  };

  it('round-trips paragraphs and headings', () => {
    expect(richTextToText(rich)).toBe('Intro.\n\n## What I learned\n\nLine one\nline two');
    expect(textToRichText(richTextToText(rich))).toEqual(rich);
  });

  it('ignores extra blank lines and surrounding whitespace', () => {
    expect(textToRichText('\n\n A \n\n\n\nB\n')).toEqual({ blocks: [{ type: 'paragraph', text: 'A' }, { type: 'paragraph', text: 'B' }] });
    expect(textToRichText('')).toEqual({ blocks: [] });
  });

  it('sameRichText compares by value', () => {
    expect(sameRichText(textToRichText('A'), textToRichText('A\n\n'))).toBe(true);
    expect(sameRichText(textToRichText('A'), textToRichText('B'))).toBe(false);
  });
});
