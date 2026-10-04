// The "Deploy" button for the public template: Vercel's clone flow copies the repo into the visitor's GitHub,
// adds a free Neon database and a public Blob store, and asks for SETUP_CODE. Used by README.md (kept in sync
// by deployButton.test.ts) and by /make-your-own. No imports, so client and server code can both use it.

/** The public template repo the README's button deploys. */
export const TEMPLATE_REPO_URL = 'https://github.com/myaccountmdavol1/portfolio-template';

/** Shown under the SETUP_CODE field in Vercel's deploy flow. The 12 matches MIN_SETUP_CODE_LENGTH. */
export const SETUP_CODE_HELP =
  'Make up a setup code of at least 12 characters and keep it somewhere safe. You’ll use it once to claim your site, and again if you ever forget your password.';

/**
 * The storage Vercel creates during the deploy. productSlug "neon" matches Vercel's own templates; confirm it
 * on the real clone page (plan Task 8) before relying on it.
 */
export const DEPLOY_STORES = [
  { type: 'integration', integrationSlug: 'neon', productSlug: 'neon', protocol: 'storage' },
  { type: 'blob', access: 'public' },
] as const;

/** https://vercel.com/new/clone?… for `repoUrl`. Every value is URL-encoded (spaces as "+"). */
export function deployButtonUrl(repoUrl: string): string {
  const params = new URLSearchParams({
    'repository-url': repoUrl,
    'project-name': 'my-portfolio',
    'repository-name': 'my-portfolio',
    env: 'SETUP_CODE',
    envDescription: SETUP_CODE_HELP,
    envLink: `${repoUrl}#your-setup-code`,
    stores: JSON.stringify(DEPLOY_STORES),
  });
  return `https://vercel.com/new/clone?${params}`;
}
