import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('portfolio:incomingCallShown', '1'));
  await page.goto('/');
  await expect(page.locator('[data-layout="desktop"]')).toBeVisible();
  await expect(page.getByRole('banner')).toContainText(/\d:\d\d/); // hydrated: the clock only renders client-side
});

test('⌘K opens Spotlight; typing finds content; Enter opens the app', async ({ page }) => {
  await page.keyboard.press('ControlOrMeta+k');
  const box = page.getByRole('combobox', { name: 'Spotlight Search' });
  await box.fill('helen keller');
  await expect(page.getByRole('option').first()).toContainText('About Me');
  await box.press('Enter');
  await expect(page.getByRole('dialog', { name: 'About Me' })).toBeVisible();
  await expect(box).toHaveCount(0);
});

test('the menu bar magnifier opens it, arrows move, Esc closes', async ({ page }) => {
  await page.getByRole('banner').getByRole('button', { name: 'Spotlight Search' }).click();
  const box = page.getByRole('combobox', { name: 'Spotlight Search' });
  await box.fill('project');
  await expect(page.getByRole('option').nth(0)).toContainText('Project One');
  await expect(page.getByRole('option').nth(1)).toContainText('Project Two');
  await box.press('ArrowDown');
  await expect(page.getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true');
  await box.press('Escape');
  await expect(box).toHaveCount(0);
});

test('shows a friendly empty state', async ({ page }) => {
  await page.keyboard.press('/');
  await page.getByRole('combobox', { name: 'Spotlight Search' }).fill('zzzz');
  await expect(page.getByText('No results for “zzzz”')).toBeVisible();
});
