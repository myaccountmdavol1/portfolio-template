import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deployButtonUrl } from '@/lib/deployButton';
import MakeYourOwnPage from './page';

const REPO = 'https://github.com/example-user/example-template';

afterEach(() => vi.unstubAllEnvs());

function thrownBy(fn: () => unknown): unknown {
  try {
    fn();
  } catch (err) {
    return err;
  }
  return null;
}

describe('/make-your-own', () => {
  it('is a 404 without TEMPLATE_REPO_URL', () => {
    vi.stubEnv('TEMPLATE_REPO_URL', '');
    expect((thrownBy(() => MakeYourOwnPage()) as { digest?: string } | null)?.digest).toBe('NEXT_HTTP_ERROR_FALLBACK;404');
  });

  it('shows the pitch, the three steps, the Deploy button for that repo, the free plans and the README link', () => {
    vi.stubEnv('TEMPLATE_REPO_URL', REPO);
    const html = renderToStaticMarkup(MakeYourOwnPage());
    expect(html).toContain('Make your own portfolio desktop');
    expect(html).toContain(`href="${deployButtonUrl(REPO).replaceAll('&', '&amp;')}"`);
    expect(html).toContain('Deploy with Vercel');
    expect(html).toContain('Claim your site');
    expect(html).toContain('Vercel Hobby, Neon Free and Vercel Blob');
    expect(html).toContain(`href="${REPO}#readme"`);
    expect(html.match(/<li/g)).toHaveLength(3);
    expect(html).not.toContain("'");
  });
});
