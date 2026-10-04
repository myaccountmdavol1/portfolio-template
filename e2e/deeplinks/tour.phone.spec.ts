import { expect, test, type Page } from '@playwright/test';

// Deep-link fixture server, phone layout. tourSpeed=10 plays a 6 s stop in 0.6 s.

const order = ['About Me', 'Project One', 'Badges', 'Resume.pdf', 'Photos', 'Messages'];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('portfolio:incomingCallShown', '1');
    const seen: string[] = [];
    (window as unknown as { tourSeen: string[] }).tourSeen = seen;
    new MutationObserver(() => {
      for (const d of document.querySelectorAll('[role="dialog"][aria-label]')) {
        const name = d.getAttribute('aria-label')!;
        if (!seen.includes(name)) seen.push(name);
      }
    }).observe(document, { childList: true, subtree: true });
  });
});

const sheet = (page: Page, name: string) => page.getByRole('dialog', { name, exact: true });
const bar = (page: Page) => page.getByRole('toolbar', { name: 'Tour' });
const endCard = (page: Page) => page.getByRole('dialog', { name: 'Thanks for watching' });

test('the Tour chip plays each stop as a sheet, tapped with a fingertip', async ({ page }) => {
  await page.goto('/?tourSpeed=10');
  await page.getByRole('button', { name: 'Take the tour' }).click();
  await expect(bar(page)).toBeVisible();
  await expect(page.getByTestId('tour-finger')).toBeAttached();
  await expect(page.getByTestId('tour-cursor')).toHaveCount(0); // no arrow on a phone
  await expect(endCard(page)).toBeVisible({ timeout: 20_000 });
  const names = await (page.evaluate(() => (window as unknown as { tourSeen: string[] }).tourSeen));
  expect(names.filter((n) => order.includes(n))).toEqual(order);
  for (const name of order) await expect(sheet(page, name)).toHaveCount(0);
  await expect(page.getByTestId('tour-finger')).toHaveCount(0);
});

test('Stop ends the phone tour and leaves the sheet open', async ({ page }) => {
  await page.goto('/?tour=1&tourSpeed=2');
  await expect(sheet(page, 'About Me')).toBeVisible();
  await bar(page).getByRole('button', { name: 'Stop' }).tap();
  await expect(bar(page)).toHaveCount(0);
  await page.waitForTimeout(4000); // longer than a stop at this speed
  await expect(sheet(page, 'About Me')).toBeVisible();
  await expect(sheet(page, 'Project One')).toHaveCount(0);
});
