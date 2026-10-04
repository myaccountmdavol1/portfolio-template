import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('portfolio:incomingCallShown', '1'));
  await page.goto('/');
  await expect(page.getByRole('banner')).toContainText(/\d:\d\d/);
});

test('Control Center turns on Dark Mode, and it sticks after a reload', async ({ page }, testInfo) => {
  const root = page.locator('[data-layout="desktop"]');
  await expect(root).toHaveAttribute('data-theme', 'light');
  await page.getByRole('banner').getByRole('button', { name: 'Control Center' }).click();
  const cc = page.getByRole('dialog', { name: 'Control Center' });
  await cc.getByRole('switch', { name: /Dark Mode/ }).click();
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await page.getByTestId('desktop-area').getByRole('button', { name: 'About Me', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('dark-desktop.png') });
  await page.reload();
  await expect(page.locator('[data-layout="desktop"]')).toHaveAttribute('data-theme', 'dark');
});

test('the brightness slider dims the screen and Esc closes Control Center', async ({ page }) => {
  await page.getByRole('banner').getByRole('button', { name: 'Control Center' }).click();
  await page.getByRole('slider', { name: 'Brightness' }).fill('50');
  await expect(page.locator('.pointer-events-none.fixed.inset-0.bg-black')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Control Center' })).toHaveCount(0);
});

test('Night Shift warms the screen, AirDrop copies the link, and Focus is a switch', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('banner').getByRole('button', { name: 'Control Center' }).click();
  const cc = page.getByRole('dialog', { name: 'Control Center' });
  await cc.getByRole('switch', { name: 'Night Shift' }).click();
  await expect(page.getByTestId('night-shift')).toBeVisible();
  await cc.getByRole('button', { name: 'AirDrop' }).click();
  await expect(cc).toContainText('Link copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(new URL(page.url()).origin);
  await cc.getByRole('switch', { name: 'Focus' }).click();
  await expect(cc.getByRole('switch', { name: 'Focus' })).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(page.getByTestId('night-shift')).toBeVisible();
});

test('Control Center shows what the owner is listening to on Spotify', async ({ page }) => {
  await page.route('**/api/now-playing', (route) =>
    route.fulfill({ json: { configured: true, track: { isPlaying: true, title: 'September', artist: 'Earth, Wind & Fire', url: 'https://open.spotify.com/track/x' } } }),
  );
  await page.getByRole('banner').getByRole('button', { name: 'Control Center' }).click();
  const tile = page.getByRole('dialog', { name: 'Control Center' }).getByRole('link', { name: /Now playing: September by Earth, Wind & Fire/ });
  await expect(tile).toBeVisible();
  await expect(tile).toHaveAttribute('href', 'https://open.spotify.com/track/x');
});

test('without Spotify connected, there is no Now Playing tile', async ({ page }) => {
  await page.getByRole('banner').getByRole('button', { name: 'Control Center' }).click();
  await expect(page.getByRole('dialog', { name: 'Control Center' })).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByRole('dialog', { name: 'Control Center' }).getByRole('link')).toHaveCount(0);
});
