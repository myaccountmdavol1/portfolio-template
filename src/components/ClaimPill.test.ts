import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ClaimPill } from './ClaimPill';

describe('ClaimPill', () => {
  it('links to /admin with the claim wording', () => {
    const html = renderToStaticMarkup(createElement(ClaimPill));
    expect(html).toMatch(/^<a [^>]*href="\/admin"/);
    expect(html).toContain('data-testid="claim-pill"');
    expect(html.replace(/<[^>]+>/g, '')).toBe('Finish setting up · Claim your site');
  });
});
