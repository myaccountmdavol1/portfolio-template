import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('portfolio:incomingCallShown', '1'));
});

const sheet = (page: Page, name: string) => page.getByRole('dialog', { name, exact: true });
const home = (page: Page) => page.getByRole('region', { name: 'Home screen' });

test('a badge link opens the Badges sheet with that badge open', async ({ page }) => {
  await page.goto('/?open=badges&item=apple-learning-coach');
  await expect(sheet(page, 'Badges')).toBeVisible();
  await expect(sheet(page, 'Apple Learning Coach')).toBeVisible();
});

test('opening an app updates the address bar, and Back closes the sheet', async ({ page }) => {
  await page.goto('/');
  await home(page).getByRole('button', { name: 'Project One', exact: true }).click();
  await expect(sheet(page, 'Project One')).toBeVisible();
  await expect(page).toHaveURL(/\/\?open=project-one$/);
  await page.goBack();
  await expect(sheet(page, 'Project One')).toHaveCount(0);
});

test('the sheet header has a Share button', async ({ page }) => {
  await page.goto('/?open=project-one');
  await expect(sheet(page, 'Project One').getByRole('button', { name: 'Share' })).toBeVisible();
});

test('closing a sheet and pressing Back leaves the page', async ({ page }) => {
  await page.goto('/?utm_source=start');
  await page.goto('/');
  await home(page).getByRole('button', { name: 'Project One', exact: true }).click();
  await expect(page).toHaveURL(/\/\?open=project-one$/);
  await sheet(page, 'Project One').getByRole('button', { name: 'Done', exact: true }).click();
  await expect(sheet(page, 'Project One')).toHaveCount(0);
  await expect(page).toHaveURL('http://localhost:3101/');
  await page.goBack();
  await expect(page).toHaveURL('http://localhost:3101/?utm_source=start');
});
