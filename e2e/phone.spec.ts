import { expect, test, type Page } from '@playwright/test';

async function skipIncomingCall(page: Page) {
  await page.addInitScript(() => window.sessionStorage.setItem('portfolio:incomingCallShown', '1'));
}

const home = (page: Page) => page.getByRole('region', { name: 'Home screen' });
const dock = (page: Page) => page.getByRole('navigation', { name: 'Dock' });
const sheetFor = (page: Page, name: string) => page.getByRole('dialog', { name, exact: true });

test('server renders the phone layout for an iPhone', async ({ page }) => {
  const html = await (await page.request.get('/')).text();
  expect(html).toContain('data-layout="phone"');
});

test.describe('phone layout', () => {
  test.beforeEach(async ({ page }) => {
    await skipIncomingCall(page);
    await page.goto('/');
    await expect(page.locator('[data-layout="phone"]')).toBeVisible();
  });

  test('shows the status bar, widgets, icons, and a 4-item dock', async ({ page }) => {
    await expect(page.getByTestId('status-bar')).toContainText(/\d:\d\d/);
    for (const name of ['To do', 'My Path', 'Project One', 'Project Two']) {
      await expect(home(page).getByRole('button', { name, exact: true })).toBeVisible();
    }
    await expect(dock(page).getByRole('button')).toHaveCount(4);
    // Dock apps are not repeated on the home grid.
    await expect(home(page).getByRole('button', { name: 'About Me', exact: true })).toHaveCount(0);
    // Everything fits on one page, so no page dots.
    await expect(page.getByTestId('page-dots')).toHaveCount(0);
  });

  const SHEETS = [
    { from: 'home', name: 'Project One', text: 'Mobile app · UX research' },
    { from: 'home', name: 'To do', text: 'Finish my portfolio' },
    { from: 'home', name: 'My Path', text: 'People reached per year' },
    { from: 'dock', name: 'About Me', text: 'Helen Keller' },
    { from: 'dock', name: 'Credentials', text: 'Continuous Learning' },
    { from: 'dock', name: 'Playlist', text: 'Open in Spotify' },
    { from: 'dock', name: 'Resume.pdf', text: 'No document uploaded yet.' },
  ] as const;

  for (const s of SHEETS) {
    test(`opens and closes ${s.name}`, async ({ page }) => {
      const scope = s.from === 'home' ? home(page) : dock(page);
      await scope.getByRole('button', { name: s.name, exact: true }).click();
      const sheet = sheetFor(page, s.name);
      await expect(sheet).toHaveAttribute('data-phase', 'open');
      await expect(sheet).toContainText(s.text);
      await sheet.getByRole('button', { name: 'Done' }).click();
      await expect(sheet).toBeHidden();
    });
  }

  test('swiping the sheet title bar down dismisses it', async ({ page }) => {
    await home(page).getByRole('button', { name: 'Project One', exact: true }).click();
    const sheet = sheetFor(page, 'Project One');
    await expect(sheet).toHaveAttribute('data-phase', 'open');
    const bar = (await sheet.getByTestId('sheet-titlebar').boundingBox())!;
    const x = bar.x + 60;
    const y = bar.y + bar.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 220, { steps: 10 });
    await page.mouse.up();
    await expect(sheet).toBeHidden();
  });

  test('a short drag snaps the sheet back open', async ({ page }) => {
    await home(page).getByRole('button', { name: 'Project One', exact: true }).click();
    const sheet = sheetFor(page, 'Project One');
    await expect(sheet).toHaveAttribute('data-phase', 'open');
    const bar = (await sheet.getByTestId('sheet-titlebar').boundingBox())!;
    const x = bar.x + 60;
    const y = bar.y + bar.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 50, { steps: 5 });
    await page.mouse.up();
    await expect(sheet).toHaveAttribute('data-phase', 'open');
    await expect(sheet).toBeVisible();
  });

  test('switches to the desktop layout when the window gets wide', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('[data-layout="desktop"]')).toBeVisible();
  });
});

test('dock links from the desktop appear as home-screen shortcuts on the phone', async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('portfolio:incomingCallShown', '1'));
  await page.goto('/');
  const home = page.getByRole('region', { name: 'Home screen' });
  await expect(home.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/');
  await expect(home.getByRole('link', { name: 'Mail' })).toHaveAttribute('href', 'mailto:you@example.com');
});
