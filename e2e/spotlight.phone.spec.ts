import { expect, test } from '@playwright/test';

test('the Search pill opens Spotlight on the phone', async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('portfolio:incomingCallShown', '1'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('combobox', { name: 'Spotlight Search' }).fill('credentials');
  await page.getByRole('option').first().click();
  await expect(page.getByRole('dialog', { name: 'Credentials' })).toBeVisible();
});
