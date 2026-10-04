import { expect, test } from '@playwright/test';

test('tapping the top-right corner opens Control Center on the phone', async ({ page }, testInfo) => {
  await page.addInitScript(() => window.sessionStorage.setItem('portfolio:incomingCallShown', '1'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Control Center' }).click();
  await page.getByRole('switch', { name: /Dark Mode/ }).click();
  await expect(page.locator('[data-layout="phone"]')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('dialog', { name: 'Control Center' }).screenshot({ path: testInfo.outputPath('dark-cc-phone.png') });
});
