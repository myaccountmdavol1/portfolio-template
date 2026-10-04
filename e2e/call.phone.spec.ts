import { expect, test } from '@playwright/test';

test('incoming call banner shows on the phone and can be declined', async ({ page }) => {
  await page.goto('/');
  const call = page.getByRole('region', { name: 'Incoming call' });
  await expect(call).toBeVisible({ timeout: 10_000 });
  await call.getByRole('button', { name: 'Decline' }).click();
  await expect(call).toBeHidden();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
