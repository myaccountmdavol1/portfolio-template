import { expect, test, type Page } from '@playwright/test';

// Runs against the deep-link server (port 3101): the seed site plus Badges, Photos and Messages.
// tourSpeed (honoured outside production only) divides every duration: at 10 a 6 s stop lasts 0.6 s.
// playwright.config.ts asks for reduced motion, so the pointer jumps between icons.

const order = ['About Me', 'Project One', 'Badges', 'Resume.pdf', 'Photos', 'Messages'];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('portfolio:incomingCallShown', '1');
    // Every window (dialog) that appears, in order, so a fast tour can be checked afterwards.
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

const win = (page: Page, name: string) => page.getByRole('dialog', { name, exact: true });
const bar = (page: Page) => page.getByRole('toolbar', { name: 'Tour' });
const endCard = (page: Page) => page.getByRole('dialog', { name: 'Thanks for watching' });
const pill = (page: Page) => page.getByRole('button', { name: 'Take the 60-second tour' });
const seen = (page: Page) => page.evaluate(() => (window as unknown as { tourSeen: string[] }).tourSeen);

test('/?tour=1 plays every stop in order and ends on the card', async ({ page }) => {
  await page.goto('/?tour=1&tourSpeed=10');
  await expect(bar(page)).toBeVisible();
  await expect(page).not.toHaveURL(/tour=/);
  await expect(page.getByTestId('tour-cursor')).toBeAttached();
  await expect(endCard(page)).toBeVisible({ timeout: 20_000 });
  const names = await seen(page);
  expect(names.filter((n) => order.includes(n))).toEqual(order);
  expect(names).toContain('Google Certified Educator'); // the badge stop shows the newest badge
  for (const name of order) await expect(win(page, name)).toHaveCount(0); // put away before the card
  await expect(page.getByTestId('tour-cursor')).toHaveCount(0);
  await expect(endCard(page).locator('a[href], button').first()).toBeFocused(); // a modal: focus moves in
  await endCard(page).getByRole('button', { name: 'Explore on your own' }).click();
  await expect(endCard(page)).toHaveCount(0);
});

test('watching unlocks only “Took the tour”', async ({ page }) => {
  await page.goto('/?tour=1&tourSpeed=10');
  await expect(endCard(page)).toBeVisible({ timeout: 20_000 });
  const progress = await page.evaluate(() => JSON.parse(window.localStorage.getItem('portfolio:achievements') ?? 'null'));
  expect(progress.unlocked).toEqual(['tour']);
  expect(progress.opened).toEqual([]);
});

test('a key press stops the tour and leaves the window open', async ({ page }) => {
  await page.goto('/?tour=1&tourSpeed=2');
  await expect(win(page, 'About Me')).toBeVisible();
  await page.keyboard.press('Escape'); // on its own, Esc would also close the front window
  await expect(bar(page)).toHaveCount(0);
  await expect(page.getByTestId('tour-cursor')).toHaveCount(0);
  await expect(page.locator('[data-touring]')).toHaveCount(0);
  await page.waitForTimeout(4000); // longer than a stop at this speed
  await expect(win(page, 'About Me')).toBeVisible();
  await expect(win(page, 'Project One')).toHaveCount(0);
  await expect(page).toHaveURL(/\?open=about-me$/);
});

test('stopping between stops: one Back leaves the page', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); // the pointer glides, so there's a gap with nothing open
  await page.goto('about:blank');
  await page.goto('/?tour=1&tourSpeed=1');
  await expect(win(page, 'About Me')).toBeVisible();
  await expect(win(page, 'About Me')).toHaveCount(0, { timeout: 10_000 }); // gliding to stop 2
  await expect(page).toHaveURL(/:3101\/$/);
  await page.keyboard.press('a');
  await expect(bar(page)).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL('about:blank');
});

test('Back during the tour stops it', async ({ page }) => {
  await page.goto('/?tour=1&tourSpeed=2');
  await expect(win(page, 'About Me')).toBeVisible();
  await expect(page).toHaveURL(/\?open=about-me$/);
  await page.goBack();
  await expect(bar(page)).toHaveCount(0);
  await expect(page.getByTestId('tour-cursor')).toHaveCount(0);
  await expect(win(page, 'About Me')).toHaveCount(0);
  await page.waitForTimeout(4000); // longer than a stop at this speed: nothing else opens
  await expect(win(page, 'Project One')).toHaveCount(0);
});

test('the pill starts the tour and can be hidden for the session', async ({ page }) => {
  await page.goto('/?tourSpeed=10');
  await pill(page).click();
  await expect(bar(page)).toBeVisible();
  await expect(endCard(page)).toBeVisible({ timeout: 20_000 });
  await endCard(page).getByRole('button', { name: 'Explore on your own' }).click();
  await page.getByRole('button', { name: 'Hide the tour button' }).click();
  await expect(pill(page)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('banner')).toContainText(/\d:\d\d/);
  await expect(pill(page)).toHaveCount(0);
});

test('the menu bar starts it too', async ({ page }) => {
  await page.goto('/?tourSpeed=10');
  await page.getByRole('banner').getByRole('button', { name: 'Tour', exact: true }).click();
  await expect(bar(page)).toContainText(/Tour · \d \/ 6/);
  // Desktop is stop-only: a hint, no Pause or Stop buttons.
  await expect(bar(page)).toContainText('move the mouse or press any key to stop');
  await expect(bar(page).getByRole('button')).toHaveCount(0);
  await page.keyboard.press('a');
  await expect(bar(page)).toHaveCount(0);
});

test('the incoming call waits until the tour stops', async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.removeItem('portfolio:incomingCallShown'));
  await page.goto('/?tour=1&tourSpeed=2');
  await expect(bar(page)).toBeVisible();
  await page.waitForTimeout(5500); // the sample call rings after 4 s
  await expect(page.getByRole('region', { name: 'Incoming call' })).toHaveCount(0);
  await page.keyboard.press('a');
  await expect(page.getByRole('region', { name: 'Incoming call' })).toBeVisible();
});
