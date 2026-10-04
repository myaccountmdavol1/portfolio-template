import { describe, expect, it } from 'vitest';
import { MIN_SETUP_CODE_LENGTH } from './auth/owner';
import { DEPLOY_STORES, deployButtonUrl, SETUP_CODE_HELP, TEMPLATE_REPO_URL } from './deployButton';
import { readFileSync } from 'node:fs';

const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
const readmeTop = readme.slice(0, readme.indexOf('## Run it locally'));

const REPO = 'https://github.com/example-user/example-template';

describe('deployButtonUrl', () => {
  it('sends the repo, names, setup code prompt, and a Neon database plus a public Blob store', () => {
    const url = new URL(deployButtonUrl(REPO));
    expect(url.origin + url.pathname).toBe('https://vercel.com/new/clone');
    expect([...url.searchParams.keys()]).toEqual([
      'repository-url',
      'project-name',
      'repository-name',
      'env',
      'envDescription',
      'envLink',
      'stores',
    ]);
    expect(url.searchParams.get('repository-url')).toBe(REPO);
    expect(url.searchParams.get('project-name')).toBe('my-portfolio');
    expect(url.searchParams.get('repository-name')).toBe('my-portfolio');
    expect(url.searchParams.get('env')).toBe('SETUP_CODE');
    expect(url.searchParams.get('envDescription')).toBe(
      'Make up a setup code of at least 12 characters and keep it somewhere safe. You’ll use it once to claim your site, and again if you ever forget your password.',
    );
    expect(url.searchParams.get('envLink')).toBe(`${REPO}#your-setup-code`);
    expect(JSON.parse(url.searchParams.get('stores')!)).toEqual([
      { type: 'integration', integrationSlug: 'neon', productSlug: 'neon', protocol: 'storage' },
      { type: 'blob', access: 'public' },
    ]);
    expect(JSON.parse(url.searchParams.get('stores')!)).toEqual(DEPLOY_STORES);
  });

  it('encodes every value, so the URL is safe inside Markdown and HTML attributes', () => {
    expect(deployButtonUrl(REPO)).toMatch(/^https:\/\/vercel\.com\/new\/clone\?[A-Za-z0-9%+&=*._-]+$/);
  });

  it('builds exactly this URL for the template repo', () => {
    expect(TEMPLATE_REPO_URL).toBe('https://github.com/myaccountmdavol1/portfolio-template');
    expect(deployButtonUrl(TEMPLATE_REPO_URL)).toBe(
      'https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmyaccountmdavol1%2Fportfolio-template&project-name=my-portfolio&repository-name=my-portfolio&env=SETUP_CODE&envDescription=Make+up+a+setup+code+of+at+least+12+characters+and+keep+it+somewhere+safe.+You%E2%80%99ll+use+it+once+to+claim+your+site%2C+and+again+if+you+ever+forget+your+password.&envLink=https%3A%2F%2Fgithub.com%2Fmyaccountmdavol1%2Fportfolio-template%23your-setup-code&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%2C%7B%22type%22%3A%22blob%22%2C%22access%22%3A%22public%22%7D%5D',
    );
  });

  it('asks for a setup code as long as sign-in requires', () => {
    expect(SETUP_CODE_HELP).toContain(`at least ${MIN_SETUP_CODE_LENGTH} characters`);
  });
});

describe('README', () => {
  it('has the Deploy button with exactly the template URL', () => {
    expect(readme).toContain(`[![Deploy with Vercel](https://vercel.com/button)](${deployButtonUrl(TEMPLATE_REPO_URL)})`);
  });

  it('starts with the three steps, then the setup code and troubleshooting sections', () => {
    expect(readmeTop).toContain('1. Click **Deploy** and sign in to Vercel with GitHub.');
    expect(readmeTop).toContain('3. Open your new site and click **Claim your site**, then enter your setup code and choose a password.');
    expect(readmeTop).toContain('## Your setup code');
    expect(readmeTop).toContain('## If something goes wrong');
  });

  it('uses typographic apostrophes in the new top section', () => {
    expect(readmeTop).toContain('\u2019');
    expect(readmeTop).not.toContain("'");
  });
});
