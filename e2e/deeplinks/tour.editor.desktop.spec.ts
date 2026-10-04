import { expect, test } from '@playwright/test';

// The local editor (?editor=local) on the deep-link server: its draft starts as the fixture site.

const apps = ['About Me', 'Project One', 'Badges', 'Resume.pdf', 'Photos', 'Messages'];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
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

test('reordered stops play in the new order in Preview', async ({ page }) => {
  await page.goto('/?editor=local&tourSpeed=10');
  await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 15_000 });
  await page.getByRole('toolbar', { name: 'Editor' }).getByRole('button', { name: 'Site' }).click();
  const stops = page.getByRole('group', { name: 'Tour stops' });
  await expect(stops.getByLabel('Caption')).toHaveCount(6);
  await stops.getByRole('button', { name: 'Move item 2 up' }).click();
  await expect(stops.getByLabel('Caption').first()).toHaveValue('Project One — my favourite project');
  await page.getByRole('button', { name: 'Preview tour' }).click();
  await expect(page.getByRole('toolbar', { name: 'Tour' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Thanks for watching' })).toBeVisible({ timeout: 20_000 });
  const names = await page.evaluate(() => (window as unknown as { tourSeen: string[] }).tourSeen);
  expect(names.filter((n) => apps.includes(n))).toEqual(['Project One', 'About Me', 'Badges', 'Resume.pdf', 'Photos', 'Messages']);
  // Preview never awards the achievement.
  expect(await page.evaluate(() => window.localStorage.getItem('portfolio:achievements'))).toBeNull();
});

test('the editor never starts the tour on its own or offers it to visitors', async ({ page }) => {
  await page.goto('/?editor=local&tour=1&tourSpeed=10');
  await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 15_000 });
  await page.waitForTimeout(1500);
  await expect(page.getByRole('toolbar', { name: 'Tour' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Take the 60-second tour' })).toHaveCount(0);
  await expect(page.getByRole('banner').getByRole('button', { name: 'Tour', exact: true })).toHaveCount(0);
});

test('with "Moving the mouse stops the tour" off, moving the mouse keeps it playing and the bar has Pause and Stop', async ({ page }) => {
  await page.goto('/?editor=local');
  await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 15_000 });
  await page.getByRole('toolbar', { name: 'Editor' }).getByRole('button', { name: 'Site' }).click();
  const toggle = page.getByRole('checkbox', { name: 'Moving the mouse stops the tour' });
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await page.getByRole('button', { name: 'Preview tour' }).click();
  const bar = page.getByRole('toolbar', { name: 'Tour' });
  await expect(bar).toBeVisible();
  await expect(bar).toContainText('click elsewhere or press any key to stop');
  await expect(bar.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(page.locator('[data-touring]')).toHaveCount(1);
  await expect(page.locator('[data-touring-cursor]')).toHaveCount(0); // the visitor keeps their cursor
  await page.mouse.move(300, 300);
  for (let i = 1; i <= 8; i++) await page.mouse.move(300 + i * 60, 300 + i * 30, { steps: 4 });
  await page.waitForTimeout(300);
  await expect(bar).toBeVisible();
  await bar.getByRole('button', { name: 'Pause' }).click();
  await expect(bar.getByRole('button', { name: 'Resume' })).toBeVisible();
  await bar.getByRole('button', { name: 'Stop' }).click();
  await expect(bar).toHaveCount(0);
});
