import { expect, test, type Page } from '@playwright/test';

// The local editor (?editor=local) on the deep-link server: its draft starts as the fixture site.
// Reduced motion (playwright.config.ts): screen savers show their still frame.

const openSite = async (page: Page) => {
  await page.goto('/?editor=local&idleSeconds=1');
  await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 15_000 });
  await page.getByRole('toolbar', { name: 'Editor' }).getByRole('button', { name: 'Site' }).click();
  return page.getByRole('complementary', { name: 'Inspector' });
};

test('the editor never starts the screen saver or lock on its own', async ({ page }) => {
  await openSite(page);
  await page.waitForTimeout(2500); // idleSeconds=1 would have started it on the public site
  await expect(page.getByTestId('screensaver')).toHaveCount(0);
  await expect(page.getByTestId('lock-screen')).toHaveCount(0);
});

test('Preview screen saver plays the pinned module and wakes to the lock screen', async ({ page }) => {
  const inspector = await openSite(page);
  await expect(inspector.getByRole('heading', { name: 'Screen Saver & Lock Screen' })).toBeVisible();
  await inspector.getByLabel('Always show').selectOption('facts');
  await inspector.getByRole('button', { name: 'Preview screen saver' }).click();
  const saver = page.getByTestId('screensaver');
  await expect(saver).toHaveAttribute('data-module', 'facts');
  await expect(saver).toContainText('Your current role, in a sentence');
  await page.waitForTimeout(400);
  await page.keyboard.press('Shift');
  const lock = page.getByTestId('lock-screen');
  await expect(lock).toBeVisible();
  await lock.getByRole('button', { name: 'Guest' }).click();
  await expect(lock).toHaveCount(0);
});

test('lock screen settings show in Preview lock screen, and Preview never awards achievements', async ({ page }) => {
  const inspector = await openSite(page);
  await inspector.getByLabel('Name on the lock screen').fill('Sam Rivera');
  await inspector.getByLabel('Password', { exact: true }).fill('Open Sesame');
  await inspector.getByRole('button', { name: 'Preview lock screen' }).click();
  const lock = page.getByTestId('lock-screen');
  await lock.getByRole('button', { name: 'Sam Rivera' }).click();
  await lock.getByLabel('Password').fill('open sesame');
  await lock.getByLabel('Password').press('Enter');
  await expect(lock).toHaveCount(0);
  expect(await page.evaluate(() => window.localStorage.getItem('portfolio:achievements'))).toBeNull();
});

test('a module can be switched off, and its own Preview plays it', async ({ page }) => {
  const inspector = await openSite(page);
  const hello = inspector.getByRole('group', { name: 'Hello', exact: true });
  await expect(hello.getByRole('group', { name: 'Words' })).toBeVisible();
  await hello.getByRole('checkbox', { name: 'Hello' }).uncheck();
  await expect(hello.getByRole('checkbox', { name: 'Hello' })).not.toBeChecked();
  await expect(hello.getByRole('group', { name: 'Words' })).toHaveCount(0);
  await expect(inspector.getByRole('group', { name: 'Badge Drift' })).toContainText('Skipped:'); // no badge pictures
  await inspector.getByRole('group', { name: 'Bouncing initials' }).getByRole('button', { name: 'Preview' }).click();
  await expect(page.getByTestId('screensaver')).toHaveAttribute('data-module', 'bounce');
  await expect(page.getByTestId('screensaver')).toContainText('YN');
});

test('with no password, “Guest can unlock” is on and can’t be switched off', async ({ page }) => {
  const inspector = await openSite(page);
  const guest = inspector.getByRole('checkbox', { name: 'Guest can unlock' });
  await expect(guest).toBeEnabled();
  await inspector.getByRole('checkbox', { name: 'Password on your tile' }).uncheck();
  await expect(guest).toBeChecked();
  await expect(guest).toBeDisabled();
  await expect(inspector).toContainText('With no password, Guest is always shown.');
});

test('Control Center and the System menu show Screen Saver and Lock Screen in the editor, and play previews', async ({ page }) => {
  await page.goto('/?editor=local&idleSeconds=1');
  await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 15_000 });
  const openCc = async () => {
    await page.getByRole('banner').getByRole('button', { name: 'Control Center' }).click();
    return page.getByRole('dialog', { name: 'Control Center' });
  };
  let cc = await openCc();
  await cc.getByRole('button', { name: 'Screen Saver' }).click();
  await expect(cc).toHaveCount(0);
  await expect(page.getByTestId('screensaver')).toBeVisible();
  await page.waitForTimeout(400);
  await page.keyboard.press('Shift');
  const lock = page.getByTestId('lock-screen');
  await expect(lock).toBeVisible();
  await lock.getByRole('button', { name: 'Guest' }).click();
  await expect(lock).toHaveCount(0);

  cc = await openCc();
  await cc.getByRole('button', { name: 'Lock Screen' }).click();
  await expect(page.getByTestId('lock-screen')).toBeVisible();
  await page.getByTestId('lock-screen').getByRole('button', { name: 'Guest' }).click();
  await expect(page.getByTestId('lock-screen')).toHaveCount(0);

  await page.getByRole('button', { name: 'System menu' }).click();
  await page.getByRole('menuitem', { name: 'Start Screen Saver' }).click();
  await expect(page.getByTestId('screensaver')).toBeVisible();
});
