import { expect, test, type Page } from '@playwright/test';

// /api/chat is mocked: no Anthropic calls. Runs on the deep-link fixture server (Badges, Photos, Messages).

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

const win = (page: Page, name: string) => page.getByRole('dialog', { name, exact: true });

test('the chat opens what it talks about, and its chip reopens it', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('desktop-area').getByRole('button', { name: 'Messages', exact: true }).click();
  const chat = win(page, 'Messages');
  await chat.getByLabel('Message').fill('Show me your Apple badge');
  await chat.getByRole('button', { name: 'Send' }).click();
  await expect(chat.getByRole('log', { name: 'Conversation' })).toContainText('my Apple Learning Coach badge');
  await expect(win(page, 'Badges')).toBeVisible();
  await expect(win(page, 'Apple Learning Coach')).toBeVisible();
  // Put the badge away, bring the chat forward, and use the chip.
  await win(page, 'Apple Learning Coach').getByRole('button', { name: 'Done' }).click();
  await chat.getByTestId('window-titlebar').click();
  await chat.getByRole('button', { name: 'Apple Learning Coach →' }).click();
  await expect(win(page, 'Apple Learning Coach')).toBeVisible();
});
