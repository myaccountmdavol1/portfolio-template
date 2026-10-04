import type { RichText, RichTextBlock } from '../types';

// The inspector edits RichText as plain text: blank lines separate blocks, "## " starts a heading.

export function richTextToText(rich: RichText): string {
  return rich.blocks.map((b) => (b.type === 'heading' ? `## ${b.text}` : b.text)).join('\n\n');
}

export function textToRichText(text: string): RichText {
  const blocks: RichTextBlock[] = text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part.startsWith('## ') ? { type: 'heading', text: part.slice(3).trim() } : { type: 'paragraph', text: part }));
  return { blocks };
}

export function sameRichText(a: RichText, b: RichText): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
