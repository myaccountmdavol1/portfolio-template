import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('portfolio:incomingCallShown', '1'));
  await page.goto('/');
  await expect(page.getByRole('banner')).toContainText(/\d:\d\d/);
});

const openApp = (page: Page, name: string) => page.getByTestId('desktop-area').getByRole('button', { name, exact: true }).click();
const win = (page: Page, name: string) => page.getByRole('dialog', { name, exact: true });

test('dragging a window to the left edge snaps it to the left half, with a preview', async ({ page }) => {
  await openApp(page, 'Project One');
  const bar = (await win(page, 'Project One').getByTestId('window-titlebar').boundingBox())!;
  await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
  await page.mouse.down();
  await page.mouse.move(4, 400, { steps: 12 });
  await expect(page.getByTestId('snap-preview')).toBeVisible();
  await page.mouse.up();
  await expect(page.getByTestId('snap-preview')).toHaveCount(0);
  const box = (await win(page, 'Project One').boundingBox())!;
  expect(box.x).toBeLessThan(12);
  expect(Math.abs(box.width - (1280 - 24) / 2)).toBeLessThan(6);
});

test('the green button fills the screen and restores', async ({ page }) => {
  await openApp(page, 'About Me');
  const w = win(page, 'About Me');
  const before = (await w.boundingBox())!;
  await w.getByRole('button', { name: 'Fill screen' }).click();
  expect((await w.boundingBox())!.width).toBeGreaterThan(1200);
  await w.getByRole('button', { name: 'Restore size' }).click();
  expect(Math.abs((await w.boundingBox())!.width - before.width)).toBeLessThan(2);
});

test('the corner handle resizes a window', async ({ page }) => {
  await openApp(page, 'Project One');
  const w = win(page, 'Project One');
  const before = (await w.boundingBox())!;
  const handle = (await w.getByTestId('window-resize').boundingBox())!;
  await page.mouse.move(handle.x + 8, handle.y + 8);
  await page.mouse.down();
  await page.mouse.move(handle.x - 92, handle.y - 60, { steps: 8 });
  await page.mouse.up();
  const after = (await w.boundingBox())!;
  expect(before.width - after.width).toBeGreaterThan(90);
});

test('Arrange all windows tiles every open window side by side', async ({ page }) => {
  await openApp(page, 'Project One');
  await openApp(page, 'Project Two');
  const w = win(page, 'Project Two');
  await w.getByRole('button', { name: 'Fill screen' }).click({ button: 'right' });
  await w.getByRole('menuitem', { name: 'Arrange all windows' }).click();
  const a = (await win(page, 'Project One').boundingBox())!;
  const b = (await w.boundingBox())!;
  expect(Math.abs(a.y - b.y)).toBeLessThan(2);
  expect(b.x + b.width).toBeLessThanOrEqual(a.x + 1); // front window (Project Two) takes the left slot
});
