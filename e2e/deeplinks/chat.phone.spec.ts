import { expect, test, type Page } from '@playwright/test';

const reply = [
  { type: 'text', text: 'Here it is — my Apple Learning Coach badge.' },
  { type: 'show', open: 'badges', item: 'apple-learning-coach', label: 'Apple Learning Coach' },
]
  .map((e) => JSON.stringify(e))
  .join('\n');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('portfolio:incomingCallShown', '1'));
  await page.route('**/api/chat', (route) => route.fulfill({ status: 200, contentType: 'application/x-ndjson; charset=utf-8', body: `${reply}\n` }));
});

const sheet = (page: Page, name: string) => page.getByRole('dialog', { name, exact: true });
const home = (page: Page) => page.getByRole('region', { name: 'Home screen' });

test('on a phone the reply offers a chip instead of covering the chat', async ({ page }) => {
  await page.goto('/');
  await home(page).getByRole('button', { name: 'Messages', exact: true }).click();
  const chat = sheet(page, 'Messages');
  await chat.getByLabel('Message').fill('Show me your Apple badge');
  await chat.getByRole('button', { name: 'Send' }).click();
  const chip = chat.getByRole('button', { name: 'Apple Learning Coach →' });
  await expect(chip).toBeVisible();
  await expect(sheet(page, 'Badges')).toHaveCount(0);
  await chip.click();
  await expect(sheet(page, 'Badges')).toBeVisible();
  await expect(sheet(page, 'Apple Learning Coach')).toBeVisible();
});
