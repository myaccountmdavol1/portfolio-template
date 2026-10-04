import { expect, test } from '@playwright/test';

test('incoming call appears once per session and answering opens About Me', async ({ page }) => {
  await page.goto('/');
  const call = page.getByRole('region', { name: 'Incoming call' });
  await expect(call).toBeVisible({ timeout: 10_000 }); // seed delaySec is 4
  await call.getByRole('button', { name: 'Answer' }).click();
  await expect(call).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'About Me', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.sessionStorage.getItem('portfolio:incomingCallShown'))).toBe('1');
});

test('declining leaves a missed-call banner whose Call back answers the call', async ({ page }) => {
  await page.goto('/');
  const call = page.getByRole('region', { name: 'Incoming call' });
  await expect(call).toBeVisible({ timeout: 10_000 });
  await call.getByRole('button', { name: 'Decline' }).click();
  const missed = page.getByRole('region', { name: 'Missed call' });
  await expect(missed).toContainText('Your Name');
  await missed.getByRole('button', { name: 'Call back' }).click();
  await expect(missed).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'About Me', exact: true })).toBeVisible();
});

test('with Focus on (Control Center), the call never rings', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('portfolio:prefs', JSON.stringify({ focus: true })));
  await page.goto('/');
  await page.waitForTimeout(5500); // past the seed's 4s delay
  await expect(page.getByRole('region', { name: 'Incoming call' })).toHaveCount(0);
});

test('in a background tab the call keeps ringing; it only rings out once it’s been on screen for 20 s', async ({ page }) => {
  // A tab opened in the background (cmd-click): document.hidden until the visitor switches to it.
  await page.addInitScript(() => {
    let hidden = true;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
    (window as unknown as { setHidden: (h: boolean) => void }).setHidden = (h) => {
      hidden = h;
      document.dispatchEvent(new Event('visibilitychange'));
    };
  });
  await page.clock.install();
  await page.goto('/');
  const call = page.getByRole('region', { name: 'Incoming call' });
  await page.clock.fastForward(5000); // the seed's 4 s delay
  await expect(call).toBeVisible();
  await page.clock.fastForward(60_000); // a minute unseen: still ringing
  await expect(call).toBeVisible();
  await page.evaluate(() => (window as unknown as { setHidden: (h: boolean) => void }).setHidden(false));
  await page.clock.fastForward(15_000);
  await expect(call).toBeVisible();
  await page.clock.fastForward(6000); // 21 s on screen
  await expect(call).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Missed call' })).toBeVisible();
});

test('in the editor’s phone preview, the call banners stay inside the phone', async ({ page }) => {
  await page.goto('/?editor=local');
  const toolbar = page.getByRole('toolbar', { name: 'Editor' });
  await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 15_000 });
  await toolbar.getByRole('button', { name: 'Edit' }).click(); // calls only ring with Edit off
  await toolbar.getByRole('button', { name: 'Phone' }).click();
  const frame = (await page.getByTestId('phone-frame').boundingBox())!;
  const inside = async (name: string) => {
    const banner = page.getByRole('region', { name });
    await expect(banner).toBeVisible({ timeout: 10_000 });
    const box = (await banner.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(frame.x);
    expect(box.x + box.width).toBeLessThanOrEqual(frame.x + frame.width);
  };
  await inside('Incoming call');
  await page.getByRole('region', { name: 'Incoming call' }).getByRole('button', { name: 'Decline' }).click();
  await inside('Missed call');
});
