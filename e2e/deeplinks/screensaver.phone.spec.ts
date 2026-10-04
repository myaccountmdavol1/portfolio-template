import { expect, test, type Page } from '@playwright/test';

// Deep-link fixture server, phone layout. Phones have no screen saver: idle goes straight to the lock screen.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('portfolio:incomingCallShown', '1'));
});

const lock = (page: Page) => page.getByTestId('lock-screen');
const sheet = (page: Page, name: string) => page.getByRole('dialog', { name, exact: true });

test('idle locks the phone; a short drag snaps back, swiping up unlocks with the sheet unchanged', async ({ page }) => {
  await page.goto('/?open=about-me&idleSeconds=2');
  await expect(sheet(page, 'About Me')).toBeVisible();
  await expect(lock(page)).toBeVisible({ timeout: 6000 });
  await expect(page.getByTestId('screensaver')).toHaveCount(0);
  await expect(lock(page)).toContainText('Swipe up to unlock');
  await page.mouse.move(195, 700);
  await page.mouse.down();
  await page.mouse.move(195, 640, { steps: 4 }); // 60 px: not enough
  await page.mouse.up();
  await expect(lock(page)).toBeVisible();
  await page.mouse.move(195, 700);
  await page.mouse.down();
  await page.mouse.move(195, 480, { steps: 8 });
  await page.mouse.up();
  await expect(lock(page)).toHaveCount(0);
  await expect(sheet(page, 'About Me')).toBeVisible();
});

test('/?lock=1 works on phones, and the Unlock bar is a button', async ({ page }) => {
  await page.goto('/?lock=1');
  await expect(lock(page)).toBeVisible();
  await expect(page).not.toHaveURL(/lock=/);
  await lock(page).getByRole('button', { name: 'Unlock' }).tap();
  await expect(lock(page)).toHaveCount(0);
});

test("Control Center has a Lock Screen button (no Screen Saver) that locks the phone", async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Control Center' }).tap();
  const cc = page.getByRole('dialog', { name: 'Control Center' });
  await expect(cc.getByRole('button', { name: 'Lock Screen' })).toBeVisible();
  await expect(cc.getByRole('button', { name: 'Screen Saver' })).toHaveCount(0);
  await cc.getByRole('button', { name: 'Lock Screen' }).tap();
  await expect(cc).toHaveCount(0);
  await expect(lock(page)).toBeVisible();
  await expect(page.getByTestId('screensaver')).toHaveCount(0);
  await lock(page).getByRole('button', { name: 'Unlock' }).tap();
  await expect(lock(page)).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Home screen' })).toBeVisible();
});
