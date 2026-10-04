import { expect, test, type Page } from '@playwright/test';

// Runs against the deep-link server (port 3101): the seed site plus a "Badges" Wallet and a "Photos" app.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('portfolio:incomingCallShown', '1'));
});

const win = (page: Page, name: string) => page.getByRole('dialog', { name, exact: true });

test('a badge link opens Badges with that badge open and flipped', async ({ page }) => {
  await page.goto('/?open=badges&item=apple-learning-coach');
  await expect(win(page, 'Badges')).toBeVisible();
  const opened = win(page, 'Apple Learning Coach');
  await expect(opened).toBeVisible();
  // Share only shows on a flipped pass.
  await expect(opened.getByRole('button', { name: 'Share' })).toBeVisible();
  await expect(page).toHaveURL(/\/\?open=badges&item=apple-learning-coach$/);
});

test('closing the badge keeps the app in the address bar', async ({ page }) => {
  await page.goto('/?open=badges&item=apple-learning-coach');
  await win(page, 'Apple Learning Coach').getByRole('button', { name: 'Done' }).click();
  await expect(page).toHaveURL(/\/\?open=badges$/);
});

test('a photo link opens that photo, by caption or position', async ({ page }) => {
  await page.goto('/?open=photos&item=robotics-club');
  await expect(win(page, 'Robotics club')).toBeVisible();
  await page.goto('/?open=photos&item=2');
  await expect(win(page, 'Photos').getByText('2 / 2')).toBeVisible();
});

test('opening an app updates the address bar, and Back closes it', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('desktop-area').getByRole('button', { name: 'Project One', exact: true }).click();
  await expect(win(page, 'Project One')).toBeVisible();
  await expect(page).toHaveURL(/\/\?open=project-one$/);
  await page.goBack();
  await expect(win(page, 'Project One')).toHaveCount(0);
  await expect(page).toHaveURL('http://localhost:3101/');
});

test('closing a window and pressing Back leaves the page', async ({ page }) => {
  await page.goto('/?utm_source=start');
  await page.goto('/');
  await page.getByTestId('desktop-area').getByRole('button', { name: 'Project One', exact: true }).click();
  await expect(page).toHaveURL(/\/\?open=project-one$/);
  await win(page, 'Project One').getByRole('button', { name: 'Close', exact: true }).click();
  await expect(win(page, 'Project One')).toHaveCount(0);
  await expect(page).toHaveURL('http://localhost:3101/');
  await page.goBack();
  await expect(page).toHaveURL('http://localhost:3101/?utm_source=start');
});

test('Back and Forward on a badge add no history entries', async ({ page }) => {
  await page.goto('/?utm_source=start');
  await page.goto('/');
  await page.getByTestId('desktop-area').getByRole('button', { name: 'Badges', exact: true }).click();
  await expect(win(page, 'Badges')).toBeVisible();
  await win(page, 'Badges').getByRole('button', { name: /\. Show details$/ }).first().click();
  await expect(page).toHaveURL(/\/\?open=badges&item=/);
  const badgeUrl = page.url();
  await page.goBack();
  await expect(win(page, 'Badges')).toHaveCount(0);
  await expect(page).toHaveURL('http://localhost:3101/');
  await page.goForward();
  await expect(win(page, 'Badges')).toBeVisible();
  await expect(page).toHaveURL(badgeUrl);
  await page.goBack();
  await expect(win(page, 'Badges')).toHaveCount(0);
  await expect(page).toHaveURL('http://localhost:3101/');
  await page.goBack();
  await expect(page).toHaveURL('http://localhost:3101/?utm_source=start');
});

test('an unknown item opens the app with a note', async ({ page }) => {
  await page.goto('/?open=badges&item=nope');
  await expect(win(page, 'Badges')).toBeVisible();
  await expect(win(page, 'Badges').getByRole('status')).toHaveText('Couldn’t find that item');
});

test('an unknown app loads the site normally and tidies the address', async ({ page }) => {
  await page.goto('/?open=nope&utm_source=li');
  await expect(page.getByRole('banner')).toContainText(/\d:\d\d/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL('http://localhost:3101/?utm_source=li');
});

test('Share copies the link', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?open=project-one');
  await win(page, 'Project One').getByRole('button', { name: 'Share' }).click();
  await expect(win(page, 'Project One').getByRole('status')).toHaveText('Link copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('http://localhost:3101/?open=project-one');
});

test('the editor never shows Share or changes the address', async ({ page }) => {
  await page.goto('/?editor=local');
  await expect(page.getByRole('toolbar', { name: 'Editor' })).toBeVisible();
  await page.getByTestId('desktop-area').getByRole('button', { name: 'Project One', exact: true }).dblclick();
  await expect(win(page, 'Project One')).toBeVisible();
  await expect(win(page, 'Project One').getByRole('button', { name: 'Share' })).toHaveCount(0);
  await expect(page).toHaveURL('http://localhost:3101/?editor=local');
});

test('a deep link previews its item for link unfurlers', async ({ request }) => {
  const html = await (await request.get('/?open=badges&item=apple-learning-coach', { headers: { 'user-agent': 'facebookexternalhit/1.1' } })).text();
  expect(html).toMatch(/<meta property="og:title" content="Apple Learning Coach · [^"]+"/);
  expect(html).toMatch(/<meta property="og:image" content="[^"]*\/api\/og\?open=badges&amp;item=apple-learning-coach"/);
});

test('the site keeps its own preview without a link', async ({ request }) => {
  const html = await (await request.get('/', { headers: { 'user-agent': 'facebookexternalhit/1.1' } })).text();
  expect(html).toMatch(/<meta property="og:image" content="[^"]*\/api\/og"/);
});

test('preview images render as PNGs', async ({ request }) => {
  for (const path of ['/api/og', '/api/og?open=badges&item=apple-learning-coach', '/api/og?open=photos&item=robotics-club', '/api/og?open=nope']) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()['content-type'], path).toBe('image/png');
  }
});
